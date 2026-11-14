import sys, glob, numpy as np, soundfile as sf
for fn in sorted(glob.glob(sys.argv[1])):
    a, sr = sf.read(fn)
    env = np.convolve(np.abs(a), np.ones(240)/240, 'same')
    thr = max(1e-3, env.max()*0.02)
    idx = np.where(env > thr)[0]
    s, e = idx[0], idx[-1]
    print(fn.split('/')[-1], 'total %.2f speech %.2f lead %.2f tail %.2f peak %.2f' % (len(a)/sr, (e-s)/sr, s/sr, (len(a)-e)/sr, np.abs(a).max()))
