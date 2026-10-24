#!/bin/sh
# 《于是》MV — one command. Works next to the library, or with LIB set.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-}
[ -n "$LIB" ] || for c in "$HERE/../lemo-opuscar" "$HOME/lemo-opuscar"; do [ -f "$c/core/render/video.mjs" ] && LIB=$c && break; done
[ -f "$LIB/core/render/video.mjs" ] || { echo "找不到 lemo-opuscar 库：设置 LIB=/path/to/lemo-opuscar"; exit 1; }
export LIB
export PATH="$HOME/bin:/usr/local/bin:$PATH"

# 1. picture
node "$LIB/core/render/video.mjs" "$HERE" --fps 24 --workers "${WORKERS:-2}" --out "$HERE/out/video.mp4"

# 2. the user's original mix, converted for muxing (never re-scored)
SRC=$(ls "$HERE"/../mv-assets/*.mp3 2>/dev/null | head -1)
[ -n "$SRC" ] || SRC="$HERE/out/song.wav"
ffmpeg -v error -y -i "$SRC" -ac 2 -ar 48000 -c:a pcm_s16le "$HERE/out/song.wav"

# 3. mux: two-pass loudnorm to -14 LUFS, true peak -1.2, grain 2
sh "$LIB/core/render/mux.sh" "$HERE/out/video.mp4" "$HERE/out/song.wav" "$HERE/于是-mv.mp4" 24 2

# 4. subtitles
"$LIB/.venv/bin/python" "$LIB/core/render/srt.py" "$HERE/cues.json" "$HERE/于是.srt"
echo "done: $HERE/于是-mv.mp4"
