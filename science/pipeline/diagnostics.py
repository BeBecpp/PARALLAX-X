"""POST-HOC DESCRIPTIVE diagnostics (computed after the primary result was seen; they change nothing in the
pre-registered decision). Writes science/out/diagnostics.json:
  * per-group median raw feature values and median per-feature W1 (why sites ranked where they did)
  * E-W ridge-spacing spectrum of the native 20 m CTX DTM inside the yardang polygon
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import rasterio

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import OUT, RAW  # noqa: E402

FEATS = ["F1", "F2", "F3", "F4", "F5"]


def group_table(S):
    W = S["windows"]
    groups = {"D1 Gobi (search)": lambda w: w["domain"] == "D1", "D2 Lut (search, excl. Kaluts)": lambda w: w["domain"] == "D2" and w["site"] == "",
              **{s["id"] + " " + s["name"]: (lambda w, sid=s["id"]: w["site"] == sid) for s in S["sites"]}}
    out = []
    for name, sel in groups.items():
        ws = [w for w in W if sel(w)]
        if not ws:
            continue
        out.append({"group": name, "n": len(ws),
                    "median_raw": {k: float(np.median([w["median_raw"][k] for w in ws])) for k in FEATS},
                    "median_w1": {k: float(np.median([w["w1"][k] for w in ws])) for k in FEATS},
                    "median_pct": float(np.median([w["pct"] for w in ws]))})
    return out


def ctx_spectrum():
    with rasterio.open(RAW / "ctx_mff_dtm.tif") as d:
        z = d.read(1).astype(float)
        z[z == d.nodata] = np.nan
    dx = 20.2 * np.cos(np.radians(12.42))  # true E-W spacing (CTX standard parallel is 0°)
    L = 512
    blk = z[170:470, 50:1380]  # inside the pre-registered polygon rows/cols
    P, n = 0.0, 0
    for r in blk:
        ok = np.isfinite(r)
        idx = np.flatnonzero(np.diff(np.concatenate([[0], ok.astype(int), [0]])))
        for a, b in zip(idx[::2], idx[1::2]):
            for s in range(a, b - L + 1, L):
                seg = r[s : s + L]
                t = np.arange(L)
                seg = seg - np.polyval(np.polyfit(t, seg, 1), t)
                P = P + np.abs(np.fft.rfft(seg * np.hanning(L))) ** 2
                n += 1
    k = np.fft.rfftfreq(L, d=dx)[1:]
    Pk = P[1:]
    lam = 1 / k
    comp = Pk * k ** 2
    sel = (lam > 60) & (lam < 3000)
    peaks = lam[sel][np.argsort(comp[sel])[::-1][:6]]
    tot = Pk[lam < 3000].sum()
    # attenuation of a sinusoid's gradient by the F2 central difference (half-offset 90 m) and the sigma=30 m smoothing
    def atten(lmb):
        kk = 2 * np.pi / lmb
        return float(np.sinc(2 * 90 / lmb) * np.exp(-0.5 * (kk * 30) ** 2))
    return {"segments": n, "segment_length_m": L * dx, "compensated_peak_wavelengths_m": [float(x) for x in peaks],
            "ew_variance_fraction_lt300m": float(Pk[lam < 300].sum() / tot), "ew_variance_fraction_lt150m": float(Pk[lam < 150].sum() / tot),
            "f2_gradient_attenuation_at": {str(l): atten(l) for l in (250, 300, 480, 1000, 2000)},
            "spectrum": {"wavelength_m": [float(x) for x in lam[sel]], "power_k2": [float(x) for x in comp[sel]]}}


def main():
    S = json.loads((OUT / "search_primary.json").read_text())
    d = {"status": "post-hoc descriptive; does not alter the pre-registered decision",
         "groups": group_table(S), "ctx_ridge_spectrum": ctx_spectrum()}
    (OUT / "diagnostics.json").write_text(json.dumps(d, indent=1))
    c = d["ctx_ridge_spectrum"]
    print("peaks", [round(x) for x in c["compensated_peak_wavelengths_m"]], "atten", {k: round(v, 2) for k, v in c["f2_gradient_attenuation_at"].items()})


if __name__ == "__main__":
    main()
