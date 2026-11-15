"""Train a TF-IDF + logistic regression clause classifier and score it.

Run from Development/backend:
    python -m language_stream.train_tfidf "D:\\mse project\\labelled_clauses.jsonl"

Leave-one-lease-out: train on two leases, test on the third, repeat for each lease.
Prints counts and scores only (no clause text).
"""
import sys
from collections import Counter

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import FeatureUnion
from sklearn.preprocessing import FunctionTransformer
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.pipeline import make_pipeline

from language_stream.labels import read_jsonl

MIN_EXAMPLES = 5  # classes with fewer labelled clauses cannot be learned or tested


def make_model():
    return make_pipeline(
        TfidfVectorizer(ngram_range=(1, 2), lowercase=True, sublinear_tf=True, min_df=1),
        LogisticRegression(max_iter=2000, class_weight="balanced"),
    )


def keyword_features(texts):
    """How many trigger words from each keyword group appear in each clause (capped at 3)."""
    from language_stream.baseline import KEYWORDS
    out = []
    for t in texts:
        t = t.lower()
        out.append([min(3, sum(t.count(k) for k in kws)) for kws in KEYWORDS.values()])
    return np.array(out, dtype=float)


def make_hybrid_model():
    """TF-IDF word patterns plus the keyword counts, learned together."""
    features = FeatureUnion([
        ("words", TfidfVectorizer(ngram_range=(1, 2), lowercase=True, sublinear_tf=True)),
        ("keywords", FunctionTransformer(keyword_features)),
    ])
    return make_pipeline(features, LogisticRegression(max_iter=2000, class_weight="balanced"))


def keyword_predict(texts):
    try:
        from language_stream.baseline import predict
    except Exception:
        return None
    return [predict(t) for t in texts]


def main(path):
    rows = read_jsonl(path)
    counts = Counter(r["category"] for r in rows)
    keep = {c for c, n in counts.items() if n >= MIN_EXAMPLES}
    dropped = {c: n for c, n in counts.items() if c not in keep}
    rows = [r for r in rows if r["category"] in keep]
    labels = sorted(keep)
    print(f"clauses used: {len(rows)} | classes: {labels}")
    print(f"left out (fewer than {MIN_EXAMPLES} examples): {dropped}")

    leases = sorted({r["lease_id"] for r in rows})
    y_true, y_model, y_hybrid, y_other, y_kw = [], [], [], [], []
    for held_out in leases:
        train = [r for r in rows if r["lease_id"] != held_out]
        test = [r for r in rows if r["lease_id"] == held_out]
        model = make_model()
        model.fit([r["text"] for r in train], [r["category"] for r in train])
        pred = model.predict([r["text"] for r in test])
        truth = [r["category"] for r in test]
        hybrid = make_hybrid_model()
        hybrid.fit([r["text"] for r in train], [r["category"] for r in train])
        hpred = hybrid.predict([r["text"] for r in test])
        f1 = f1_score(truth, pred, average="macro", labels=labels, zero_division=0)
        hf1 = f1_score(truth, hpred, average="macro", labels=labels, zero_division=0)
        print(f"test on {held_out}: {len(test)} clauses | TF-IDF macro-F1 {f1:.2f} | hybrid macro-F1 {hf1:.2f}")
        y_true += truth
        y_model += list(pred)
        y_hybrid += list(hpred)
        y_other += ["other"] * len(test)
        kw = keyword_predict([r["text"] for r in test])
        if kw is not None:
            y_kw += kw

    print("\nAll three folds together")
    def line(name, pred):
        print(f"{name:<28} accuracy {accuracy_score(y_true, pred):.2f} | macro-F1 {f1_score(y_true, pred, average='macro', labels=labels, zero_division=0):.2f}")
    line("always 'other'", y_other)
    if y_kw:
        line("keyword baseline", y_kw)
    line("TF-IDF + logistic regression", y_model)
    line("Hybrid (TF-IDF + keywords)", y_hybrid)
    print("\nPer-class scores (Hybrid)")
    print(classification_report(y_true, y_hybrid, labels=labels, zero_division=0))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python -m language_stream.train_tfidf <labelled.jsonl>")
    main(sys.argv[1])
