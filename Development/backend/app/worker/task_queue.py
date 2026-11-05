"""
Asynchronous Task Queue — ThreadPoolExecutor + DB-backed progress
==================================================================

Why this approach (not Celery/Redis)?
--------------------------------------
ClauseGuard's GCP/MySQL stack has no Redis instance.  Rather than add a new
managed service, we use Python's built-in ``concurrent.futures.ThreadPoolExecutor``
as the worker pool.  Progress is written directly to MySQL (the ``documents``
table) so the SSE generator in the router can poll the DB and emit events
without any shared in-memory state.

Architecture:
  POST /api/analyses
       │
       ├─ validate file, create Document(status=PROCESSING)
       ├─ estimate_processing_time() → write estimated_seconds to DB
       ├─ task_queue.submit(doc_id, file_bytes, ...)   ← non-blocking, 202
       │
       └─ [Thread pool worker]
              ├─ _write_progress(doc_id, "extracting", ...)  → DB
              ├─ run_upload_pipeline(file_bytes, ...)
              │      ├─ extract_text()     ← GCP Document AI
              │      ├─ diff_engine()      ← lease validation
              │      └─ redact()           ← GCP Cloud DLP
              ├─ _write_progress(doc_id, "analysing", ...)   → DB
              ├─ save_analysis(db, doc_id, redacted_text)
              └─ _write_progress(doc_id, "completed", ...)   → DB

The SSE generator polls DB every 1.5 s and streams events until "completed"
or "failed".

Thread safety
-------------
Each worker thread creates its own ``AsyncSessionLocal`` session via
``asyncio.run_coroutine_threadsafe()``, routing the coroutine onto the main
event loop (captured at startup).  This avoids sharing SQLAlchemy async
sessions across threads.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# Maximum number of documents that can be processed simultaneously.
# 4 is safe for a single Cloud Run instance with 2 vCPUs.
_MAX_WORKERS = 4

# ── Progress step definitions ──────────────────────────────────────────────────
# Each tuple is:  (step_name, step_index, progress_fraction, display_message)
# These match the stage names the SSE client and ProcessingCard expect.

_STEPS = [
    ("uploaded",   0, 0.00, "Lease received — starting analysis…"),
    ("extracting", 1, 0.10, "Reading document text with OCR…"),
    ("validating", 2, 0.35, "Verifying this is a residential lease…"),
    ("redacting",  3, 0.55, "Removing personal details for privacy…"),
    ("analysing",  4, 0.75, "Analysing each clause against Irish tenancy law…"),
    ("completed",  5, 1.00, "Analysis complete!"),
]

_FAILED_STEP = ("failed", -1, 0.0, "")


@dataclass
class ProcessingTask:
    """All inputs the worker thread needs to process one document."""
    doc_id: str
    file_bytes: bytes
    user_id: str
    content_type: str
    filename: str
    estimated_seconds: int


class DocumentTaskQueue:
    """
    A thin wrapper around ``ThreadPoolExecutor`` that submits document
    processing tasks and tracks progress via MySQL.

    Usage
    -----
    ::

        # In app/main.py startup:
        task_queue.start(loop=asyncio.get_event_loop())

        # In the upload endpoint:
        task_queue.submit(ProcessingTask(...))

        # In app/main.py shutdown:
        task_queue.shutdown()
    """

    def __init__(self, max_workers: int = _MAX_WORKERS) -> None:
        self._max_workers = max_workers
        self._executor: Optional[ThreadPoolExecutor] = None
        # The running asyncio event loop — set once at startup so worker
        # threads can schedule coroutines onto it.
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    def start(self, loop: asyncio.AbstractEventLoop) -> None:
        """Initialise the thread pool.  Call once from FastAPI startup."""
        self._loop = loop
        self._executor = ThreadPoolExecutor(
            max_workers=self._max_workers,
            thread_name_prefix="clauseguard-worker",
        )
        logger.info(
            "[task_queue] Started with max_workers=%d", self._max_workers
        )

    def shutdown(self, wait: bool = False) -> None:
        """Shut down the thread pool.  Call from FastAPI shutdown."""
        if self._executor:
            self._executor.shutdown(wait=wait)
            logger.info("[task_queue] Shut down (wait=%s).", wait)

    # ── Task submission ────────────────────────────────────────────────────────

    def submit(self, task: ProcessingTask) -> None:
        """
        Submit a document processing task to the thread pool.

        Returns immediately — the caller gets a 202 Accepted response while
        the worker runs in the background.
        """
        if self._executor is None or self._loop is None:
            raise RuntimeError(
                "task_queue.start() must be called before submit()."
            )
        self._executor.submit(self._run_task, task)
        logger.info("[task_queue] Submitted task for doc_id=%s", task.doc_id)

    # ── Worker (runs in a background thread) ──────────────────────────────────

    def _run_task(self, task: ProcessingTask) -> None:
        """
        Execute the full pipeline for one document.

        Runs entirely in a worker thread.  All async DB operations are
        dispatched onto the main event loop via run_coroutine_threadsafe.
        """
        # Import here to avoid circular imports at module load time.
        from app.services.document.pipeline import PipelineError, run_upload_pipeline
        from app.services.analysis.persist import save_analysis
        from app.models.document import DocumentStatus

        logger.info("[worker] Starting task for doc_id=%s", task.doc_id)

        try:
            # ── Stage 0: uploaded (already set by router, re-confirm) ──────────
            self._sync_write_progress(
                task.doc_id,
                step="uploaded",
                step_index=0,
                progress=0.0,
                message="Lease received — starting analysis…",
            )

            # ── Stage 1: extracting ────────────────────────────────────────────
            self._sync_write_progress(
                task.doc_id,
                step="extracting",
                step_index=1,
                progress=0.10,
                message="Reading document text with OCR…",
            )

            # run_upload_pipeline is a synchronous function (uses requests /
            # GCP client libs that aren't async-aware).
            pipeline_result = run_upload_pipeline(
                file_bytes=task.file_bytes,
                user_id=task.user_id,
                content_type=task.content_type,
            )

            # ── Stage 2: validating — completed inside pipeline, update DB ─────
            self._sync_write_progress(
                task.doc_id,
                step="validating",
                step_index=2,
                progress=0.35,
                message="Verifying this is a residential lease…",
            )

            # ── Stage 3: redacting — also completed inside pipeline ────────────
            self._sync_write_progress(
                task.doc_id,
                step="redacting",
                step_index=3,
                progress=0.55,
                message="Removing personal details for privacy…",
            )

            # ── Stage 4: analysing ─────────────────────────────────────────────
            self._sync_write_progress(
                task.doc_id,
                step="analysing",
                step_index=4,
                progress=0.75,
                message="Analysing clauses against Irish tenancy law…",
            )

            # save_analysis is an async coroutine — schedule it on the event loop
            # and block this thread until it completes.
            future = asyncio.run_coroutine_threadsafe(
                self._run_save_analysis(task.doc_id, pipeline_result),
                self._loop,
            )
            future.result(timeout=120)  # hard timeout: 2 minutes for Gemini

            # ── Stage 5: completed ────────────────────────────────────────────
            self._sync_write_progress(
                task.doc_id,
                step="completed",
                step_index=5,
                progress=1.0,
                message="Analysis complete!",
                db_status=DocumentStatus.COMPLETED,
                s3_key=pipeline_result["s3_key"],
                s3_uri=pipeline_result["s3_uri"],
                char_count=pipeline_result["char_count"],
            )

            logger.info("[worker] Completed doc_id=%s", task.doc_id)

        except PipelineError as exc:
            logger.error(
                "[worker] PipelineError at step=%s for doc_id=%s: %s",
                exc.step,
                task.doc_id,
                exc,
            )
            self._sync_write_progress(
                task.doc_id,
                step="failed",
                step_index=-1,
                progress=0.0,
                message=f"Processing failed: {exc}",
                db_status=DocumentStatus.FAILED,
                pipeline_error=str(exc),
                pipeline_step=exc.step,
            )

        except Exception as exc:
            logger.exception(
                "[worker] Unexpected error for doc_id=%s: %s", task.doc_id, exc
            )
            self._sync_write_progress(
                task.doc_id,
                step="failed",
                step_index=-1,
                progress=0.0,
                message="An unexpected error occurred during processing.",
                db_status=DocumentStatus.FAILED,
                pipeline_error=str(exc),
            )

    # ── Helpers ────────────────────────────────────────────────────────────────

    async def _run_save_analysis(
        self, doc_id: str, pipeline_result: dict
    ) -> None:
        """
        Async helper: creates a fresh DB session and runs save_analysis().

        Called via run_coroutine_threadsafe so it executes on the event loop
        thread, not the worker thread — which is required for SQLAlchemy async.
        """
        from app.database import AsyncSessionLocal
        from app.services.analysis.persist import save_analysis

        async with AsyncSessionLocal() as db:
            await save_analysis(db, doc_id, pipeline_result["redacted_text"])
            await db.commit()

    def _sync_write_progress(
        self,
        doc_id: str,
        *,
        step: str,
        step_index: int,
        progress: float,
        message: str,
        db_status=None,
        s3_key: Optional[str] = None,
        s3_uri: Optional[str] = None,
        char_count: Optional[int] = None,
        pipeline_error: Optional[str] = None,
        pipeline_step: Optional[str] = None,
    ) -> None:
        """
        Synchronous wrapper: schedules _async_write_progress on the event loop
        and blocks until it completes, so the worker thread doesn't proceed to
        the next stage before the DB write is confirmed.
        """
        future = asyncio.run_coroutine_threadsafe(
            self._async_write_progress(
                doc_id=doc_id,
                step=step,
                step_index=step_index,
                progress=progress,
                message=message,
                db_status=db_status,
                s3_key=s3_key,
                s3_uri=s3_uri,
                char_count=char_count,
                pipeline_error=pipeline_error,
            ),
            self._loop,
        )
        try:
            future.result(timeout=10)
        except Exception as exc:
            # DB write failure is non-fatal for the pipeline — log and continue
            logger.warning(
                "[worker] Progress DB write failed for doc_id=%s step=%s: %s",
                doc_id,
                step,
                exc,
            )

    async def _async_write_progress(
        self,
        doc_id: str,
        *,
        step: str,
        step_index: int,
        progress: float,
        message: str,
        db_status=None,
        s3_key: Optional[str] = None,
        s3_uri: Optional[str] = None,
        char_count: Optional[int] = None,
        pipeline_error: Optional[str] = None,
    ) -> None:
        """
        Open a fresh async DB session and update the Document row's progress
        columns.  Using a fresh session (not the request session) is correct
        here because this runs outside the HTTP request lifecycle.
        """
        from app.database import AsyncSessionLocal
        from app.models.document import Document, DocumentStatus
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Document).where(Document.id == doc_id)
            )
            doc = result.scalar_one_or_none()
            if doc is None:
                logger.warning(
                    "[worker] Document %s not found during progress write.", doc_id
                )
                return

            doc.processing_step = step
            doc.processing_step_index = step_index
            doc.processing_progress = progress
            doc.processing_message = message
            doc.updated_at = datetime.now(timezone.utc)

            if db_status is not None:
                doc.status = db_status
            if s3_key is not None:
                doc.s3_key = s3_key
            if s3_uri is not None:
                doc.s3_uri = s3_uri
            if char_count is not None:
                doc.char_count = char_count
            if pipeline_error is not None:
                doc.pipeline_error = pipeline_error

            await db.commit()


# ── Module-level singleton ─────────────────────────────────────────────────────
# Imported by main.py (startup/shutdown) and translation_router.py (submit).

task_queue = DocumentTaskQueue()

