import json
import sys

from .labels import read_jsonl
from .schema import CATEGORIES


def main(src, dst):
    cats = list(CATEGORIES)
    rows = read_jsonl(src)
    try:
        done = {(r["lease_id"], r["idx"]) for r in read_jsonl(dst)}
    except FileNotFoundError:
        done = set()
    todo = [r for r in rows if (r["lease_id"], r["idx"]) not in done]
    print(f"{len(done)} already labelled, {len(todo)} to go. Number = category, s = skip, q = quit.")
    with open(dst, "a", encoding="utf-8") as out:
        for r in todo:
            print("\n" + "-" * 70)
            print(f"[{r['lease_id']} #{r['idx']}]  {r['text']}\n")
            print("  ".join(f"{i + 1}={c}" for i, c in enumerate(cats)))
            while True:
                a = input("label> ").strip().lower()
                if a in ("q", "s") or (a.isdigit() and 1 <= int(a) <= len(cats)):
                    break
            if a == "q":
                break
            if a == "s":
                continue
            out.write(json.dumps({**r, "category": cats[int(a) - 1]}, ensure_ascii=False) + "\n")
            out.flush()


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])