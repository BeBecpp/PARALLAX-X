"""Export the exact ECDF-normalised quantile functions behind each published W1 (visualisation data).

Re-runs the pre-registered primary pipeline stages (Mars fingerprint, Earth window features, pooled
null ECDF with the logged per-window seeds) WITHOUT changing anything, then:
  * maps Mars and each comparison window's 199 raw quantiles through the null ECDF (to_norm),
  * recomputes W1 = mean |q_earth - q_mars| per feature and checks it against the stored value
    in science/out/search_primary.json (traceability; the script fails if they disagree),
  * writes public/data/w1_curves.json for the animated W1 explainer in the app.

Post-hoc visualisation only: it cannot alter the decision, ranks or percentiles.

Usage:  python science/pipeline/export_w1_curves.py --workers 6
"""
from __future__ import annotations

import argparse
import json
import multiprocessing as mp
import sys
import time
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import config as cfg  # noqa: E402
import search  # noqa: E402
from common import OUT, PUBLIC_DATA  # noqa: E402
from features import all_features, quantiles  # noqa: E402

FEATS = search.FEATS
NQ = search.NQ


def match_window(scene: dict, stored: list[dict]) -> str:
    """The stored window whose per-feature W1 equals the compare scene's (exact float match)."""
    tgt = scene["per_feature_w1"]
    for w in stored:
        if all(abs(w["w1"][k] - tgt[k]) < 1e-12 for k in FEATS):
            return w["id"]
    raise SystemExit(f"no stored window matches compare scene {scene['id']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=6)
    a = ap.parse_args()
    t0 = time.time()
    stored = json.loads((OUT / "search_primary.json").read_text())
    results = json.loads((PUBLIC_DATA / "results.json").read_text())
    scenes = [s for s in results["compare_scenes"] if s["kind"] != "mars"]
    want = {s["id"]: match_window(s, stored["windows"]) for s in scenes}
    print("compare windows:", want, flush=True)

    search.DEM = "nasadem"
    search.POOL = mp.Pool(a.workers)
    mz, mmask, *_ = search.mars_grid()
    mf = all_features(mz, cfg.GRID_M, cfg, mask=mmask)
    mars_q = {k: quantiles(mf[k], NQ) for k in FEATS}
    # identical to the stored Mars fingerprint?
    for k in FEATS:
        d = float(np.max(np.abs(mars_q[k] - np.array(stored["mars"]["quantiles_raw"][k]))))
        assert d < 1e-9, f"Mars quantiles differ for {k}: {d}"

    wins = search.earth_windows(stored["window_px"], np.random.default_rng(42))
    null = [w for w in wins if w.in_null]
    maps = search.ecdf_maps(null)
    mars_n = {k: search.to_norm(mars_q[k], maps[k]) for k in FEATS}
    by_id = {w.id: w for w in wins}
    stored_by_id = {w["id"]: w for w in stored["windows"]}

    out_scenes = {}
    max_diff = 0.0
    for sid, wid in want.items():
        w = by_id[wid]
        norm = {k: search.to_norm(w.q[k], maps[k]) for k in FEATS}
        w1 = {k: float(np.mean(np.abs(norm[k] - mars_n[k]))) for k in FEATS}
        for k in FEATS:
            max_diff = max(max_diff, abs(w1[k] - stored_by_id[wid]["w1"][k]))
        out_scenes[sid] = {
            "window_id": wid,
            "w1": w1,
            "q_norm": {k: [round(float(v), 5) for v in norm[k]] for k in FEATS},
            "q_raw": {k: [round(float(v), 4) for v in w.q[k]] for k in FEATS},
        }
    print(f"max |W1 recomputed - stored| = {max_diff:.3e}", flush=True)
    if max_diff > 1e-9:
        raise SystemExit("recomputed W1 does not match the stored primary run — not exporting")

    levels = [(i + 0.5) / NQ for i in range(NQ)]
    payload = {
        "status": "post-hoc visualisation data; reproduces the stored primary-run W1 exactly (checked)",
        "max_abs_w1_diff": max_diff,
        "n_quantiles": NQ,
        "levels": [round(v, 5) for v in levels],
        "normalisation": "mid-rank ECDF of pooled null-window samples (500 per window, seed 42 + crc32(window id))",
        "n_null_windows": len(null),
        "mars": {"q_norm": {k: [round(float(v), 5) for v in mars_n[k]] for k in FEATS},
                 "q_raw": {k: [round(float(v), 4) for v in mars_q[k]] for k in FEATS}},
        "scenes": out_scenes,
        "runtime_s": round(time.time() - t0, 1),
    }
    (PUBLIC_DATA / "w1_curves.json").write_text(json.dumps(payload, separators=(",", ":")))
    print("wrote public/data/w1_curves.json", flush=True)


if __name__ == "__main__":
    main()
