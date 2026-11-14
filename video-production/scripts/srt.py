import json
TL = json.load(open('timeline.json'))
def f(t): ms = int(round(t * 1000)); return '%02d:%02d:%02d,%03d' % (ms // 3600000, ms // 60000 % 60, ms // 1000 % 60, ms % 1000)
with open('out/PARALLAX_X_DEMO_CAPTIONS.srt', 'w') as o:
    for i, c in enumerate(TL['captions'], 1): o.write(f"{i}\n{f(c['in'])} --> {f(c['out'])}\n" + "\n".join(c['lines']) + "\n\n")
print(open('out/PARALLAX_X_DEMO_CAPTIONS.srt').read())
