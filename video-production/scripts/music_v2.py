"""Original cinematic underscore + SFX for the PARALLAX X demo. Pure numpy/scipy synthesis (no samples).
Usage: python music.py timeline.json -> audio/stems/music.wav, audio/stems/sfx.wav (48 kHz stereo float)"""
import json, sys, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve
SR = 48000
TL = json.load(open(sys.argv[1]))
DUR = TL['duration']
N = int(DUR * SR) + SR  # 1 s spare tail, trimmed at mix
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR

def hz(note):
    names = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11}
    n, o = note[:-1], int(note[-1]); return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)

def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR/2*0.95), 'low', fs=SR, output='sos'), x)
def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)

def saw(f, n, phase=0.0):
    # band-limited-ish saw via additive partials (cheap enough for our durations)
    t = np.arange(n) / SR; y = np.zeros(n); k = 1
    while k * f < 9000 and k < 40:
        y += ((-1) ** (k + 1)) * np.sin(2 * np.pi * k * f * t + phase * k) / k; k += 1
    return y * (2 / np.pi)

def env_adsr(n, a, d, s, r):
    e = np.ones(n) * s; A, D, R = int(a*SR), int(d*SR), int(r*SR)
    A = min(A, n); e[:A] = np.linspace(0, 1, A) if A else e[:A]
    if D and A + D < n: e[A:A+D] = np.linspace(1, s, D)
    if R and R < n: e[-R:] *= np.linspace(1, 0, R) ** 2
    return e

def place(buf, x, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i < 0: x = x[-i:]; i = 0
    j = min(len(buf), i + len(x)); x = x[:j - i]
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    buf[i:j, 0] += x * gain * l * 1.414; buf[i:j, 1] += x * gain * r * 1.414

def reverb_ir(sec=2.8, decay=1.1, damp=5000):
    n = int(sec * SR); t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)], 1) * np.exp(-t / decay * 3)[:, None]
    ir[:, 0] = lp(ir[:, 0], damp); ir[:, 1] = lp(ir[:, 1], damp)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(0, keepdims=True))

def verb(x, ir, wet):
    out = np.zeros_like(x)
    for c in range(2): out[:, c] = fftconvolve(x[:, c], ir[:, c])[: len(x)]
    return x * (1 - wet) + out * wet

music = np.zeros((N, 2)); sfx = np.zeros((N, 2))


# ---------------- PADS (string/synth ensemble) ----------------
chords = TL['chords']  # [start, end, [notes], brightness]
for (s0, s1, notes, bright) in chords:
    n = int((s1 - s0 + 1.6) * SR)
    seg = np.zeros((n, 2))
    for k, nt in enumerate(notes):
        f = hz(nt)
        for det, pan in [(-0.11, -0.6), (0.0, 0.0), (0.12, 0.6)]:
            fr = f * 2 ** (det / 12 * 0.5)
            v = saw(fr, n, phase=rng.uniform(0, 6.28))
            v = lp(v, 600 + 2600 * bright + 300 * k, 2)
            seg[:, 0] += v * np.cos((pan + 1) * np.pi / 4); seg[:, 1] += v * np.sin((pan + 1) * np.pi / 4)
    seg *= env_adsr(n, 0.9, 0.5, 0.85, 1.6)[:, None] / (len(notes) * 2.2)
    # slow swell vibrato in amplitude
    seg *= (1 + 0.06 * np.sin(2 * np.pi * 0.23 * np.arange(n) / SR))[:, None]
    i = int(max(0, s0 - 0.4) * SR); j = min(N, i + n); music[i:j] += seg[: j - i] * 0.55

# ---------------- SUB DRONE ----------------
for (s0, s1, root, g) in TL['drone']:
    n = int((s1 - s0 + 1.0) * SR); t = np.arange(n) / SR; f = hz(root)
    v = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    v *= env_adsr(n, 1.2, 0.2, 1.0, 1.0)
    place(music, v * g, max(0, s0 - 0.3))

# ---------------- ARPEGGIO PLUCKS ----------------
bpm = TL['bpm']; eighth = 60 / bpm / 2
for (s0, s1, notes, sub, g, cutoff) in TL['arp']:
    step = eighth / sub; k = 0; t0 = s0
    while t0 < s1 - 0.02:
        nt = notes[k % len(notes)]; f = hz(nt); n = int(0.9 * SR); tt = np.arange(n) / SR
        v = saw(f, n) * 0.6 + np.sin(2 * np.pi * f * tt) * 0.5
        e = np.exp(-tt / 0.16); v = lp(v * e, cutoff * (0.8 + 0.4 * (k % 4 == 0)), 2) * e ** 0.3
        acc = 1.0 if k % 4 == 0 else 0.72
        place(music, v * g * acc, t0, pan=0.35 * np.sin(k * 1.7)); k += 1; t0 += step

# ---------------- LOW PULSE (bass) ----------------
for (s0, s1, root, g) in TL['pulse']:
    step = eighth; t0 = s0; k = 0
    while t0 < s1 - 0.02:
        f = hz(root); n = int(0.4 * SR); tt = np.arange(n) / SR
        v = lp(saw(f, n), 260 + 120 * (k % 2 == 0), 2) * np.exp(-tt / 0.12)
        place(music, v * g * (1.0 if k % 2 == 0 else 0.6), t0); t0 += step; k += 1

# ---------------- SHIMMER / BELL TAIL ----------------
for (s0, notes, g, spacing) in TL['bells']:
    for k, nt in enumerate(notes):
        f = hz(nt); n = int(3.5 * SR); tt = np.arange(n) / SR
        v = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * 2.76 * f * tt) * np.exp(-tt / 0.4) + 0.2 * np.sin(2 * np.pi * 5.4 * f * tt) * np.exp(-tt / 0.15)) * np.exp(-tt / 1.3)
        v *= np.minimum(1, tt / 0.004)
        place(music, v * g, s0 + k * spacing, pan=[-0.5, 0.5, -0.2, 0.3, 0][k % 5])


# ---------------- V2: BRASS-LIKE SWELLS (filter-opening saws, low register) ----------------
for (s0, dur, notes, g) in TL.get('brass', []):
    n = int((dur + 1.5) * SR); tt = np.arange(n) / SR; seg = np.zeros(n)
    for nt in notes:
        f = hz(nt)
        for det in (-0.07, 0.07):
            v = saw(f * 2 ** (det / 12), n, phase=rng.uniform(0, 6.28))
            # filter opens over the swell then closes
            fc = 350 + 2600 * np.clip(np.sin(np.pi * np.clip(tt / (dur + 0.6), 0, 1)), 0, 1) ** 1.5
            out = np.zeros(n); blk = 2400
            for i in range(0, n, blk): out[i:i+blk] = lp(v[max(0, i-1200):i+blk], fc[i])[-len(v[i:i+blk]):]
            seg += out
    seg *= env_adsr(n, 0.35, 0.4, 0.8, 1.2) / (len(notes) * 1.6)
    place(music, seg * g, s0)

# ---------------- V2: CINEMATIC PERCUSSION ----------------
def taiko(g, f0=72):
    n = int(1.2 * SR); tt = np.arange(n) / SR
    body = np.sin(2 * np.pi * (f0 * (0.62 + 0.9 * np.exp(-tt / 0.035))) * tt) * np.exp(-tt / 0.32)
    skin = lp(rng.standard_normal(n), 900) * np.exp(-tt / 0.03) * 1.2
    return (body + skin) * g
def hat(g):
    n = int(0.09 * SR); tt = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-tt / 0.018) * g
for (s0, s1, beat, pattern, g, hats) in TL.get('drums', []):
    bar = beat * 4; t0 = s0; b = 0
    while t0 < s1 - 0.05:
        for (pos, vel, f0) in pattern:
            tt0 = t0 + pos * beat
            if tt0 < s1 - 0.05: place(music, taiko(g * vel, f0), tt0, pan=0.0)
        if hats:
            for k in range(8):
                tt0 = t0 + k * beat / 2
                if tt0 < s1 - 0.05: place(music, hat(hats * (1.0 if k % 2 else 0.55)), tt0, pan=0.3 if k % 2 else -0.3)
        t0 += bar; b += 1

ir = reverb_ir(); music = verb(music, ir, 0.34)
music = hp(music.T, 28).T

# ---------------- SFX ----------------
def noise(n): return rng.standard_normal(n)
def whoosh(dur, f0, f1, g, pan_sweep=(-0.6, 0.6)):
    n = int(dur * SR); tt = np.arange(n) / SR; x = noise(n); y = np.zeros(n); blk = 512
    for i in range(0, n, blk):
        fr = f0 * (f1 / f0) ** (i / n); y[i:i+blk] = x[i:i+blk]
    # sweep band-pass using short overlapping filters
    out = np.zeros(n); nb = 24
    for b in range(nb):
        a0, a1 = int(b * n / nb), int((b + 1) * n / nb)
        fc = f0 * (f1 / f0) ** (b / nb); seg = bp(x[max(0, a0 - 2000):a1], fc * 0.6, min(fc * 1.6, 20000))[-(a1 - a0):]
        out[a0:a1] = seg
    e = np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.6
    return out * e * g
def tick(f=2400, dur=0.05, g=0.12):
    n = int(dur * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) * 0.7 + np.sin(2 * np.pi * f * 1.5 * tt) * 0.3) * np.exp(-tt / (dur / 5)) * g
def impact(g, f0=55, dur=2.2, bright=0.3):
    n = int(dur * SR); tt = np.arange(n) / SR
    body = np.sin(2 * np.pi * (f0 * (1 + 1.2 * np.exp(-tt / 0.05))) * tt) * np.exp(-tt / 0.55)
    thump = lp(noise(n), 180) * np.exp(-tt / 0.06) * 2.0
    air = hp(noise(n), 3000) * np.exp(-tt / 0.25) * bright * 0.3
    x = body + thump + air; return lp(x, 3000 + 6000 * bright) * g
def riser(dur, g):
    n = int(dur * SR); tt = np.arange(n) / SR; out = np.zeros(n); nb = 30; x = noise(n)
    for b in range(nb):
        a0, a1 = int(b * n / nb), int((b + 1) * n / nb); fc = 400 * (6000 / 400) ** (b / nb)
        out[a0:a1] = bp(x[max(0, a0 - 2000):a1], fc * 0.7, min(fc * 1.4, 20000))[-(a1 - a0):]
    tone = np.sin(2 * np.pi * (220 * (1 + tt / dur)) * tt) * 0.15
    return (out * 0.8 + tone) * (tt / dur) ** 2.2 * g
def scan(dur=0.9, g=0.06):
    n = int(dur * SR); tt = np.arange(n) / SR; out = np.zeros(n); x = noise(n); nb = 18
    for b in range(nb):
        a0, a1 = int(b * n / nb), int((b + 1) * n / nb); fc = 1200 * (5000 / 1200) ** (b / nb)
        out[a0:a1] = bp(x[max(0, a0 - 2000):a1], fc * 0.92, fc * 1.08, 2)[-(a1 - a0):]
    return out * np.sin(np.pi * tt / dur) * g * 3
def shimmer(g):
    n = int(2.5 * SR); tt = np.arange(n) / SR; y = np.zeros(n)
    for k, f in enumerate([1760, 2217, 2637, 3520]):
        y += np.sin(2 * np.pi * f * tt + k) * np.exp(-tt / 0.9) * np.minimum(1, tt / (0.03 + 0.06 * k))
    return y * g / 4
def soft_low(g):
    n = int(2.8 * SR); tt = np.arange(n) / SR
    y = (np.sin(2 * np.pi * 98 * tt) + 0.5 * np.sin(2 * np.pi * 146.8 * tt) + 0.25 * np.sin(2 * np.pi * 73.4 * tt)) * np.exp(-tt / 1.1) * np.minimum(1, tt / 0.05)
    return lp(y, 900) * g

for ev in TL['sfx']:
    kind, t = ev[0], ev[1]; g = ev[2] if len(ev) > 2 else 1.0
    if kind == 'whoosh': place(sfx, whoosh(ev[3], 300, 4000, 0.10 * g), t - ev[3] * 0.6)
    elif kind == 'whoosh_down': place(sfx, whoosh(ev[3], 3500, 250, 0.09 * g), t - ev[3] * 0.5)
    elif kind == 'tick': place(sfx, tick(g=0.10 * g), t, pan=0.1)
    elif kind == 'click': place(sfx, tick(1700, 0.06, 0.14 * g) + np.pad(tick(3400, 0.03, 0.05 * g), (0, 1440)), t, pan=0.15)
    elif kind == 'impact': place(sfx, impact(0.42 * g, bright=ev[3] if len(ev) > 3 else 0.3), t)
    elif kind == 'riser': place(sfx, riser(ev[3], 0.14 * g), t - ev[3])
    elif kind == 'scan': place(sfx, scan(g=0.05 * g), t)
    elif kind == 'shimmer': place(sfx, shimmer(0.10 * g), t)
    elif kind == 'soft_low': place(sfx, soft_low(0.22 * g), t)

# ---------------- V2: MECHANICAL / TERRAIN DESIGN (designed sounds, not recordings) ----------------
def servo(dur, f0, f1, g):
    n = int(dur * SR); tt = np.arange(n) / SR
    f = f0 + (f1 - f0) * (0.5 - 0.5 * np.cos(np.pi * np.clip(tt / dur, 0, 1)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    v = np.sign(np.sin(ph)) * 0.35 + np.sin(2 * ph) * 0.4 + np.sin(3.01 * ph) * 0.2
    v = bp(v, 300, 3200) * (1 + 0.25 * np.sin(2 * np.pi * 31 * tt))
    e = np.minimum(1, tt / 0.04) * np.minimum(1, (dur - tt) / 0.08)
    return v * e * g
def motor(dur, g, speed_env=None):
    n = int(dur * SR); tt = np.arange(n) / SR
    base = lp(saw(46, n), 300) * (0.75 + 0.25 * np.sin(2 * np.pi * 7.5 * tt))
    whine = np.sin(2 * np.pi * 182 * tt + 0.4 * np.sin(2 * np.pi * 3 * tt)) * 0.18
    grit = bp(rng.standard_normal(n), 500, 1800) * 0.12
    e = np.minimum(1, tt / 0.25) * np.minimum(1, (dur - tt) / 0.35)
    return (base + whine + grit) * e * g
def grains(dur, g, density=38):
    n = int(dur * SR); y = np.zeros(n)
    for _ in range(int(density * dur)):
        i = rng.integers(0, max(1, n - 2000)); L = int(rng.uniform(0.004, 0.02) * SR); tt = np.arange(L) / SR
        y[i:i+L] += rng.standard_normal(L) * np.exp(-tt / (L / SR / 4)) * rng.uniform(0.2, 1)
    y = bp(y, 900, 6500); tt = np.arange(n) / SR
    return y * np.minimum(1, tt / 0.3) * np.minimum(1, (dur - tt) / 0.4) * g
for ev in TL.get('mech', []):
    kind, t = ev[0], ev[1]
    if kind == 'servo': place(sfx, servo(ev[2], ev[3], ev[4], ev[5]), t, pan=ev[6] if len(ev) > 6 else 0)
    elif kind == 'motor': place(sfx, motor(ev[2], ev[3]), t)
    elif kind == 'grains': place(sfx, grains(ev[2], ev[3]), t, pan=0.0)
sfx = verb(sfx, reverb_ir(1.8, 0.7, 7000), 0.22)

import os; os.makedirs('audio/stems', exist_ok=True)
L = int(DUR * SR)
STEM = TL.get('stem_prefix', '')
sf.write(f'audio/stems/{STEM}music.wav', music[:L].astype(np.float32), SR, subtype='FLOAT')
sf.write(f'audio/stems/{STEM}sfx.wav', sfx[:L].astype(np.float32), SR, subtype='FLOAT')
print('music peak', np.abs(music).max(), 'sfx peak', np.abs(sfx).max())
