import json, sys, numpy as np, soundfile as sf
from kokoro import KPipeline
V = sys.argv[1]; SPEED = float(sys.argv[2]); OUT = sys.argv[3]
LINES = [
 ("m1", "What makes an Earth landscape useful for Mars exploration?"),
 ("m2", "Parallax Ex compares five terrain features across nineteen hundred and fifteen Earth windows, using Wasserstein distance."),
 ("m3", "Then watch our six-wheel rover move across high-resolution Martian terrain."),
 ("m3b", "An illustration, not physics."),
 ("m4", "Expedition Lab designs field tests for wheel slip, sinkage, and energy."),
 ("m5", "Similarity is a starting point."),
 ("m6", "Evidence comes first."),
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
