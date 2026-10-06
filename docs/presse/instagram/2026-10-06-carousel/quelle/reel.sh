#!/usr/bin/env bash
# Baut aus den zehn Folien ein Video (1080x1350, H.264/AAC) mit einem Track aus dem Spiel-Soundtrack.
# Folienwechsel liegen auf ganzen Takten, der Ton ist auf -14 LUFS angehoben und blendet am Ende aus.
#
#   docs/presse/instagram/2026-10-06-carousel/quelle/reel.sh theme_1 [ziel.mp4]
#
# Trackname wie in core/src/main/assets/music/ ohne .ogg (theme_1, sewers_2, prison_boss, ...).
set -euo pipefail

HIER="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HIER/../../../../.." && pwd)"
TRACK="${1:?Trackname fehlt, z. B. theme_1}"
ZIEL="${2:-reel-$TRACK.mp4}"
OGG="$REPO/core/src/main/assets/music/$TRACK.ogg"
[ -f "$OGG" ] || { echo "Gibt es nicht: $OGG" >&2; exit 1; }

# BPM laut docs/NEUKOELLN-AUDIO.md
declare -A BPM=(
  [theme_1]=130 [theme_2]=128 [theme_finale]=98
  [sewers_1]=120 [sewers_2]=120 [sewers_3]=118 [sewers_tense]=122 [sewers_boss]=126
  [prison_1]=124 [prison_2]=124 [prison_3]=124 [prison_tense]=124 [prison_boss]=128
  [caves_1]=136 [caves_2]=136 [caves_3]=136 [caves_tense]=138 [caves_boss]=140 [caves_boss_finale]=144
  [city_1]=122 [city_2]=122 [city_3]=122 [city_tense]=124 [city_boss]=126 [city_boss_finale]=128
  [halls_1]=140 [halls_2]=140 [halls_3]=140 [halls_tense]=142 [halls_boss]=145 [halls_boss_finale]=148
)
TEMPO="${BPM[$TRACK]:-}"
[ -n "$TEMPO" ] || { echo "Kein BPM-Wert für $TRACK (Intro-Klangbetten haben keinen festen Takt)" >&2; exit 1; }

# Takte je Folie: Titel kurz, Textfolien länger, Abspann am längsten.
TAKTE=(2 3 2 2 2 2 4 3 3 4)
FOLIEN=("$HIER"/../folien/*.png)
[ "${#FOLIEN[@]}" -eq "${#TAKTE[@]}" ] || { echo "Erwartet ${#TAKTE[@]} Folien, gefunden ${#FOLIEN[@]}" >&2; exit 1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
GESAMT=0
for i in "${!FOLIEN[@]}"; do
  D=$(awk -v t="${TAKTE[$i]}" -v b="$TEMPO" 'BEGIN { printf "%.4f", t * 240 / b }')
  printf "file '%s'\nduration %s\n" "$(realpath "${FOLIEN[$i]}")" "$D" >> "$TMP/liste.txt"
  GESAMT=$(awk -v g="$GESAMT" -v d="$D" 'BEGIN { printf "%.4f", g + d }')
done
printf "file '%s'\n" "$(realpath "${FOLIEN[-1]}")" >> "$TMP/liste.txt"
AUS=$(awk -v g="$GESAMT" 'BEGIN { printf "%.4f", g - 2 }')

ffmpeg -hide_banner -loglevel error -y \
  -f concat -safe 0 -i "$TMP/liste.txt" -i "$OGG" \
  -filter_complex "[0:v]fps=30,format=yuv420p[v];[1:a]atrim=0:$GESAMT,loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=$AUS:d=2,aresample=44100[a]" \
  -map "[v]" -map "[a]" -t "$GESAMT" -c:v libx264 -preset slow -crf 16 -tune animation \
  -c:a aac -b:a 192k -movflags +faststart "$ZIEL"
echo "$ZIEL: ${GESAMT}s, $TRACK bei $TEMPO BPM"
