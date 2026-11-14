import sys, json, numpy as np, soundfile as sf
from kokoro import KPipeline
voices = sys.argv[1].split(',')
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
LINES = [
 ("s1", "Where on Earth could we investigate landscapes like Mars?"),
 ("s2", "Parallax Ex compares real Martian terrain with nineteen hundred and fifteen selected Earth windows."),
 ("s3", "Five exploratory candidates emerge in Mongolia's Gobi."),
 ("s4", "But our method failed its pre-registered validation."),
 ("s5", "So Expedition Lab turns uncertainty into testable rover field-experiment plans."),
 ("s6", "Parallax Ex."),
 ("s7", "Similarity is not proof. Evidence comes first."),
]
pipe = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
meta = {}
for v in voices:
    for key, text in LINES:
        chunks = []; phon = []
        for gs, ps, audio in pipe(text, voice=v, speed=speed):
            chunks.append(np.asarray(audio)); phon.append(ps)
        a = np.concatenate(chunks)
        fn = f"audio/tts/{v}_{key}_{speed}.wav"
        sf.write(fn, a, 24000)
        meta[f"{v}_{key}"] = {"text": text, "phonemes": " ".join(phon), "dur": len(a)/24000}
        print(v, key, round(len(a)/24000, 2), " ".join(phon))
json.dump(meta, open(f"audio/tts/meta_{'_'.join(voices)}_{speed}.json", "w"), indent=1)
