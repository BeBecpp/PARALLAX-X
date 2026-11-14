import json, numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy.signal import resample_poly, butter, sosfilt
SR = 48000
import sys
TL = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'timeline.json'))
P = TL.get('stem_prefix', '')
VDIR = TL.get('voice_dir')
TAG = {'v2_': '_V2', 'v3_': '_V3'}.get(P, ''); D = TL['duration']; N = int(round(D * SR))
music, _ = sf.read(f'audio/stems/{P}music.wav'); sfx, _ = sf.read(f'audio/stems/{P}sfx.wav')
music = music[:N]; sfx = sfx[:N]
# ---- narration: raw (24 kHz, unprocessed) + processed 48 kHz voice stem ----
raw = np.zeros(int(round(D * 24000))); voice = np.zeros(N)
meter48 = pyln.Meter(SR)
hp = butter(2, 75, 'high', fs=SR, output='sos')
for key, t in TL['voice'].items():
    a, sr = sf.read(f'{VDIR}/{key}.wav' if VDIR else f'audio/final_{key}.wav')
    i = int(round(t * 24000)); raw[i:i + len(a)] += a[: len(raw) - i]
    b = resample_poly(a, 2, 1); b = sosfilt(hp, b)
    # gentle presence lift (+2 dB shelf-ish around 3-5 kHz) via parallel band
    pres = sosfilt(butter(2, [2800, 6000], 'band', fs=SR, output='sos'), b); b = b + 0.26 * pres
    # level each sentence to the same loudness (-20 LUFS pre-master)
    L = meter48.integrated_loudness(np.pad(b, (0, max(0, SR // 2 - len(b)))))
    b *= 10 ** ((-20 - L) / 20)
    f = int(0.008 * SR); b[:f] *= np.linspace(0, 1, f); b[-f:] *= np.linspace(1, 0, f)
    i = int(round(t * SR)); voice[i:i + len(b)] += b[: N - i]
sf.write(f'out/PARALLAX_X_DEMO{TAG}_NARRATION_KOKORO.wav', raw.astype(np.float32), 24000, subtype='PCM_24')
# light compression on voice (soft knee, ~3:1 above -24 dBFS env)
env = np.sqrt(sosfilt(butter(1, 12, 'low', fs=SR, output='sos'), voice ** 2) + 1e-12)
lvl = 20 * np.log10(env + 1e-9); over = np.maximum(0, lvl + 24); gr = -over * (1 - 1 / 3)
voice = voice * 10 ** (gr / 20) * 10 ** (2.5 / 20)
# ---- sidechain ducking of music by voice ----
venv = np.abs(voice); k = int(0.010 * SR)
venv = np.convolve(venv, np.ones(k) / k, 'same')
gate = (venv > 0.004).astype(float)
# attack 60 ms, release 380 ms smoothing
duck = np.zeros(N); a_att = np.exp(-1 / (0.06 * SR)); a_rel = np.exp(-1 / (0.38 * SR)); g = 0.0
for i in range(0, N, 48):  # 1 ms blocks
    tgt = gate[i:i + 48].max()
    for _ in range(1):
        g = tgt + (g - tgt) * (a_att if tgt > g else a_rel) ** 48
    duck[i:i + 48] = g
duck_db = TL.get('duck_db', -13.0) * duck  # music sits ~10.5 dB lower under narration (bed already well below voice)
music_d = music * (10 ** (duck_db / 20))[:, None]
sfx_d = sfx * (10 ** ((TL.get('sfx_duck_db', -4.0) * duck) / 20))[:, None]
MG = TL.get('music_gain', 0.62); SG = TL.get('sfx_gain', 0.85)
mix = music_d * MG + sfx_d * SG + voice[:, None] * 1.0
# fades
fi = int(0.05 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
fo = int(0.5 * SR); mix[-fo:] *= (np.linspace(1, 0, fo) ** 1.5)[:, None]
# ---- loudness + true-peak limiting ----
meter = pyln.Meter(SR)
def tp(x): return np.abs(resample_poly(x, 4, 1, axis=0)).max()
L = meter.integrated_loudness(mix); mix *= 10 ** ((TL.get('lufs', -15.0) - L) / 20)
ceil = 10 ** (-1.5 / 20)
for it in range(4):
    up = resample_poly(mix, 4, 1, axis=0); pk = np.abs(up).max(axis=1)
    pk = pk.reshape(-1, 4).max(axis=1)[:N] if len(pk) >= 4 * N else np.pad(pk, (0, 4 * N - len(pk))).reshape(-1, 4).max(1)
    need = np.minimum(1, ceil / np.maximum(pk, 1e-9))
    # look-ahead 3 ms min-filter + smooth release 80 ms
    la = int(0.003 * SR); g = np.array([need[max(0, i - la):i + la + 1].min() for i in range(0, N)]) if it == 0 and False else None
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(need, size=2 * la + 1)
    rel = np.exp(-1 / (0.08 * SR)); out = np.empty_like(g); cur = 1.0
    for i in range(N):
        cur = g[i] if g[i] < cur else g[i] + (cur - g[i]) * rel
        out[i] = cur
    mix *= out[:, None]
    if tp(mix) <= ceil: break
L2 = meter.integrated_loudness(mix)
print('integrated LUFS %.2f  true-peak %.2f dBTP  sample-peak %.2f dBFS' % (L2, 20 * np.log10(tp(mix)), 20 * np.log10(np.abs(mix).max())))
# voice-vs-music check during narration
vm = duck > 0.9
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
print('during narration: voice %.1f dB, music+sfx %.1f dB' % (rms_db(voice[vm]), rms_db((music_d * MG + sfx_d * SG)[vm].mean(1))))
sf.write(f'out/PARALLAX_X_DEMO{TAG}_AUDIO_MIX.wav', mix.astype(np.float32), SR, subtype='PCM_24')
for nm, x in [('voice', voice), ('music_ducked', music_d * MG), ('sfx', sfx_d * SG)]:
    sf.write(f'audio/stems/{P}stem_{nm}.wav', x.astype(np.float32), SR, subtype='FLOAT')
