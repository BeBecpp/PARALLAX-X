"""V2 'rover-first' edit decision list -> timeline_v2.json"""
import json, sys
VOICE = 'af_heart'; VDIR = f'audio/v2/{VOICE}'
tok = json.load(open(f'{VDIR}/tokens.json'))
E = json.load(open('e_rover_edit.json')) if len(sys.argv) < 2 else json.load(open(sys.argv[1]))
ONSET = {'n1': 0.31, 'n2': 2.25, 'n3': 7.32, 'n4': 10.88, 'n5': 13.05, 'n6': 18.80, 'n7': 22.42, 'n8': 25.35, 'n9': 26.62}
VO = {k: round(max(0.0, v - tok[k]['lead']), 3) for k, v in ONSET.items()}
def at(key, i): return VO[key] + tok[key]['tokens'][i][1]
def speech_end(key): return VO[key] + tok[key]['speech_end']
CAPS = [("n1", 0, None, "Where on Earth should we prepare for Mars?"),
        ("n2", 0, ("n2", 6), "PARALLAX X compares real Martian terrain"),
        ("n2", 6, None, "with 1,915 Earth windows,"),
        ("n3", 0, None, "highlighting five exploratory candidates in Mongolia's Gobi."),
        ("n4", 0, None, "Now, meet the rover."),
        ("n5", 0, None, "Explore high-resolution Martian terrain,"),
        ("n6", 0, None, "then open Expedition Lab to plan wheel-mobility field tests,"),
        ("n7", 0, None, "showing what scientists still need to measure."),
        ("n8", 0, None, "PARALLAX X."),
        ("n9", 0, None, "From Mars data, to real research.")]
caps = []
for key, wi, until, text in CAPS:
    a = at(key, wi) - 0.08; b = (at(*until) - 0.04) if until else speech_end(key) + 0.25
    caps.append({"in": round(a, 3), "out": round(b, 3), "lines": [text]})
for c, n in zip(caps, caps[1:]): c['out'] = round(min(c['out'], n['in'] - 0.04), 3)
D = 29.30
AI = "AI-GENERATED CONCEPT FOOTAGE  ·  BRAND FILM BY KHUSLEN (V01D-404)"
TL = {
 "duration": D, "fade_in": 0.30, "fade_out": 0.40, "fade_out_depth": 1.0, "stem_prefix": "v2_",
 "voice_dir": VDIR, "voice": VO,
 "segments": [
  {"name": "V1 film05 open", "type": "seq", "dir": "src/film05_open", "first": 6, "start": 0.0, "end": 2.00},
  {"name": "V2 select CTX (1.45x)", "type": "seq", "dir": "src/capture/A_select", "first": 16, "speed": 1.45, "start": 2.00, "end": 5.00, "xin": 0.13},
  {"name": "V3 compare Mars-Earth", "type": "seq", "dir": "src/capture/B_compare", "first": 20, "start": 5.00, "end": 10.70, "xin": 0.17,
   "zoom": [[0, 1150, 430, 1.30], [5.7, 1175, 470, 1.34]]},
  dict({"name": "V4 rover (real Simulate, HiRISE)", "type": "seq", "dir": "src/capture/E_rover", "start": 10.70, "end": 18.50, "xin": 0.10}, **E['seg']),
  {"name": "V5 expedition lab", "type": "seq", "dir": "src/capture/D_lab", "first": 0, "start": 18.50, "end": 25.00, "xin": 0.17,
   "zoom": [[0, 1150, 430, 1.30], [1.0, 960, 540, 1.0], [1.4, 960, 540, 1.0], [2.6, 1500, 430, 1.36], [3.5, 1500, 450, 1.38], [4.6, 430, 780, 1.45], [6.5, 425, 790, 1.50]]},
  {"name": "V6 film05 logo", "type": "seq", "dir": "src/film05_logo", "first": 12, "start": 25.00, "end": 27.10, "xin": 0.12},
  {"name": "V7 end card", "type": "card", "start": 27.10, "end": 29.31, "xin": 0.5, "zoom": [[0, 960, 540, 1.0], [2.21, 960, 520, 1.05]]},
 ],
 "endcard_bg": "src/capture/B_compare/00100.jpg", "endcard_bg_box": [384, 150, 1440, 744],
 "masks": [{"in": 24.9, "out": 27.11, "y0": 655, "y1": 712, "color": [5, 4, 4]}],
 "notices": [
  {"in": 0.0, "out": 2.00, "x": 40, "y": 38, "size": 21, "text": AI},
  {"in": 10.80, "out": 18.45, "x": 48, "y": 44, "size": 21, "text": "ILLUSTRATIVE HiRISE TERRAIN TRAVERSE  ·  NOT MOBILITY PHYSICS"},
  {"in": 24.95, "out": 27.1, "x": 40, "y": 38, "size": 21, "text": AI},
 ],
 "headlines": [
  {"in": 0.35, "out": 2.00, "x": 960, "y": 735, "align": "center", "text": "MARS IS THE STARTING POINT.", "size": 60, "track": 3.5, "alpha": 0.45},
  {"in": 2.25, "out": 4.95, "x": 60, "y": 262, "text": "EXPLORE REAL MARTIAN TERRAIN", "sub": "MEDUSAE FOSSAE  ·  USGS CTX STEREO TERRAIN MODEL"},
  {"in": 5.25, "out": 7.75, "x": 640, "y": 760, "align": "center", "text": "1,915 EARTH WINDOWS", "size": 66, "sub": "ONE MARS TERRAIN FINGERPRINT  ·  COMMON 30 M GRID", "accent_color": [106, 155, 173], "subcolor": [150, 196, 214]},
  {"in": 7.85, "out": 10.62, "x": 640, "y": 760, "align": "center", "text": "5 EXPLORATORY GOBI CANDIDATES", "size": 62, "sub": "EXPLORATORY  —  NOT CONFIRMED GEOLOGICAL ANALOGS", "accent_color": [106, 155, 173], "subcolor": [150, 196, 214]},
  {"in": E.get('title_in', 12.3), "out": E.get('title_out', 15.4), "x": 1860, "y": 104, "align": "right", "text": "THE EXPEDITION ROVER", "size": 58, "sub": "3D MODEL NASA/JPL-CALTECH  ·  ON MEASURED HiRISE TERRAIN", "subsize": 23},
  {"in": 19.45, "out": 22.05, "x": 60, "y": 112, "text": "DESIGN THE NEXT", "text2": "ROVER FIELD TEST", "size": 60, "sub": "PROPOSED PROTOCOL  ·  NO FIELD TEST PERFORMED", "subsize": 22},
  {"in": 22.20, "out": 24.92, "x": 1860, "y": 112, "align": "right", "text": "COMPARE  →  PLAN  →  MEASURE", "size": 54, "sub": "PROPOSED PROTOCOL  ·  NO FIELD TEST PERFORMED", "subsize": 22, "subcolor": [255, 160, 110]},
 ],
 "endtitles": [{"in": 25.0, "logo_in": 26.6, "logo_fade": 0.5, "logo_w": 1240, "logo_y": 500,
   "lines": [
    {"in": 27.05, "y": 732, "text": "FROM MARS TERRAIN TO ROVER FIELD TESTS.", "size": 46, "bold": True, "track": 5, "color": [255, 150, 92]},
    {"in": 27.30, "y": 812, "text": "parallax-x-lyart.vercel.app", "size": 36, "track": 2.0, "color": [236, 239, 243]},
    {"in": 27.40, "y": 46, "text": "NASA SPACE APPS CHALLENGE 2026 ENTRY  ·  NOT AFFILIATED WITH OR ENDORSED BY NASA", "size": 19, "track": 2.2, "color": [150, 158, 168]},
    {"in": 27.40, "y": 76, "text": "AI voice: Kokoro TTS  ·  Concept film: Khuslen (V01D-404), AI-generated  ·  Rover model: NASA/JPL-Caltech  ·  Original score", "size": 19, "track": 0.6, "color": [150, 158, 168]},
   ]}],
 "captions": caps,
 # ---------------- audio ----------------
 "bpm": 100, "lufs": -14.5, "duck_db": -17.0, "music_gain": 0.74, "sfx_gain": 0.9,
 "chords": [
  [0.0, 2.0, ["D3", "A3", "F4", "E5"], 0.30],
  [2.0, 3.5, ["D3", "A3", "F4", "C5", "E5"], 0.42],
  [3.5, 5.0, ["Bb2", "F3", "D4", "A4"], 0.48],
  [5.0, 7.85, ["F2", "C4", "F4", "A4", "C5", "E5"], 0.62],
  [7.85, 9.6, ["C3", "G3", "E4", "G4", "D5"], 0.64],
  [9.6, 10.7, ["A2", "E3", "A3", "D4", "E4"], 0.70],
  [10.7, 12.65, ["D2", "A2", "D3", "F3", "A3", "D4", "F4"], 0.78],
  [12.65, 14.6, ["Bb1", "F2", "Bb2", "D3", "F3", "D4"], 0.74],
  [14.6, 16.55, ["F2", "C3", "F3", "A3", "C4", "F4"], 0.80],
  [16.55, 18.5, ["C2", "G2", "C3", "E3", "G3", "E4"], 0.84],
  [18.5, 20.1, ["Bb2", "F3", "D4", "F4", "C5"], 0.55],
  [20.1, 21.7, ["F2", "C4", "F4", "A4", "C5"], 0.58],
  [21.7, 23.3, ["C3", "G3", "E4", "G4", "E5"], 0.6],
  [23.3, 25.0, ["A2", "E3", "A3", "D4", "E4"], 0.66],
  [25.0, 29.3, ["D2", "A2", "F#3", "A3", "E4", "F#4", "C#5"], 0.6],
 ],
 "drone": [[0.0, 2.0, "D1", 0.30], [2.0, 10.7, "D2", 0.09], [10.7, 18.5, "D1", 0.16], [18.5, 25.0, "Bb1", 0.08], [25.0, 29.3, "D1", 0.22]],
 "arp": [
  [2.1, 5.0, ["D4", "A4", "F5", "A4", "E5", "A4"], 1, 0.042, 2300],
  [5.0, 7.85, ["F4", "C5", "A5", "C5", "F5", "C5"], 1, 0.048, 2900],
  [7.85, 10.55, ["C4", "G4", "E5", "G4", "D5", "G4"], 2, 0.042, 3100],
  [10.7, 12.65, ["D4", "A4", "D5", "F5", "A4", "D5"], 2, 0.050, 3400],
  [12.65, 14.6, ["Bb3", "F4", "Bb4", "D5", "F4", "Bb4"], 2, 0.050, 3400],
  [14.6, 16.55, ["F4", "C5", "F5", "A5", "C5", "F5"], 2, 0.054, 3800],
  [16.55, 18.4, ["C4", "G4", "C5", "E5", "G4", "C5"], 2, 0.058, 4200],
  [18.5, 21.7, ["Bb3", "F4", "D5", "F4", "C5", "F4"], 2, 0.040, 2800],
  [21.7, 24.85, ["C4", "G4", "E5", "G4", "E5", "G4"], 2, 0.044, 3200],
 ],
 "pulse": [[10.7, 12.65, "D2", 0.12], [12.65, 14.6, "Bb1", 0.12], [14.6, 16.55, "F1", 0.12], [16.55, 18.45, "C2", 0.13],
           [18.5, 21.7, "Bb1", 0.09], [21.7, 24.85, "C2", 0.10]],
 "brass": [[10.70, 1.9, ["D2", "A2", "D3"], 0.30], [14.60, 1.9, ["F2", "C3", "F3"], 0.26], [16.55, 1.9, ["C2", "G2", "C3"], 0.30], [25.0, 3.4, ["D2", "A2", "F#3"], 0.22]],
 "drums": [[10.70, 18.45, 0.6, [[0, 1.0, 70], [1.5, 0.55, 82], [2, 0.8, 66], [3.5, 0.5, 90]], 0.42, 0.030],
           [18.95, 24.85, 0.6, [[0, 0.6, 74], [2, 0.5, 70]], 0.30, 0.022]],
 "bells": [[25.02, ["D5", "A5", "F#5", "C#6", "E6"], 0.045, 0.30], [27.1, ["A5", "F#6", "D6"], 0.03, 0.45]],
 "sfx": [
  ["impact", 0.05, 0.55, 0.15], ["whoosh", 0.8, 0.9, 1.6],
  ["whoosh_down", 2.0, 0.7, 0.7],
  ["click", 2.0 + (47 - 16) / 30 / 1.45, 0.9], ["click", 2.0 + (99 - 16) / 30 / 1.45, 0.9],
  ["whoosh_down", 2.0 + (104 - 16) / 30 / 1.45, 0.8, 1.2],
  ["whoosh", 5.05, 0.9, 1.0], ["scan", 5.15, 0.8], ["shimmer", 7.9, 0.9],
  ["riser", 10.70, 1.0, 1.9], ["impact", 10.70, 1.35, 0.45],
  ["whoosh", 18.55, 0.9, 0.9], ["click", 18.5 + 33 / 30, 0.9], ["scan", 19.85, 1.0],
  ["tick", 22.9, 0.5], ["tick", 23.2, 0.45], ["tick", 23.5, 0.45],
  ["riser", 25.0, 0.8, 1.6], ["impact", 25.0, 1.0, 0.35], ["shimmer", 27.0, 0.55],
 ],
 "mech": E.get('mech', []),
}
json.dump(TL, open('timeline_v2.json', 'w'), indent=1)
for c in caps: print(c)
