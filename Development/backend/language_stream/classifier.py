"""Pick the clause classifier: the trained model if one is configured, otherwise the keyword baseline.

Set CLAUSE_MODEL_PATH to a .joblib file saved by language_stream.retrain. If the variable is not set,
or the file is missing or cannot be loaded, the keyword baseline is used so the site keeps working.
Only point it at a file we made ourselves: joblib files are Python pickles and must be trusted.
Log messages never include clause text.
"""
import logging
import os

from language_stream.baseline import predict as keyword_predict

log = logging.getLogger(__name__)

KEYWORD_NAME = "keyword-baseline-v0"
TOPICS = {"deposit", "notice_period", "rent_review", "termination", "repairs", "access", "fees", "waiver", "other"}

_state = {"loaded": False, "model": None, "name": KEYWORD_NAME}


def reset():
    """Forget the loaded model so the next call reads CLAUSE_MODEL_PATH again (used by tests)."""
    _state.update(loaded=False, model=None, name=KEYWORD_NAME)


def _load():
    _state.update(loaded=True, model=None, name=KEYWORD_NAME)
    path = os.getenv("CLAUSE_MODEL_PATH", "").strip()
    if not path:
        return
    try:
        import joblib
        model = joblib.load(path)
        if model.predict(["test clause"])[0] not in TOPICS:
            raise ValueError("model gives unknown topics")
    except Exception as exc:
        log.warning("Trained classifier not loaded (%s); using keyword baseline", type(exc).__name__)
        return
    stem = os.path.splitext(os.path.basename(path))[0]
    _state.update(model=model, name=f"hybrid-{stem}")
    log.info("Trained classifier loaded: %s", _state["name"])


def classifier_name() -> str:
    if not _state["loaded"]:
        _load()
    return _state["name"]


def classify(text: str) -> tuple[str, str]:
    """Return (topic, classifier name)."""
    if not _state["loaded"]:
        _load()
    model = _state["model"]
    if model is not None:
        try:
            topic = str(model.predict([text])[0])
            if topic in TOPICS:
                return topic, _state["name"]
        except Exception as exc:
            log.warning("Trained classifier failed on a clause (%s); using keyword baseline", type(exc).__name__)
    return keyword_predict(text), KEYWORD_NAME
