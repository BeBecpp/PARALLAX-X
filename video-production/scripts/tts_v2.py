import json, sys, numpy as np, soundfile as sf
from kokoro import KPipeline
V = sys.argv[1]; SPEED = float(sys.argv[2]); OUT = sys.argv[3]
LINES = [
 ("n1", "Where on Earth should we prepare for Mars?"),
 ("n2", "Parallax Ex compares real Martian terrain with nineteen hundred and fifteen Earth windows,"),
 ("n3", "highlighting five exploratory candidates in Mongolia's Gobi."),
 ("n4", "Now, meet the rover."),
 ("n5", "Explore high-resolution Martian terrain,"),
 ("n6", "then open Expedition Lab to plan wheel-mobility field tests,"),
 ("n7", "showing what scientists still need to measure."),
 ("n8", "Parallax Ex."),
 ("n9", "From Mars data, to real research."),
]
pipe = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
meta = {}
for key, text in LINES:
    audio, toks, off = [], [], 0.0
    for res in pipe(text, voice=V, speed=SPEED):
        a = np.asarray(res.audio); audio.append(a)
        for tk in (res.tokens or []):
            if tk.start_ts is not None: toks.append([tk.text, off + tk.start_ts, off + (tk.end_ts or tk.start_ts)])
        off += len(a) / 24000
    a = np.concatenate(audio)
    env = np.convolve(np.abs(a), np.ones(240) / 240, 'same'); idx = np.where(env > max(1e-3, env.max() * 0.02))[0]
    sf.write(f"{OUT}/{key}.wav", a, 24000)
    meta[key] = {"text": text, "dur": len(a) / 24000, "lead": idx[0] / 24000, "speech_end": idx[-1] / 24000, "tokens": toks}
    print(V, key, 'speech %.2f' % ((idx[-1] - idx[0]) / 24000), 'lead %.2f' % (idx[0] / 24000))
json.dump(meta, open(f"{OUT}/tokens.json", "w"), indent=1)
