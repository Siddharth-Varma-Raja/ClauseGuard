"""
Each line of the feedback file is one JSON object:
{"text": "...", "model_label": "fees", "user_label": "access", "status": "approved"}
status is "pending", "approved" or "rejected"; only "approved" corrections are used.
"""
import json

LABELS = {"deposit", "notice_period", "rent_review", "termination", "repairs", "access", "fees", "waiver", "other"}


def load_approved(path):
    rows, skipped = [], 0
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line.startswith("{"):
                continue
            item = json.loads(line)
            if (item.get("status") != "approved" or item.get("user_label") not in LABELS
                    or not str(item.get("text", "")).strip()):
                skipped += 1
                continue
            rows.append({"lease_id": "FB", "idx": len(rows), "text": item["text"], "category": item["user_label"]})
    return rows, skipped