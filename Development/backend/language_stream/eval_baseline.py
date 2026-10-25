import json
import sys
from collections import Counter

from language_stream.baseline import predict

rows = [json.loads(l) for l in open(sys.argv[1], encoding="utf-8") if l.strip()]
print("label counts:", dict(Counter(r["category"] for r in rows)))

right = 0
for r in rows:
    guess = predict(r["text"])
    ok = guess == r["category"]
    right += ok
    if not ok:
        print(f"[{r['lease_id']} #{r['idx']}] you: {r['category']} | baseline: {guess}")
print(f"accuracy: {right}/{len(rows)} = {right / len(rows):.0%}")
