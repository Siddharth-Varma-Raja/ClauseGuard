# Worker package — background task processing for ClauseGuard
#
# Contains:
#   task_queue.py  — ThreadPoolExecutor-based task queue with DB-backed progress
#
# This package is intentionally dependency-free (no Celery, no Redis) so the
# system works on any hosting platform, including Cloud Run, without extra
# infrastructure.  Progress is persisted in MySQL via the Document model, so
# SSE streams can read it even across app restarts.

