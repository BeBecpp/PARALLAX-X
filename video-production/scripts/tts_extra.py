import numpy as np, soundfile as sf
from kokoro import KPipeline
pipe = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
for v in ['af_heart','af_bella']:
    for key, text in [("s5b", "Some things, only fieldwork can measure.")]:
        a = np.concatenate([np.asarray(x[2]) for x in pipe(text, voice=v, speed=1.1)])
        sf.write(f"audio/tts/{v}_{key}_1.1.wav", a, 24000); print(v, key, len(a)/24000)
