"""V3 'real rover + cinematic science' edit decision list -> timeline_v3.json"""
import json
VOICE = 'af_heart'; VDIR = f'audio/v3/{VOICE}'
tok = json.load(open(f'{VDIR}/tokens.json'))
G = json.load(open('g_lab_edit.json'))   # frame offsets for the new captures (filled from capture log)
E = json.load(open('e_rover_edit.json'))
ONSET = {'m1': 0.31, 'm2': 3.32, 'm3': 10.80, 'm3b': 14.90, 'm4': 18.30, 'm5': 25.75, 'm6': 27.70}
VO = {k: round(max(0.0, v - tok[k]['lead']), 3) for k, v in ONSET.items()}
def at(key, i): return VO[key] + tok[key]['tokens'][i][1]
def speech_end(key): return VO[key] + tok[key]['speech_end']
def widx(key, word):
    for i, t in enumerate(tok[key]['tokens']):
        if t[0].lower().startswith(word.lower()): return i
    raise KeyError(word)
CAPS = [("m1", 0, None, "What makes an Earth landscape useful for Mars exploration?"),
        ("m2", 0, ("m2", widx('m2', 'across')), "PARALLAX X compares five terrain features"),
        ("m2", widx('m2', 'across'), None, "across 1,915 Earth windows, using Wasserstein distance."),
        ("m3", 0, None, "Then watch our six-wheel rover move across high-resolution Martian terrain."),
        ("m3b", 0, None, "An illustration, not physics."),
        ("m4", 0, None, "Expedition Lab designs field tests for wheel slip, sinkage, and energy."),
        ("m5", 0, None, "Similarity is a starting point."),
        ("m6", 0, None, "Evidence comes first.")]
caps = []
for key, wi, until, text in CAPS:
    a = at(key, wi) - 0.08; b = (at(*until) - 0.04) if until else speech_end(key) + 0.25
    caps.append({"in": round(a, 3), "out": round(b, 3), "lines": [text]})
for c, n in zip(caps, caps[1:]): c['out'] = round(min(c['out'], n['in'] - 0.04), 3)
D = 29.30
AI = "AI-GENERATED CONCEPT FOOTAGE  ·  BRAND FILM BY KHUSLEN (V01D-404)"
BLUE = [106, 155, 173]; BLUE_L = [150, 196, 214]; COP_L = [255, 160, 110]
FULL = [0, 0, 2880, 1620]
rover_seg = dict(E['seg']); rover_seg['first'] = 36
TL = {
 "duration": D, "fade_in": 0.30, "fade_out": 0.40, "fade_out_depth": 1.0, "stem_prefix": "v3_",
 "voice_dir": VDIR, "voice": VO, "lufs": -14.8, "duck_db": -21.0, "sfx_duck_db": -11.0, "music_gain": 0.72, "sfx_gain": 0.9,
 "segments": [
  {"name": "S1 film05 open", "type": "seq", "dir": "src/film05_open", "first": 6, "start": 0.0, "end": 1.80},
  {"name": "S2 select CTX", "type": "seq", "dir": "src/capture/A_select", "first": 16, "speed": 1.354, "start": 1.80, "end": 5.00, "xin": 0.13},
  {"name": "S3 compare + F1-F5", "type": "seq", "dir": "src/capture/B_compare", "first": 24, "start": 5.00, "end": 7.50, "xin": 0.17,
   "zoom": [[0, 1150, 430, 1.30], [2.5, 1160, 440, 1.33]]},
  {"name": "S4 W1 explainer (Evidence, real pipeline curves)", "type": "seq", "dir": "src/capture/F_w1g", "first": G['w1_first'], "start": 7.50, "end": 10.20, "xin": 0.13,
   "src_box": G["w1_box"], "zoom": [[0, 960, 540, 1.0], [2.7, 880, 560, 1.05]]},
  dict({"name": "S5 rover (real Simulate, HiRISE)", "type": "seq", "dir": "src/capture/E_rover", "start": 10.20, "end": 17.60, "xin": 0.10}, **{k: v for k, v in rover_seg.items() if k != 'zoom'},
       zoom=[[0, 960, 540, 1.0], [4.9, 960, 540, 1.0], [7.0, 900, 520, 1.07], [7.4, 900, 520, 1.07]]),
  {"name": "S6a lab: plan -> Expedition Lab", "type": "seq", "dir": "src/capture/G_lab2", "first": 0, "start": 17.60, "end": G['a_end_t'], "xin": 0.17, "src_box": FULL,
   "zoom": [[0, 1150, 430, 1.30], [0.9, 960, 540, 1.0], [1.5, 960, 540, 1.0], [2.6, 1500, 460, 1.36]]},
  {"name": "S6b lab: NOT MEASURED -> key measurements (real formulas)", "type": "seq", "dir": "src/capture/G_lab2", "first": G['b_first'], "speed": G['b_speed'], "start": G['a_end_t'], "end": 24.80, "xin": 0.13, "src_box": FULL,
   "zoom": G['b_zoom']},
  {"name": "S7 lab: resolution check 13.9% -> 1.6%", "type": "seq", "dir": "src/capture/G_lab2", "first": G['res_first'], "start": 24.80, "end": 26.60, "xin": 0.13, "src_box": FULL,
   "zoom": G['res_zoom']},
  {"name": "S8 film05 logo", "type": "seq", "dir": "src/film05_logo", "first": 12, "start": 26.60, "end": 28.00, "xin": 0.12},
  {"name": "S9 end card", "type": "card", "start": 28.00, "end": 29.31, "xin": 0.40, "zoom": [[0, 960, 540, 1.0], [1.31, 960, 530, 1.03]]},
 ],
 "endcard_bg": "src/capture/B_compare/00100.jpg", "endcard_bg_box": [384, 150, 1440, 744],
 "masks": [{"in": 26.5, "out": 28.01, "y0": 655, "y1": 712, "color": [5, 4, 4]}],
 "notices": [
  {"in": 0.0, "out": 1.80, "x": 40, "y": 38, "size": 21, "text": AI},
  {"in": 10.30, "out": 17.55, "x": 48, "y": 44, "size": 21, "text": "ILLUSTRATIVE TRAVERSE  ·  NOT MOBILITY PHYSICS  ·  ROVER ENLARGED ×41"},
  {"in": 26.55, "out": 28.0, "x": 40, "y": 38, "size": 21, "text": AI},
 ],
 "headlines": [
  {"in": 2.05, "out": 4.95, "x": 60, "y": 262, "text": "NASA MRO CTX  +  NASADEM", "size": 58, "sub": "COMMON 30 m GRID  ·  σ 30 m  ·  9.99 km WINDOWS"},
  {"in": 7.65, "out": 8.95, "x": 40, "y": G['w1_head_y'], "text": "ECDF  +", "text2": "WASSERSTEIN-1", "size": 48, "sub": "D = ⅕ · Σ W₁(Fₖ)", "subsize": 26},
  {"in": 9.00, "out": 10.15, "x": 40, "y": G['w1_head_y'], "text": "5 EXPLORATORY", "text2": "CANDIDATES", "size": 48, "sub": "OF 1,915 WINDOWS · PRE-REGISTERED", "sub2": "VALIDATION: NOT PASSED", "subsize": 19, "accent_color": BLUE, "color2": BLUE_L},
  {"in": 10.95, "out": 13.55, "x": 1860, "y": 104, "align": "right", "text": "NASA PDS HiRISE · 1 m DTM", "size": 50, "sub": "SEPARATE MARS SCENE  ·  DEM-CONFORMED 3D ROVER", "subsize": 22},
  {"in": 13.65, "out": 16.95, "x": 1860, "y": 104, "align": "right", "text": "WHEEL SPIN  Δθ = Δs / r", "size": 54, "sub": "6 WHEEL PIVOTS  ·  4-POINT SURFACE TILT  ·  RIGGED MAST", "subsize": 22},
  {"in": 19.55, "out": G['a_end_t'] - 0.05, "x": 60, "y": 112, "text": "EXPEDITION LAB", "size": 58, "sub": "PROPOSED FIELD TESTS  ·  NOT MEASURED", "subsize": 23},
  {"in": G['a_end_t'] + 0.15, "out": 24.72, "x": 60, "y": 112, "text": "FIELD MEASUREMENTS", "text2": "TO COLLECT", "size": 56, "sub": "SLIP  ·  SINKAGE  ·  ENERGY  —  NOT MEASURED", "subsize": 22},
  {"in": 24.95, "out": 26.55, "x": 60, "y": 112, "text": "4 m: 13.9% > 15°", "text2": "→ 180 m: 1.6% > 15°", "size": 54, "sub": "SAME HiRISE CROP  ·  SCALE CHANGES WHAT WE CAN SEE", "subsize": 22},
 ],
 "rails": [
  {"in": 5.15, "out": 7.45, "x": 50, "y": 470, "title": "5 TERRAIN FEATURES", "title_size": 38, "size": 29, "lh": 48,
   "lines": [{"t": 5.35, "key": "F1", "text": "LOCAL RELIEF  ·  P95−P5  ·  ≈2 km"},
             {"t": 5.70, "key": "F2", "text": "SLOPE  ·  180 m BASELINE"},
             {"t": 6.05, "key": "F3", "text": "SLOPE  ·  600 m BASELINE"},
             {"t": 6.40, "key": "F4", "text": "TPI  ·  510 m DISK"},
             {"t": 6.75, "key": "F5", "text": "RIDGE COHERENCE  ·  σ 300 m"}]},
 ],
 "endtitles": [{"in": 26.5, "logo_in": 27.6, "logo_fade": 0.4, "logo_w": 1240, "logo_y": 500,
   "lines": [
    {"in": 28.00, "y": 732, "text": "FROM MEASURED TERRAIN TO TESTABLE QUESTIONS", "size": 42, "bold": True, "track": 4, "color": [255, 150, 92]},
    {"in": 28.10, "y": 806, "text": "parallax-x-lyart.vercel.app", "size": 36, "track": 2.0, "color": [236, 239, 243]},
    {"in": 28.15, "y": 46, "text": "NASA SPACE APPS CHALLENGE 2026 ENTRY  ·  NOT AFFILIATED WITH OR ENDORSED BY NASA", "size": 19, "track": 2.2, "color": [150, 158, 168]},
    {"in": 28.15, "y": 76, "text": "AI voice: Kokoro TTS  ·  Concept film: Khuslen (V01D-404), AI-generated  ·  Rover model: NASA/JPL-Caltech  ·  Original score", "size": 19, "track": 0.6, "color": [150, 158, 168]},
   ]}],
 "captions": caps,
 # ---------------- audio ----------------
 "bpm": 100,
 "chords": [
  [0.0, 1.8, ["D3", "A3", "F4", "E5"], 0.30],
  [1.8, 3.4, ["D3", "A3", "F4", "C5", "E5"], 0.42],
  [3.4, 5.0, ["Bb2", "F3", "D4", "A4"], 0.48],
  [5.0, 7.5, ["F2", "C4", "F4", "A4", "C5", "E5"], 0.60],
  [7.5, 9.2, ["C3", "G3", "E4", "G4", "D5"], 0.62],
  [9.2, 10.2, ["A2", "E3", "A3", "D4", "E4"], 0.70],
  [10.2, 12.05, ["D2", "A2", "D3", "F3", "A3", "D4", "F4"], 0.78],
  [12.05, 13.9, ["Bb1", "F2", "Bb2", "D3", "F3", "D4"], 0.74],
  [13.9, 15.75, ["F2", "C3", "F3", "A3", "C4", "F4"], 0.80],
  [15.75, 17.6, ["C2", "G2", "C3", "E3", "G3", "E4"], 0.84],
  [17.6, 19.4, ["Bb2", "F3", "D4", "F4", "C5"], 0.55],
  [19.4, 21.2, ["F2", "C4", "F4", "A4", "C5"], 0.58],
  [21.2, 23.0, ["C3", "G3", "E4", "G4", "E5"], 0.60],
  [23.0, 24.8, ["G2", "D3", "Bb3", "D4", "G4"], 0.50],
  [24.8, 26.6, ["A2", "E3", "A3", "D4", "E4"], 0.62],
  [26.6, 29.3, ["D2", "A2", "F#3", "A3", "E4", "F#4", "C#5"], 0.6],
 ],
 "drone": [[0.0, 1.8, "D1", 0.30], [1.8, 10.2, "D2", 0.09], [10.2, 17.6, "D1", 0.16], [17.6, 24.8, "Bb1", 0.08], [24.8, 26.6, "A1", 0.10], [26.6, 29.3, "D1", 0.14]],
 "arp": [
  [1.9, 5.0, ["D4", "A4", "F5", "A4", "E5", "A4"], 1, 0.040, 2300],
  [5.0, 7.5, ["F4", "C5", "A5", "C5", "F5", "C5"], 2, 0.040, 2900],
  [7.5, 10.05, ["C4", "G4", "E5", "G4", "D5", "G4"], 2, 0.042, 3100],
  [10.2, 12.05, ["D4", "A4", "D5", "F5", "A4", "D5"], 2, 0.050, 3400],
  [12.05, 13.9, ["Bb3", "F4", "Bb4", "D5", "F4", "Bb4"], 2, 0.050, 3400],
  [13.9, 15.75, ["F4", "C5", "F5", "A5", "C5", "F5"], 2, 0.054, 3800],
  [15.75, 17.5, ["C4", "G4", "C5", "E5", "G4", "C5"], 2, 0.058, 4200],
  [17.6, 21.2, ["Bb3", "F4", "D5", "F4", "C5", "F4"], 2, 0.038, 2800],
  [21.2, 24.75, ["C4", "G4", "E5", "G4", "E5", "G4"], 2, 0.040, 3000],
  [24.8, 26.5, ["A3", "E4", "A4", "D5", "E5", "A4"], 1, 0.040, 3200],
 ],
 "pulse": [[10.2, 12.05, "D2", 0.12], [12.05, 13.9, "Bb1", 0.12], [13.9, 15.75, "F1", 0.12], [15.75, 17.55, "C2", 0.13],
           [17.6, 21.2, "Bb1", 0.085], [21.2, 24.75, "C2", 0.09]],
 "brass": [[10.20, 1.8, ["D2", "A2", "D3"], 0.30], [13.90, 1.8, ["F2", "C3", "F3"], 0.26], [15.75, 1.8, ["C2", "G2", "C3"], 0.30], [26.6, 2.6, ["D2", "A2", "F#3"], 0.12]],
 "drums": [[10.20, 17.55, 0.6, [[0, 1.0, 70], [1.5, 0.55, 82], [2, 0.8, 66], [3.5, 0.5, 90]], 0.42, 0.030],
           [18.05, 24.75, 0.6, [[0, 0.55, 74], [2, 0.45, 70]], 0.28, 0.020]],
 "bells": [[26.62, ["D5", "A5", "F#5", "C#6", "E6"], 0.028, 0.28], [28.85, ["A5", "F#6", "D6"], 0.03, 0.15]],
 "sfx": [
  ["impact", 0.05, 0.55, 0.15], ["whoosh", 0.7, 0.9, 1.4],
  ["whoosh_down", 1.8, 0.7, 0.7],
  ["click", 1.8 + (47 - 16) / 30 / 1.354, 0.9], ["click", 1.8 + (99 - 16) / 30 / 1.354, 0.9],
  ["whoosh_down", 1.8 + (104 - 16) / 30 / 1.354, 0.8, 1.2],
  ["whoosh", 5.05, 0.8, 0.9], ["tick", 5.35, 0.5], ["tick", 5.70, 0.5], ["tick", 6.05, 0.5], ["tick", 6.40, 0.5], ["tick", 6.75, 0.5],
  ["scan", 7.55, 0.8], ["click", 7.5 + G['w1_click_rel'], 0.8], ["shimmer", 9.0, 0.7],
  ["riser", 10.20, 1.0, 1.9], ["impact", 10.20, 1.35, 0.45],
  ["whoosh", 17.65, 0.9, 0.9], ["click", 17.6 + G['plan_click_rel'], 0.9], ["scan", 18.9, 0.9],
  ["scan", G['a_end_t'] + 0.05, 0.6],
  ["tick", 24.95, 0.5], ["tick", 25.35, 0.5],
  ["riser", 26.6, 0.35, 1.2], ["impact", 26.6, 0.55, 0.3], ["shimmer", 28.0, 0.35],
 ],
 "mech": [[m[0], round(m[1] - 0.50, 3)] + m[2:] for m in E['mech']],
}
json.dump(TL, open('timeline_v3.json', 'w'), indent=1)
for c in caps: print(c)
