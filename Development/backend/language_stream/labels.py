import json
import random

def read_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def write_jsonl(path, rows):
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

def split_by_lease(rows, test_frac=0.33, seed=42):
    ids = sorted({r["lease_id"] for r in rows})
    random.Random(seed).shuffle(ids)
    n_test = max(1, round(len(ids) * test_frac))
    test_ids = set(ids[:n_test])
    train = [r for r in rows if r["lease_id"] not in test_ids]
    test = [r for r in rows if r["lease_id"] in test_ids]
    return train, test