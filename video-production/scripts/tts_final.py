import json, numpy as np, soundfile as sf
from kokoro import KPipeline
V, SPEED = 'af_heart', 1.1
LINES = [
 ("s1", "Where on Earth could we investigate landscapes like Mars?"),
 ("s2", "Parallax Ex compares real Martian terrain with nineteen hundred and fifteen selected Earth windows."),
 ("s3", "Five exploratory candidates emerge in Mongolia's Gobi."),
 ("s4", "But our method failed its pre-registered validation."),
 ("s5", "So Expedition Lab turns uncertainty into testable rover field-experiment plans."),
 ("s5b", "Some things, only fieldwork can measure."),
 ("s6", "Parallax Ex."),
 ("s7", "Similarity is not proof. Evidence comes first."),
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
    a = np.concatenate(audio); sf.write(f"audio/final_{key}.wav", a, 24000)
    meta[key] = {"text": text, "dur": len(a) / 24000, "tokens": toks}
    print(key, round(len(a)/24000, 2), [(t[0], round(t[1], 2)) for t in toks])
json.dump(meta, open("audio/final_tokens.json", "w"), indent=1)
