#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# add-clip.sh — take a freshly generated clip and make it web-ready.
#
#   ./tools/add-clip.sh <input-video> <slug> [options]
#
#     --poster <sec>   frame to grab for the still (default 4)
#     --from <sec>     trim: start here (default 0)
#     --to <sec>       trim: end here (default: end of clip)
#
#   ./tools/add-clip.sh ~/Downloads/out.mp4 ugc3 --poster 8.5
#   ./tools/add-clip.sh ~/Downloads/out.mp4 ugc3 --from 0 --to 11.5 --poster 6
#
# Produces:
#   assets/video/<slug>.mp4        720px wide, H.264 + stereo AAC, faststart
#   assets/img/<slug>-poster.jpg   still frame for the card before it plays
#
# Two reasons this always re-encodes rather than copying the stream:
#
#   1. Higgsfield's Seedance models output HEVC/H.265, which most browsers
#      refuse to decode — the clip looks broken or silent with no useful error.
#   2. Generated video goes wrong locally: an extra hand appears at 0:12, the
#      bar morphs, a finger merges. Those takes are usually salvageable by
#      cutting the bad seconds, which is what --from/--to are for. Re-encoding
#      means the cut lands exactly where you asked instead of snapping to the
#      nearest keyframe.
#
# --poster is timed against the ORIGINAL clip, not the trimmed one, so you can
# read the timestamp straight off the player you were watching.
# ---------------------------------------------------------------------------
set -euo pipefail

IN="${1:-}"; SLUG="${2:-}"
[ $# -ge 2 ] && shift 2 || true

AT=4; FROM=""; TO=""
while [ $# -gt 0 ]; do
  case "$1" in
    --poster) AT="${2:-4}"; shift 2 ;;
    --from)   FROM="${2:-}"; shift 2 ;;
    --to)     TO="${2:-}"; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

if [ -z "$IN" ] || [ -z "$SLUG" ]; then
  echo "usage: $0 <input-video> <slug> [--poster S] [--from S] [--to S]" >&2
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
DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")"
SIZE_IN="$(du -h "$IN" | cut -f1)"

printf 'source : %s  %.1fs  video=%s  audio=%s  %s\n' "$DIMS" "$DUR" "$VCODEC" "${ACODEC:-none}" "$SIZE_IN"
case "$VCODEC" in
  hevc|h265) echo "         ^ HEVC source — browsers cannot play this directly. Re-encoding (this is the fix)." ;;
esac

TRIM=()
if [ -n "$FROM" ]; then TRIM+=(-ss "$FROM"); fi
if [ -n "$TO" ];   then TRIM+=(-to "$TO");   fi
if [ ${#TRIM[@]} -gt 0 ]; then
  echo "         ^ trimming to ${FROM:-0}s..${TO:-end}s"
  # warn if the poster frame is outside what survives the cut
  awk -v a="$AT" -v f="${FROM:-0}" -v t="${TO:-$DUR}" \
    'BEGIN{ if (a<f || a>t) print "         ! --poster " a "s is outside the trim range — pick a time inside it" }'
fi

if [ -n "$ACODEC" ]; then
  AUDIO_ARGS=(-c:a aac -b:a 96k -ac 2)
else
  echo "         ^ no audio track — output will be silent"
  AUDIO_ARGS=(-an)
fi

# 720px wide is plenty: the phone frames on the site never exceed ~360 CSS px.
ffmpeg -v error "${TRIM[@]}" -i "$IN" \
  -vf "scale=720:-2:flags=lanczos" \
  -c:v libx264 -profile:v main -crf 28 -preset slow -pix_fmt yuv420p \
  "${AUDIO_ARGS[@]}" \
  -movflags +faststart -y "$OUT_V"

ffmpeg -v error -ss "$AT" -i "$IN" -vf "scale=720:-2" -frames:v 1 -q:v 3 -y "$OUT_P"

OUT_DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT_V")"
printf 'output : %s  %.1fs  %s  (%s -> %s)\n' \
  "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$OUT_V")" \
  "$OUT_DUR" "$(du -h "$OUT_V" | cut -f1)" "$SIZE_IN" "$(du -h "$OUT_V" | cut -f1)"
echo "poster : $OUT_P  (frame at ${AT}s of the original — rerun with another time if it caught a blink)"
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
      <figcaption>DESCRIPTION HERE</figcaption>
    </figure>
SNIPPET
