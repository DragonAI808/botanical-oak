#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# add-clip.sh — take a freshly generated clip and make it web-ready.
#
#   ./tools/add-clip.sh <input-video> <slug> [poster-seconds]
#
#   e.g.  ./tools/add-clip.sh ~/Downloads/higgsfield-out.mp4 ugc3 8.5
#
# Produces:
#   assets/video/<slug>.mp4        720px wide, H.264 + stereo AAC, faststart
#   assets/img/<slug>-poster.jpg   still frame for the card before it plays
#
# Why this exists: Higgsfield's Seedance models output HEVC/H.265, which most
# browsers refuse to decode — the clip looks broken or silent on the site. This
# always re-encodes to H.264 + AAC so that can't happen, and warns you when the
# source was HEVC so the cause is obvious.
# ---------------------------------------------------------------------------
set -euo pipefail

IN="${1:-}"; SLUG="${2:-}"; AT="${3:-4}"

if [ -z "$IN" ] || [ -z "$SLUG" ]; then
  echo "usage: $0 <input-video> <slug> [poster-seconds]" >&2
  exit 1
fi
[ -f "$IN" ] || { echo "error: no such file: $IN" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_V="$ROOT/assets/video/$SLUG.mp4"
OUT_P="$ROOT/assets/img/$SLUG-poster.jpg"
mkdir -p "$ROOT/assets/video" "$ROOT/assets/img"

probe() { ffprobe -v error -select_streams "$1" -show_entries "stream=$2" -of csv=p=0 "$IN" 2>/dev/null | head -1; }

VCODEC="$(probe v:0 codec_name)"
ACODEC="$(probe a:0 codec_name)"
DIMS="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$IN")"
DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN" | cut -d. -f1)"
SIZE_IN="$(du -h "$IN" | cut -f1)"

echo "source : $DIMS  ${DUR}s  video=$VCODEC  audio=${ACODEC:-none}  $SIZE_IN"
case "$VCODEC" in
  hevc|h265) echo "         ^ HEVC source — browsers can't play this directly. Re-encoding (this is the fix)." ;;
esac

# 720px wide is plenty: the clip renders in a ~300px card, and the phone frames
# on the site never exceed 360 CSS px.
if [ -n "$ACODEC" ]; then
  AUDIO_ARGS=(-c:a aac -b:a 96k -ac 2)
else
  echo "         ^ no audio track found — output will be silent"
  AUDIO_ARGS=(-an)
fi

ffmpeg -v error -i "$IN" \
  -vf "scale=720:-2:flags=lanczos" \
  -c:v libx264 -profile:v main -crf 28 -preset slow -pix_fmt yuv420p \
  "${AUDIO_ARGS[@]}" \
  -movflags +faststart -y "$OUT_V"

ffmpeg -v error -ss "$AT" -i "$IN" -vf "scale=720:-2" -frames:v 1 -q:v 3 -y "$OUT_P"

SIZE_OUT="$(du -h "$OUT_V" | cut -f1)"
echo "output : $(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$OUT_V")  $SIZE_OUT  ($SIZE_IN -> $SIZE_OUT)"
echo "poster : $OUT_P  (frame at ${AT}s — rerun with a different time if it caught a blink)"
echo
echo "Paste into the Stories row in index.html:"
cat <<SNIPPET

    <figure class="story" data-reveal>
      <div class="phone phone--tap">
        <video class="js-story" src="assets/video/$SLUG.mp4" poster="assets/img/$SLUG-poster.jpg"
               muted loop playsinline preload="none" aria-label="DESCRIBE THE CLIP HERE"></video>
        <button class="phone__sound" aria-label="Unmute clip"><svg viewBox="0 0 24 24"><use href="#i-sound-off"/></svg></button>
        <span class="phone__play" aria-hidden="true"><svg viewBox="0 0 24 24"><use href="#i-play"/></svg></span>
      </div>
      <figcaption>&ldquo;CAPTION HERE&rdquo;</figcaption>
    </figure>
SNIPPET
