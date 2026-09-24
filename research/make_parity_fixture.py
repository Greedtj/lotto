"""Write tests/fixtures/parity.json: Python distributions the TS port must match."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import lotto

draws = lotto.load_draws()[:500]
out = {"n_draws": len(draws), "dists": {}}
for f, (_, _, fn) in lotto.FORMULAS.items():
    out["dists"][f] = {}
    for t in ["last2", "top2", "top3"] + [f"first_d{i}" for i in range(1, 7)]:
        h, K = lotto.series(draws, t)
        out["dists"][f][t] = [round(x, 12) for x in fn(h, K)]
Path(__file__).parent.parent.joinpath("tests/fixtures/parity.json").write_text(json.dumps(out))
print("ok", len(draws))
