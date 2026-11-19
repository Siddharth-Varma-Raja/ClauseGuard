"""Retrain the clause classifier with approved user corrections and compare it with the current one.

Run from Development/backend:
    python -m language_stream.retrain "D:\\mse project\\labelled_clauses_v5_final.jsonl" "D:\\mse project\\feedback.jsonl" "D:\\mse project\\models"

Both models are tested the same way: hold one original lease out, train on the other leases
(the new model also gets the approved corrections), and score on the held-out lease.
If the new model is not worse, it is trained on everything and saved as the next version.
Every run adds one line to retrain_log.csv. Prints counts and scores only (no clause text).
"""
import csv
import os
import sys
from collections import Counter
from datetime import datetime

import joblib
from sklearn.metrics import f1_score

from language_stream.feedback import load_approved
from language_stream.labels import read_jsonl
from language_stream.train_tfidf import MIN_EXAMPLES, make_hybrid_model


def score(rows, extra, labels):
    """Macro-F1 over all original clauses; `extra` rows are added to every training set."""
    y_true, y_pred = [], []
    for held_out in sorted({r["lease_id"] for r in rows}):
        train = [r for r in rows if r["lease_id"] != held_out] + extra
        test = [r for r in rows if r["lease_id"] == held_out]
        model = make_hybrid_model()
        model.fit([r["text"] for r in train], [r["category"] for r in train])
        y_pred += list(model.predict([r["text"] for r in test]))
        y_true += [r["category"] for r in test]
    return f1_score(y_true, y_pred, average="macro", labels=labels, zero_division=0)


def main(labelled_path, feedback_path, out_dir):
    rows = read_jsonl(labelled_path)
    counts = Counter(r["category"] for r in rows)
    keep = {c for c, n in counts.items() if n >= MIN_EXAMPLES}
    rows = [r for r in rows if r["category"] in keep]
    labels = sorted(keep)
    extra, skipped = load_approved(feedback_path)
    extra = [r for r in extra if r["category"] in keep]  # classes with too few examples are ignored
    print(f"original clauses: {len(rows)} | approved corrections used: {len(extra)} | skipped: {skipped}")
    old = score(rows, [], labels)
    new = score(rows, extra, labels)
    print(f"current model macro-F1 {old:.3f} | with corrections {new:.3f}")

    os.makedirs(out_dir, exist_ok=True)
    if new >= old:
        version = len([f for f in os.listdir(out_dir) if f.endswith(".joblib")]) + 1
        data = rows + extra
        final = make_hybrid_model()
        final.fit([r["text"] for r in data], [r["category"] for r in data])
        joblib.dump(final, os.path.join(out_dir, f"clause_classifier_v{version}.joblib"))
        decision = f"saved v{version}"
    else:
        decision = "kept current"
    print(decision)
    with open(os.path.join(out_dir, "retrain_log.csv"), "a", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow([datetime.now().isoformat(timespec="seconds"), len(extra), f"{old:.3f}", f"{new:.3f}", decision])


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit("usage: python -m language_stream.retrain <labelled.jsonl> <feedback.jsonl> <output folder>")
    main(sys.argv[1], sys.argv[2], sys.argv[3])
