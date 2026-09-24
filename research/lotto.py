"""Thai lottery: statistical formulas + walk-forward backtest. Stdlib only.

Every formula: f(history: list[int], K: int) -> list[float] of length K (sums to 1, no zeros).
"""
import json, math, random
from pathlib import Path

DATA = Path(__file__).parent
WARMUP = 100  # first draws used only as history, never scored

# Fixed up front — never tuned on backtest results (that would leak the test set).
MA_WINDOW = 100
EWMA_ALPHA = 0.05


def load_draws():
    return json.loads((DATA / "draws.json").read_text())


# Targets: name -> (label, extract(draw) -> str). first prize 1990-94 had 7 digits, keep last 6.
TARGETS = {
    "last2": ("เลขท้าย 2 ตัว (2 ตัวล่าง)", lambda d: d["last2"]),
    "top2": ("2 ตัวบน", lambda d: d["first"][-2:]),
    "top3": ("3 ตัวบน", lambda d: d["first"][-3:]),
    **{f"first_d{i+1}": (f"รางวัลที่ 1 หลักที่ {i+1}", lambda d, i=i: d["first"][-6:][i]) for i in range(6)},
}


def series(draws, target):
    """-> (list[int], K)"""
    vals = [TARGETS[target][1](d) for d in draws]
    return [int(v) for v in vals], 10 ** len(vals[0])


def _norm(w, eps=1e-3):
    s = sum(w)
    K = len(w)
    return [(1 - eps) * x / s + eps / K for x in w] if s > 0 else [1 / K] * K


def _digits(v, nd):
    return [(v // 10 ** (nd - 1 - p)) % 10 for p in range(nd)]


def _per_digit(K, digit_probs):
    """Combine per-position 10-vectors into a K-vector (independent digits)."""
    nd = round(math.log10(K))
    return _norm([math.prod(digit_probs[p][d] for p, d in enumerate(_digits(v, nd))) for v in range(K)])


def _counts(h, K):
    c = [0] * K
    for v in h:
        c[v] += 1
    return c


def _gaps(h, K):
    """Draws since each value last appeared (never seen -> len(h))."""
    last = [-1] * K
    for i, v in enumerate(h):
        last[v] = i
    return [len(h) - 1 - l if l >= 0 else len(h) for l in last]


# ---------------- formulas ----------------

def f_random(h, K):
    return [1 / K] * K  # ties broken at random -> pure random picks


def f_hot(h, K):
    return _norm([c + 1 for c in _counts(h, K)])


def f_cold(h, K):
    return _norm([g + 1 for g in _gaps(h, K)])


def f_moving_avg(h, K):
    return _norm([c + 1 for c in _counts(h[-MA_WINDOW:], K)])


def f_markov(h, K):
    # per-digit 10x10 chains; a K=100/1000 matrix would be almost empty with ~900 draws
    nd = round(math.log10(K))
    ds = [_digits(v, nd) for v in h]
    probs = []
    for p in range(nd):
        m = [[1] * 10 for _ in range(10)]  # Laplace smoothing
        for a, b in zip(ds, ds[1:]):
            m[a[p]][b[p]] += 1
        row = m[ds[-1][p]]
        probs.append([x / sum(row) for x in row])
    return _per_digit(K, probs)


def f_ewma(h, K):
    w = [0.0] * K
    n = len(h)
    for i, v in enumerate(h):
        w[v] += (1 - EWMA_ALPHA) ** (n - 1 - i)
    return _norm([x + 0.01 for x in w])


def f_bayes_digit(h, K):
    # Dirichlet(1) posterior predictive per digit position, digits assumed independent
    nd = round(math.log10(K))
    probs = []
    for p in range(nd):
        c = [1] * 10
        for v in h:
            c[_digits(v, nd)[p]] += 1
        probs.append([x / sum(c) for x in c])
    return _per_digit(K, probs)


def f_poisson_gap(h, K):
    # P(value "due") = 1 - exp(-rate * (gap+1)), rate = smoothed frequency per draw
    n = len(h)
    cnt, gap = _counts(h, K), _gaps(h, K)
    return _norm([1 - math.exp(-((c + 1) / (n + K)) * (g + 1)) for c, g in zip(cnt, gap)])


FORMULAS = {
    "random": ("Random (ตัวเทียบ)", "สุ่มล้วน ทุกเลขโอกาสเท่ากัน", f_random),
    "hot": ("Hot numbers", "เลขที่ออกบ่อยสุดตลอดประวัติ", f_hot),
    "cold": ("Cold / Overdue", "เลขที่ไม่ออกนานสุด (คิดว่า 'ถึงคิว')", f_cold),
    "moving_avg": (f"Moving Average ({MA_WINDOW} งวด)", f"ความถี่เฉพาะ {MA_WINDOW} งวดล่าสุด", f_moving_avg),
    "markov": ("Markov Chain", "งวดก่อนออกเลข X งวดถัดไปมักออกอะไร (แยกหลัก)", f_markov),
    "ewma": (f"Exponential Smoothing (α={EWMA_ALPHA})", "นับความถี่ ให้น้ำหนักงวดใหม่มากกว่า", f_ewma),
    "bayes_digit": ("Bayesian (Dirichlet รายหลัก)", "ประมาณโอกาสแต่ละหลักแยกกัน แล้วรวมเป็นเลข", f_bayes_digit),
    "poisson_gap": ("Poisson gap", "ใช้อัตราการออก + ระยะห่าง คำนวณโอกาส 'ถึงรอบ'", f_poisson_gap),
}


def top_k(p, k, rng):
    """Indices of k highest probs, ties broken randomly."""
    return sorted(range(len(p)), key=lambda i: (-p[i], rng.random()))[:k]


# ---------------- prediction ----------------

def predict(draws, formula, k=5, rng=None):
    rng = rng or random.Random()
    f = FORMULAS[formula][2]
    out = {}
    for t in ("last2", "top2", "top3"):
        h, K = series(draws, t)
        w = len(str(K - 1))
        out[t] = [str(v).zfill(w) for v in top_k(f(h, K), k, rng)]
    out["first"] = "".join(str(top_k(f(*series(draws, f"first_d{i+1}")), 1, rng)[0]) for i in range(6))
    return out


# ---------------- backtest ----------------

def binom_sf(x, n, p):
    """P(X >= x), X ~ Binomial(n, p)."""
    if x <= 0:
        return 1.0
    lp = lambda i: math.lgamma(n + 1) - math.lgamma(i + 1) - math.lgamma(n - i + 1) + i * math.log(p) + (n - i) * math.log1p(-p)
    return min(1.0, sum(math.exp(lp(i)) for i in range(x, n + 1)))


def _score(hits, n, p):
    return {"hits": hits, "n": n, "rate": hits / n, "expected": p, "p_value": binom_sf(hits, n, p)}


def backtest(draws, seed=42):
    """Walk-forward: draw t is predicted from draws[:t] only."""
    rng = random.Random(seed)
    res = {}
    for fname, (_, _, f) in FORMULAS.items():
        r = {}
        for t in ("last2", "top2", "top3"):
            h, K = series(draws, t)
            h1 = h10 = 0
            ll = 0.0
            for i in range(WARMUP, len(h)):
                p = f(h[:i], K)
                top = top_k(p, 10, rng)
                h1 += top[0] == h[i]
                h10 += h[i] in top
                ll += -math.log(p[h[i]])
            n = len(h) - WARMUP
            r[t] = {"hit1": _score(h1, n, 1 / K), "hit10": _score(h10, n, 10 / K),
                    "logloss": ll / n, "logloss_uniform": math.log(K)}
        # first prize: each of 6 positions, 10 classes
        dh = full = 0
        n = len(draws) - WARMUP
        preds = [[None] * len(draws) for _ in range(6)]
        for d in range(6):
            h, K = series(draws, f"first_d{d+1}")
            for i in range(WARMUP, len(h)):
                preds[d][i] = top_k(f(h[:i], K), 1, rng)[0]
                dh += preds[d][i] == h[i]
        for i in range(WARMUP, len(draws)):
            full += all(preds[d][i] == int(draws[i]["first"][-6:][d]) for d in range(6))
        r["first"] = {"digit": _score(dh, 6 * n, 0.1), "full": _score(full, n, 1e-6)}
        res[fname] = r
    return {"draws": len(draws), "from": draws[WARMUP]["date"], "to": draws[-1]["date"],
            "warmup": WARMUP, "tests": len(draws) - WARMUP, "results": res}


def cached_backtest(draws):
    """Recompute when draws.json or this file (formulas/params) is newer than the cache."""
    path = DATA / "backtest.json"
    src = max((DATA / "draws.json").stat().st_mtime, Path(__file__).stat().st_mtime)
    if path.exists() and path.stat().st_mtime > src:
        return json.loads(path.read_text())
    bt = backtest(draws)
    path.write_text(json.dumps(bt, ensure_ascii=False))
    return bt


if __name__ == "__main__":
    # self-check: every formula returns a valid distribution; backtest is reproducible
    import time
    draws = load_draws()
    assert len(draws) > WARMUP and all(d["first"].isdigit() and len(d["last2"]) == 2 for d in draws)
    for name, (_, _, f) in FORMULAS.items():
        for t in ("last2", "top3", "first_d1"):
            h, K = series(draws, t)
            p = f(h, K)
            assert len(p) == K and min(p) > 0 and abs(sum(p) - 1) < 1e-9, (name, t)
    tiny = draws[:WARMUP + 3]
    assert backtest(tiny, 1) == backtest(tiny, 1)
    t0 = time.time()
    bt = cached_backtest(draws)
    print(f"ok: {len(draws)} draws, backtest {time.time()-t0:.1f}s")
    for fn, r in bt["results"].items():
        print(f"{fn:12} last2 hit10={r['last2']['hit10']['rate']:.3f} (exp 0.100)  "
              f"digit={r['first']['digit']['rate']:.3f} (exp 0.100)  ll={r['last2']['logloss']:.3f}/{r['last2']['logloss_uniform']:.3f}")
