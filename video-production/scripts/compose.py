"""Deterministic compositor: timeline.json -> raw RGB frames on stdout (1920x1080@30)."""
import json, sys, os, math, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W, H, FPS = 1920, 1080, 30
TL = json.load(open(sys.argv[1])); MODE = sys.argv[2] if len(sys.argv) > 2 else 'pipe'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FD = '/usr/share/fonts/opentype/inter/'
def font(name, size): return ImageFont.truetype(FD + name, size)
F_HEAD = lambda s: font('InterDisplay-Bold.otf', s)
F_SUB = lambda s: font('Inter-SemiBold.otf', s)
F_CAP = lambda s: font('Inter-SemiBold.otf', s)
F_MED = lambda s: font('Inter-Medium.otf', s)
COPPER = (232, 120, 61); COPPER_L = (255, 160, 110); INK = (241, 244, 247); MUTED = (170, 178, 188); BLUE = (106, 155, 173)
NF = int(round(TL['duration'] * FPS))

def ease(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
def eio(x): x = min(1, max(0, x)); return 4*x*x*x if x < .5 else 1 - (-2*x+2)**3/2
_cache = {}
def load(path):
    if path not in _cache:
        if len(_cache) > 40: _cache.clear()
        _cache[path] = Image.open(path).convert('RGB')
    return _cache[path]

def interp_kf(kfs, t):
    # kfs: [[t, cx, cy, scale], ...] (t relative to segment start)
    if not kfs: return (960, 540, 1.0)
    if t <= kfs[0][0]: return tuple(kfs[0][1:])
    for a, b in zip(kfs, kfs[1:]):
        if a[0] <= t <= b[0]:
            u = eio((t - a[0]) / max(1e-6, b[0] - a[0]))
            return tuple(a[i] + (b[i] - a[i]) * u for i in (1, 2, 3))
    return tuple(kfs[-1][1:])

def seg_frame(seg, t):
    rel = t - seg['start']
    if seg['type'] == 'seq':
        d = os.path.join(ROOT, seg['dir']); idx = seg['first'] + int(round(rel * FPS * seg.get('speed', 1.0)))
        idx = max(0, min(idx, seg['_n'] - 1))
        im = load(os.path.join(d, f'{idx:05d}.jpg'))
    elif seg['type'] == 'card':
        im = endcard_bg()
    cx, cy, s = interp_kf(seg.get('zoom'), rel)
    if abs(s - 1) > 1e-4 or cx != 960 or cy != 540:
        cw, ch = W / s, H / s
        x0 = min(max(0, cx - cw / 2), W - cw); y0 = min(max(0, cy - ch / 2), H - ch)
        im = im.resize((W, H), Image.LANCZOS, box=(x0, y0, x0 + cw, y0 + ch))
    return im

_bg = None
def endcard_bg():
    global _bg
    if _bg is None:
        src = load(os.path.join(ROOT, TL['endcard_bg']))
        im = src.resize((W, H), Image.LANCZOS, box=tuple(TL['endcard_bg_box'])).filter(ImageFilter.GaussianBlur(18))
        a = np.asarray(im).astype(np.float32) * 0.30
        yy, xx = np.mgrid[0:H, 0:W]; r = np.sqrt(((xx - 960) / 1100) ** 2 + ((yy - 540) / 700) ** 2)
        a *= np.clip(1.15 - 0.75 * r, 0.15, 1)[..., None]
        a = a * 0.85 + np.array([10, 11, 14]) * 0.15
        _bg = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return _bg

def tracked(draw, xy, text, fnt, fill, track=0.0, anchor_center=False):
    widths = [draw.textlength(c, font=fnt) for c in text]
    total = sum(widths) + track * (len(text) - 1)
    x, y = xy
    if anchor_center: x -= total / 2
    for c, w in zip(text, widths):
        draw.text((x, y), c, font=fnt, fill=fill); x += w + track
    return total

def text_w(draw, text, fnt, track): return sum(draw.textlength(c, font=fnt) for c in text) + track * (len(text) - 1)

def glass(base, box, alpha=0.62, radius=14, blur=14):
    x0, y0, x1, y1 = [int(v) for v in box]
    region = base.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur(blur))
    dark = Image.new('RGB', region.size, (8, 10, 13))
    region = Image.blend(region, dark, alpha)
    mask = Image.new('L', region.size, 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, region.size[0] - 1, region.size[1] - 1), radius, fill=255)
    base.paste(region, (x0, y0), mask)

def headline(base, ov, t):
    ov = {k: (tuple(v) if isinstance(v, list) else v) for k, v in ov.items()}
    a = ov['in'] ; b = ov['out']
    fi = ease((t - a) / 0.35); fo = 1 - ease((t - (b - 0.3)) / 0.3); op = min(fi, fo)
    if op <= 0: return
    layer = base.copy(); d = ImageDraw.Draw(layer)
    hf = F_HEAD(ov.get('size', 64)); sf_ = F_SUB(ov.get('subsize', 25))
    tr = ov.get('track', 3.0)
    t2 = ov.get('text2'); lh = int(ov.get('size', 64) * 1.04)
    tw = max(text_w(d, ov['text'], hf, tr), text_w(d, t2, hf, tr) if t2 else 0); sw = text_w(d, ov.get('sub', ''), sf_, 2.2) if ov.get('sub') else 0
    padx, pady = 34, 22
    bw = max(tw, sw) + padx * 2 + 14; bh = pady * 2 + ov.get('size', 64) * 1.0 + (lh if t2 else 0) + (ov.get('subsize', 25) + 16 if ov.get('sub') else 0)
    x, y = ov['x'], ov['y']
    if ov.get('align') == 'center': x = x - bw / 2
    dy = (1 - fi) * 14
    y = y + dy
    glass(layer, (x, y, x + bw, y + bh), alpha=ov.get('alpha', 0.58))
    d = ImageDraw.Draw(layer)
    d.rectangle((x, y + 14, x + 5, y + bh - 14), fill=ov.get('accent_color', COPPER))
    tracked(d, (x + padx + 8, y + pady - 6), ov['text'], hf, ov.get('color', INK), tr)
    if t2: tracked(d, (x + padx + 8, y + pady - 6 + lh), t2, hf, ov.get('color2', COPPER_L), tr)
    if ov.get('sub'):
        tracked(d, (x + padx + 10, y + pady + ov.get('size', 64) + 4 + (lh if t2 else 0)), ov['sub'], sf_, ov.get('subcolor', COPPER_L) if not t2 else INK, 2.2)
    base.paste(Image.blend(base, layer, op))

def caption(base, c, t):
    fi = ease((t - c['in']) / 0.12); fo = 1 - ease((t - (c['out'] - 0.12)) / 0.12); op = min(fi, fo)
    if op <= 0: return
    layer = base.copy(); d = ImageDraw.Draw(layer); f = F_CAP(38)
    lines = c['lines']; lh = 50
    ws = [d.textlength(l, font=f) for l in lines]; bw = max(ws) + 56; bh = lh * len(lines) + 26
    x0 = (W - bw) / 2; y0 = H - 46 - bh
    glass(layer, (x0, y0, x0 + bw, y0 + bh), alpha=0.74, radius=12, blur=10)
    d = ImageDraw.Draw(layer)
    for i, (l, w) in enumerate(zip(lines, ws)):
        d.text(((W - w) / 2, y0 + 11 + i * lh), l, font=f, fill=(250, 251, 252))
    base.paste(Image.blend(base, layer, op))

def notice(base, n, t):
    if not (n['in'] <= t < n['out']): return
    d = ImageDraw.Draw(base); f = F_SUB(n.get('size', 22))
    txt = n['text']; w = text_w(d, txt, f, 1.6)
    x, y = n['x'], n['y']
    if n.get('align') == 'right': x = x - w - 28
    d.rounded_rectangle((x, y, x + w + 28, y + n.get('size', 22) + 18), 6, fill=(0, 0, 0), outline=(120, 126, 134), width=1)
    tracked(d, (x + 14, y + 7), txt, f, (236, 238, 241), 1.6)

def mask_zone(base, z, t):
    if not (z['in'] <= t < z['out']): return
    a = np.asarray(base).astype(np.float32)
    y0, y1 = z['y0'], z['y1']; ramp = np.clip((np.arange(H) - y0) / (y1 - y0), 0, 1)[:, None, None]
    a = a * (1 - ramp) + np.array(z.get('color', [6, 6, 7]))[None, None, :] * ramp
    base.paste(Image.fromarray(a.astype(np.uint8)))

_wm = None
def endtitle(base, e, t):
    global _wm
    if t < e['in']: return
    d = ImageDraw.Draw(base)
    if e.get('logo_in') is not None and t >= e['logo_in']:
        if _wm is None:
            wm = Image.open(os.path.join(ROOT, 'src/stills/wordmark.png')).convert('RGBA'); wm = wm.crop(wm.getbbox())
            ww = e['logo_w']; _wm = wm.resize((ww, int(wm.size[1] * ww / wm.size[0])), Image.LANCZOS)
        op = ease((t - e['logo_in']) / e.get('logo_fade', 0.5))
        lw = _wm.copy(); al = lw.split()[3].point(lambda v: int(v * op)); lw.putalpha(al)
        base.paste(lw, (int((W - lw.size[0]) / 2), int(e['logo_y'] - lw.size[1] / 2)), lw)
    for line in e['lines']:
        op = ease((t - line['in']) / 0.45)
        if op <= 0: continue
        f = (F_HEAD if line.get('bold') else F_SUB)(line['size'])
        col = tuple(int(c * op + 8 * (1 - op)) for c in tuple(line.get('color', INK)))
        y = line['y'] + (1 - op) * 10
        tracked(d, (960, y), line['text'], f, col, line.get('track', 2), anchor_center=True)

segs = TL['segments']
for s in segs:
    if s['type'] == 'seq': s['_n'] = len([f for f in os.listdir(os.path.join(ROOT, s['dir'])) if f.endswith('.jpg')])

def render(f):
    t = f / FPS
    act = [s for s in segs if s['start'] - s.get('xin', 0) <= t < s['end']]
    act.sort(key=lambda s: s['start'])
    im = seg_frame(act[0], t)
    for s in act[1:]:
        x = s.get('xin', 0)
        u = ease((t - (s['start'] - x)) / x) if x > 0 else 1.0
        im = Image.blend(im, seg_frame(s, t), u)
    im = im.copy()
    for z in TL.get('masks', []): mask_zone(im, z, t)
    if TL.get('fade_in') and t < TL['fade_in']: im = Image.blend(Image.new('RGB', (W, H)), im, ease(t / TL['fade_in']))
    for e in TL.get('endtitles', []): endtitle(im, e, t)
    for ov in TL.get('headlines', []):
        if ov['in'] - 0.1 <= t <= ov['out'] + 0.1: headline(im, ov, t)
    for n in TL.get('notices', []): notice(im, n, t)
    for c in TL.get('captions', []):
        if c['in'] <= t <= c['out']: caption(im, c, t)
    fo = TL.get('fade_out')
    if fo and t > TL['duration'] - fo: im = Image.blend(im, Image.new('RGB', (W, H)), ease((t - (TL['duration'] - fo)) / fo) * TL.get('fade_out_depth', 1.0))
    return im

if MODE == 'pipe':
    out = sys.stdout.buffer
    for f in range(NF): out.write(render(f).tobytes())
else:  # stills: comma list of seconds
    for s in MODE.split(','):
        render(int(round(float(s) * FPS))).save(os.path.join(ROOT, 'frames', f'still_{float(s):05.2f}.jpg'), quality=90)
