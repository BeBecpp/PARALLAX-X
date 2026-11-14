import sys
from faster_whisper import WhisperModel
m = WhisperModel(sys.argv[2] if len(sys.argv) > 2 else 'small.en', device='cpu', compute_type='int8')
import soundfile as sf, numpy as np
from scipy.signal import resample_poly
a, sr = sf.read(sys.argv[1]); a = a.mean(1) if a.ndim > 1 else a
from math import gcd
g = gcd(16000, sr); a = resample_poly(a, 16000 // g, sr // g).astype(np.float32)
segs, info = m.transcribe(a, beam_size=5, word_timestamps=False, vad_filter=False)
for s in segs: print('%6.2f-%6.2f %s' % (s.start, s.end, s.text))
