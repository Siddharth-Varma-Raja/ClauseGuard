import joblib
import pytest

from language_stream import classifier
from language_stream.train_tfidf import make_hybrid_model

DEPOSIT = "The tenant shall pay a deposit of one month's rent."


@pytest.fixture(autouse=True)
def fresh(monkeypatch):
    monkeypatch.delenv("CLAUSE_MODEL_PATH", raising=False)
    classifier.reset()
    yield
    classifier.reset()


def _tiny_model(path, label):
    """A tiny model that answers `label` for deposit-like text; stands in for the real trained model."""
    texts = [DEPOSIT, "The tenant shall pay a deposit.", "A deposit of one month's rent is held."] * 3
    texts += ["Keep the garden tidy.", "No pets are allowed.", "The garden must be kept clean."] * 3
    model = make_hybrid_model()
    model.fit(texts, [label] * 9 + ["other"] * 9)
    joblib.dump(model, path)


def test_without_a_model_the_keyword_baseline_is_used():
    assert classifier.classify(DEPOSIT) == ("deposit", "keyword-baseline-v0")
    assert classifier.classifier_name() == "keyword-baseline-v0"


def test_a_configured_model_is_used(tmp_path, monkeypatch):
    path = tmp_path / "clause_classifier_v9.joblib"
    _tiny_model(path, "repairs")
    monkeypatch.setenv("CLAUSE_MODEL_PATH", str(path))
    assert classifier.classify(DEPOSIT) == ("repairs", "hybrid-clause_classifier_v9")
    assert classifier.classifier_name() == "hybrid-clause_classifier_v9"


def test_missing_model_file_falls_back(tmp_path, monkeypatch):
    monkeypatch.setenv("CLAUSE_MODEL_PATH", str(tmp_path / "nothing.joblib"))
    assert classifier.classify(DEPOSIT) == ("deposit", "keyword-baseline-v0")


def test_broken_model_file_falls_back(tmp_path, monkeypatch):
    path = tmp_path / "broken.joblib"
    path.write_bytes(b"this is not a model")
    monkeypatch.setenv("CLAUSE_MODEL_PATH", str(path))
    assert classifier.classify(DEPOSIT) == ("deposit", "keyword-baseline-v0")


def test_model_with_unknown_topic_falls_back(tmp_path, monkeypatch):
    path = tmp_path / "odd.joblib"
    _tiny_model(path, "not_a_topic")
    monkeypatch.setenv("CLAUSE_MODEL_PATH", str(path))
    assert classifier.classify(DEPOSIT) == ("deposit", "keyword-baseline-v0")
