import json
tok = json.load(open('audio/final_tokens.json'))
VO = {'s1': 0.10, 's2': 3.22, 's3': 9.20, 's4': 12.82, 's5': 15.95, 's5b': 21.30, 's6': 24.17, 's7': 25.37}
def ts(key, word_idx): return round(VO[key] + tok[key]['tokens'][word_idx][1], 3)
def end(key): return round(VO[key] + [t for t in tok[key]['tokens'] if t[0] not in '.,?!'][-1][2] + 0.18, 3)
CAP = [
 ("s1", 0, None, ["Where on Earth could we investigate landscapes like Mars?"]),
 ("s2", 0, ("s2", 6), ["PARALLAX X compares real Martian terrain"]),
 ("s2", 6, None, ["with 1,915 selected Earth windows."]),
 ("s3", 0, None, ["Five exploratory candidates emerge in Mongolia's Gobi."]),
 ("s4", 0, None, ["But our method failed its pre-registered validation."]),
 ("s5", 0, ("s5", 5), ["So Expedition Lab turns uncertainty"]),
 ("s5", 5, None, ["into testable rover field-experiment plans."]),
 ("s5b", 0, None, ["Some things, only fieldwork can measure."]),
 ("s6", 0, None, ["PARALLAX X."]),
 ("s7", 0, ("s7", 5), ["Similarity is not proof."]),
 ("s7", 5, None, ["Evidence comes first."]),
]
caps = []
for key, wi, until, lines in CAP:
    a = ts(key, wi) - 0.08
    b = (ts(*until) - 0.04) if until else end(key)
    caps.append({"in": round(a, 3), "out": round(b, 3), "lines": lines})
for c, n in zip(caps, caps[1:]): c['out'] = round(min(c['out'], n['in'] - 0.04), 3)
D = 29.30
TL = {
 "duration": D, "fade_in": 0.35, "fade_out": 0.45, "fade_out_depth": 1.0,
 "voice": VO,
 "segments": [
  {"name": "V1 film05 open", "type": "seq", "dir": "src/film05_open", "first": 6, "start": 0.0, "end": 2.30},
  {"name": "V2 select CTX", "type": "seq", "dir": "src/capture/A_select", "first": 0, "start": 2.30, "end": 7.30, "xin": 0.13,
   "zoom": [[0, 960, 540, 1.0], [5.0, 960, 540, 1.0]]},
  {"name": "V3 compare", "type": "seq", "dir": "src/capture/B_compare", "first": 42, "start": 7.30, "end": 12.80, "xin": 0.20,
   "zoom": [[0, 960, 540, 1.0], [3.0, 1010, 545, 1.035], [5.5, 1180, 600, 1.09]]},
  {"name": "V4 evidence FAIL", "type": "seq", "dir": "src/capture/C_evidence", "first": 8, "start": 12.80, "end": 15.75, "xin": 0.10},
  {"name": "V5 expedition lab", "type": "seq", "dir": "src/capture/D_lab", "first": 19, "start": 15.75, "end": 21.30, "xin": 0.13,
   "zoom": [[0, 960, 540, 1.0], [0.6, 960, 540, 1.0], [5.55, 830, 640, 1.11]]},
  {"name": "V6 FAILED stamp + resolution paradox", "type": "seq", "dir": "src/capture/C_evidence", "first": 262, "start": 21.30, "end": 24.10, "xin": 0.13,
   "zoom": [[0, 1080, 560, 1.20], [2.8, 1080, 560, 1.30]]},
  {"name": "V7 film05 logo", "type": "seq", "dir": "src/film05_logo", "first": 9, "start": 24.10, "end": 27.00, "xin": 0.12},
  {"name": "V8 end card", "type": "card", "start": 27.00, "end": 29.31, "xin": 0.5, "zoom": [[0, 960, 540, 1.0], [2.31, 960, 520, 1.05]]},
 ],
 "endcard_bg": "src/capture/B_compare/00100.jpg", "endcard_bg_box": [384, 150, 1440, 744],
 "masks": [{"in": 24.0, "out": 27.01, "y0": 655, "y1": 712, "color": [5, 4, 4]}],
 "notices": [
  {"in": 0.0, "out": 2.30, "x": 40, "y": 38, "size": 21, "text": "AI-GENERATED CONCEPT FOOTAGE  ·  BRAND FILM BY KHUSLEN (V01D-404)"},
  {"in": 24.05, "out": 27.0, "x": 40, "y": 38, "size": 21, "text": "AI-GENERATED CONCEPT FOOTAGE  ·  BRAND FILM BY KHUSLEN (V01D-404)"},
 ],
 "headlines": [
  {"in": 0.45, "out": 2.30, "x": 960, "y": 735, "align": "center", "text": "WHERE ON EARTH DOES MARS LIVE?", "size": 60, "track": 3.5, "alpha": 0.45},
  {"in": 2.75, "out": 7.15, "x": 60, "y": 262, "text": "REAL MARS TOPOGRAPHY", "sub": "MEDUSAE FOSSAE  ·  USGS CTX STEREO TERRAIN MODEL"},
  {"in": 7.55, "out": 10.15, "x": 912, "y": 772, "align": "center", "text": "1,915 DECLARED EARTH WINDOWS", "sub": "ONE MARS FINGERPRINT  ·  FIVE TERRAIN FEATURES  ·  30 M GRID", "accent_color": [106, 155, 173], "subcolor": [150, 196, 214]},
  {"in": 10.25, "out": 12.75, "x": 912, "y": 772, "align": "center", "text": "5 EXPLORATORY GOBI CANDIDATES", "sub": "G-1 TO G-5  ·  NOT CONFIRMED MARS ANALOGS", "accent_color": [106, 155, 173], "subcolor": [150, 196, 214]},
  {"in": 13.7, "out": 15.72, "x": 70, "y": 470, "text": "VALIDATION:", "text2": "FAILED", "size": 58, "sub": "SIMILARITY ≠ PROOF", "subsize": 27},
  {"in": 16.6, "out": 18.95, "x": 912, "y": 772, "align": "center", "text": "EXPEDITION LAB", "sub": "FROM UNCERTAINTY TO TESTABLE FIELD PLANS"},
  {"in": 19.05, "out": 21.2, "x": 990, "y": 772, "align": "center", "text": "PROPOSED, NOT PERFORMED", "sub": "WHEEL-MOBILITY PROTOCOL  ·  NO FIELD TEST YET"},
  {"in": 21.55, "out": 24.0, "x": 960, "y": 742, "align": "center", "text": "MEASURE WHAT THE DATA CANNOT", "size": 56, "sub": "SAME HIRISE SCARPS  ·  >15° SLOPES: 13.9% AT 4 M, 1.6% AT 180 M  ·  A SCALE EFFECT", "subsize": 22},
 ],
 "endtitles": [{"in": 25.0, "logo_in": 26.5, "logo_fade": 0.5, "logo_w": 1240, "logo_y": 512,
   "lines": [
    {"in": 25.62, "y": 742, "text": "SIMILARITY IS NOT PROOF.", "size": 46, "bold": True, "track": 6},
    {"in": 27.12, "y": 806, "text": "EVIDENCE COMES FIRST.", "size": 46, "bold": True, "track": 6, "color": [255, 150, 92]},
    {"in": 27.5, "y": 886, "text": "parallax-x-lyart.vercel.app", "size": 27, "track": 1.5, "color": [178, 186, 196]},
    {"in": 27.25, "y": 42, "text": "NASA SPACE APPS CHALLENGE 2026 ENTRY  ·  NOT AFFILIATED WITH OR ENDORSED BY NASA", "size": 20, "track": 2.2, "color": [150, 158, 168]},
    {"in": 27.25, "y": 74, "text": "Concept film: Khuslen (V01D-404), AI-generated  ·  Narration: Kokoro TTS (AI voice)  ·  Original score & SFX", "size": 20, "track": 0.6, "color": [150, 158, 168]},
   ]}],
 "captions": caps,
 # ---- audio ----
 "bpm": 96,
 "chords": [
  [0.0, 2.3, ["D3", "A3", "F4", "E5"], 0.25],
  [2.3, 5.0, ["D3", "A3", "F4", "C5", "E5"], 0.4],
  [5.0, 7.3, ["Bb2", "F3", "D4", "A4"], 0.45],
  [7.3, 10.1, ["F2", "C4", "F4", "A4", "C5"], 0.55],
  [10.1, 12.8, ["C3", "G3", "E4", "G4", "D5"], 0.62],
  [12.8, 16.0, ["G2", "D3", "Bb3", "D4"], 0.12],
  [16.0, 18.65, ["Bb2", "F3", "D4", "F4", "C5"], 0.5],
  [18.65, 21.3, ["C3", "G3", "E4", "G4", "E5"], 0.6],
  [21.3, 24.1, ["A2", "E3", "A3", "D4", "E4"], 0.66],
  [24.1, 29.3, ["D2", "A2", "F#3", "A3", "E4", "F#4", "C#5"], 0.55],
 ],
 "drone": [[0.0, 2.3, "D1", 0.30], [2.3, 12.8, "D2", 0.09], [12.8, 16.0, "G1", 0.15], [16.0, 18.65, "Bb1", 0.09], [18.65, 21.3, "C2", 0.09], [21.3, 24.1, "A1", 0.11], [24.1, 29.3, "D1", 0.22]],
 "arp": [
  [2.45, 5.0, ["D4", "A4", "F5", "A4", "E5", "A4"], 1, 0.045, 2200],
  [5.0, 7.3, ["Bb3", "F4", "D5", "F4", "A4", "F4"], 1, 0.045, 2400],
  [7.3, 10.1, ["F4", "C5", "A5", "C5", "F5", "C5"], 1, 0.05, 2800],
  [10.1, 12.6, ["C4", "G4", "E5", "G4", "D5", "G4"], 1, 0.05, 3000],
  [16.0, 18.65, ["Bb3", "F4", "D5", "F4", "C5", "F4"], 2, 0.042, 2600],
  [18.65, 21.3, ["C4", "G4", "E5", "G4", "E5", "G4"], 2, 0.046, 3200],
  [21.3, 23.95, ["A3", "E4", "A4", "D5", "E5", "A4"], 2, 0.05, 3800],
 ],
 "pulse": [[16.0, 18.65, "Bb1", 0.10], [18.65, 21.3, "C2", 0.11], [21.3, 23.95, "A1", 0.12]],
 "bells": [[24.12, ["D5", "A5", "F#5", "C#6", "E6"], 0.045, 0.32], [27.0, ["A5", "F#6", "D6"], 0.03, 0.45]],
 "sfx": [
  ["impact", 0.05, 0.55, 0.15],
  ["whoosh", 0.9, 0.9, 1.8],
  ["whoosh_down", 2.30, 0.7, 0.7],
  ["click", 2.30 + 47/30, 1.0],
  ["click", 2.30 + 99/30, 1.0],
  ["whoosh_down", 2.30 + 104/30, 0.8, 1.4],
  ["scan", 7.35, 1.0],
  ["shimmer", 10.25, 1.0],
  ["click", 12.80 + 19/30, 1.0],
  ["soft_low", 13.95, 1.0],
  ["tick", 14.2, 0.6], ["tick", 14.47, 0.5], ["tick", 14.74, 0.5],
  ["click", 15.75 + 15/30, 1.0],
  ["whoosh", 16.45, 0.5, 0.9],
  ["scan", 21.35, 0.8],
  ["riser", 24.08, 1.0, 2.6],
  ["impact", 24.10, 1.0, 0.35],
  ["shimmer", 26.6, 0.6],
 ],
}
json.dump(TL, open('timeline.json', 'w'), indent=1)
for c in caps: print(c)
