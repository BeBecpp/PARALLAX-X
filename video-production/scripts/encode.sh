#!/bin/bash
set -eo pipefail
cd "$(dirname "$0")/.."
TLF=${1:-timeline.json}; OUT=${2:-out/PARALLAX_X_SPACE_APPS_2026_DEMO_FINAL.mp4}; AUD=${3:-out/PARALLAX_X_DEMO_AUDIO_MIX.wav}
python3 scripts/compose.py "$TLF" pipe | ffmpeg -v error -y \
  -f rawvideo -pix_fmt rgb24 -s 1920x1080 -r 30 -i - \
  -i "$AUD" \
  -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 15 -profile:v high -level 4.1 -pix_fmt yuv420p -tune film \
  -x264-params "keyint=60:min-keyint=30" -r 30 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -vf "scale=in_range=full:out_range=tv:out_color_matrix=bt709" \
  -c:a aac -b:a 256k -ar 48000 -ac 2 \
  -t 29.300 -movflags +faststart \
  -metadata title="PARALLAX X — NASA Space Apps Challenge 2026 demo (29 s)" \
  -metadata artist="PARALLAX X team" \
  -metadata comment="Real screen capture of https://parallax-x-lyart.vercel.app (Chromium, deterministic 30 fps). Opening and logo shots: AI-generated concept film by Khuslen (V01D-404), watermarked on screen. Narration: AI-generated voice (Kokoro-82M TTS, voice af_heart, Apache-2.0). Original synthesized score and SFX. Not affiliated with or endorsed by NASA." \
  -metadata description="Pre-registered validation FAILED; Gobi G-1..G-5 are exploratory candidates, not confirmed Mars analogs. Expedition Lab outputs proposed field-test protocols; no field test was performed." \
  "$OUT"
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,sample_rate,channels,bit_rate -of default=nw=1 "$OUT"
