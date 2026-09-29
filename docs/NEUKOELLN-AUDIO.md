# Neukölln Pixel Dungeon – Soundtrack (Kiez-Techno)

Stand: 2026-09-29, Audio-Agent. Status: **generiert und in `core/src/main/assets/music/` eingesetzt,
aber noch nicht im laufenden Spiel angehört oder getestet.** Geprüft wurde nur objektiv (Messwerte unten).

## Worum es geht

Alle 31 Musikdateien des Originals sind durch einen eigenen Berliner Technosound ersetzt. Die Tracks entstehen
vollständig per Synthese im Skript `tools/generate-kiez-music.py`. Es gibt keine Samples, keine heruntergeladene
Musik und keine nachgebauten bekannten Tracks. Melodien, Muster und Klänge sind eigene Setzungen, ergänzt um
Zufallsmuster mit festem Seed.

Dateinamen, Format (Ogg Vorbis, 44,1 kHz, Stereo) und Rollen bleiben gleich, deshalb ist keine Java-Änderung
nötig. `Assets.Music` und die `playLevelMusic()`-Methoden der Level-Klassen spielen weiterhin:

| Rolle | Dateien | Wie das Spiel sie nutzt |
|---|---|---|
| Normale Tracks | `<region>_1/_2/_3` | `playTracks(..., false)`: zufällige Folge, jeder Track läuft einmal durch |
| Gefahr | `<region>_tense` | Loop: auf dem Rückweg mit dem Amulett, in den Hinterhöfen auch bei aktiver Geist-Quest, im Amt bei aktiver Wandmaker-Quest; `caves_tense` außerdem im MiningLevel, `city_tense` im VaultLevel |
| Bosskampf | `<region>_boss` | Loop in den Bosslevels |
| Boss-Steigerung | `caves/city/halls_boss_finale` | Loop, zweite Bossphase |
| Titel/Menüs | `theme_1`, `theme_2` | Titel, Rangliste, Journal, Changes, Oberfläche |
| Ende | `theme_finale` | nach dem Endboss (HallsBossLevel) und auf Ebene 1 mit dem Amulett (SewerLevel) |

## Klangkonzept je Region

| Region (Upstream) | Stil | BPM | Tonart | Erkennungszeichen (alles synthetisch) |
|---|---|---|---|---|
| Titel (`theme_1/2`) | Warehouse-Techno | 130 / 128 | a-Moll / d-Moll | gedämpfte Kick, Offbeat-Hihat, dunkles Pad (Am9/Fmaj7), **Spätileuchte-Summen**: gesummtes 4-Takt-Motiv mit spätem Vibrato, darunter ein leise flackerndes 100-Hz-Neonbrummen |
| Ende (`theme_finale`) | Afterhour | 98 | a-Moll | keine harte Kick, weiche Pulse, langer Hall, Summ-Motiv eine Oktave tiefer, 4-Akkord-Folge |
| Hinterhöfe (`sewers`) | Minimal/Dub-Techno | 118–122 | f-Moll | Moll-7-Akkordstabs durch Ping-Pong-Delay (3/16) und großen Hofhall, Filter-LFO über 16 Takte, Wassertropfen (Sinus mit Tonhöhenanstieg), Flaschenklirren (inharmonische Teiltöne 1 : 2,32 : 4,25) |
| Amt (`prison`) | monotoner Behörden-Techno | 124 | d-Moll | **Wartenummer-Gong** (Ding-Dong, große Terz abwärts) alle 8 Takte, Stempel-Rumms auf Zählzeit 4, Tastaturticks, Ein-Ton-Offbeat-Bass, flirrendes Neonröhren-Pad |
| Baustelle (`caves`) | Industrial/Hardgroove | 136–144 | E-Phrygisch | Presslufthammer-Salven (schnelle, dumpf-metallische Schläge), Tom-Loops, Stahlträger-Klonk, **U-Bahn-Rumpeln** (tiefes Rauschen, Schienenstöße, leises Schienensingen) über 10 Takte |
| Renditequartier (`city`) | Deep House/Lounge, „Premium“ | 122–128 | c-Moll / Es-Dur | FM-E-Piano-Akkorde (m9, maj7), Swing-Hihats, Shaker, Glockenarpeggio mit einem um 38 Cent zu tiefen Ton, Drone ~30 Cent verstimmt (Satire: glatt, aber schief) |
| Rathaus (`halls`) | düsterer Hardtechno | 140–148 | c-Moll/Lokrisch | harte, gesättigte Kick mit Rumble-Nachdröhnen, verzerrte Orgel spielt ein **Paternoster-Motiv** (endlos rauf und runter: 0-3-7-10-12-10-7-3), tiefe Rathausglocke, Aktenschrank-Knall |

Varianten:

- `_1/_2/_3`: andere Akkordfolgen, Rhythmen, Basslinien oder Anordnung (z. B. Amt `_2` synkopierter Bass und
  Wechselakkord, `_3` doppelte Stempel; Baustelle `_2` Oktav-Offbeat-Bass, `_3` 3-3-2-Bass und mehr Presslufthammer).
- `_tense`: +0 bis +2 BPM, Musikbus-Tiefpass öffnet sich in jeder 8-Takt-Phrase (1,5–1,8 kHz bis 8–9 kHz),
  Snare-Rolls (8tel, 16tel, 32tel, crescendo) am Phrasenende, dissonantere Akkorde (Hinterhof b9, Amt verstimmter Gong).
- `_boss`: Peak-Time, härtere Kick, eigene **303-artige Acid-Linie** (Sägezahn, 24-dB-Resonanzfilter mit
  Hüllkurve, Akzente, Slides, Sättigung), Filter-LFO über 8 oder 16 Takte.
- `_boss_finale`: +3 bis +4 BPM gegenüber `_boss`, vier statt zwei Acid-Muster, mehr Resonanz, längere Rolls
  (Baustelle), Orgel in 16teln (Rathaus).

## Synthesebausteine

Alles in `tools/generate-kiez-music.py`, nur numpy/scipy:

- Oszillatoren: Sinus, bandbegrenzter Sägezahn und Rechteck (PolyBLEP), Rauschen, additive Teiltonreihen.
- Filter: RBJ-Biquads (Tief-, Hoch-, Bandpass); zeitvariabel blockweise für Acid und Filterfahrten.
- Instrumente: Kick (Pitch-Hüllkurve, optional gesättigt), Hihats (Rauschen + 6 Rechtecke, 5,2–8,8 kHz),
  Clap, Snare, Toms, Rim, Tropfen, Flaschenklirren, Glocke/Gong, Stempel, Tastaturtick, Presslufthammer,
  Stahlträger, U-Bahn, Pad (3 verstimmte Sägezähne je Ton), Dub-Stab, Bass, Zugriegel-Orgel mit Leslie und
  Verzerrung, FM-E-Piano, Summstimme, Acid.
- Effekte: Faltungshall mit synthetischer, gedämpfter Impulsantwort, Ping-Pong-Delay mit Filter je Wiederholung,
  Sidechain-Ducking von Bass und Musik auf die Kick.
- Mix: Busse (Kick, Drums, Bass, Musik inkl. Hall/Delay, FX, Rumble, Ambience) werden relativ zur Musik
  ausgepegelt; danach Master-Hochpass 28 Hz, Master-Tiefpass 10,5 kHz (keine schrillen Höhen), Lautheits-
  angleichung und weicher Limiter.

### Nahtlose Loops

Alles wird **zirkulär** gerendert: Ereignisse, die über das Loop-Ende hinausklingen, werden an den Anfang
addiert; Hall und Sidechain sind zirkuläre Faltungen, statische Filter laufen mit dem Loop-Ende als Vorlauf.
Kontinuierliche Generatoren (Acid, Drone, Neonbrummen) werden etwas länger gerendert und die Überlänge wird
über 60 ms auf den Anfang übergeblendet (Crossfade). Jede Datei ist exakt eine ganze Zahl von Takten lang.

## Reproduktion

```bash
pip install --user numpy scipy soundfile matplotlib   # soundfile bringt libsndfile mit Vorbis mit
python3 tools/generate-kiez-music.py                    # alle 31 Tracks nach core/src/main/assets/music/
python3 tools/generate-kiez-music.py --only halls_boss  # einzelne Tracks
python3 tools/generate-kiez-music.py --out /tmp/x --report /tmp/x   # woanders hin, mit Metriken + PNGs
python3 tools/generate-kiez-music.py --analyze-only --report /tmp/x # nur vorhandene Dateien prüfen
```

- Laufzeit: ca. 3–5 Minuten auf 4 Kernen (Standard `--jobs 4`).
- Deterministisch: Seed je Track aus CRC32 des Namens. Zwei Läufe liefern identisches dekodiertes Audio.
  Die OGG-Dateien selbst unterscheiden sich byteweise, weil libsndfile für jeden Ogg-Stream eine zufällige
  Seriennummer vergibt.
- Vorbis-Qualität: `compression_level=0.9` (soundfile, entspricht ca. 75–95 kbit/s VBR).
- Ein libsndfile-Absturz bei sehr großen Einzel-Writes wird umgangen, indem in Blöcken von 8192 Frames
  geschrieben wird.
- `KIEZ_DEBUG=1` gibt die Buspegel je Track aus.

## Messwerte (Qualitätskontrolle)

Da niemand im Team die Tracks bisher gehört hat, wurde objektiv geprüft (`--report`), gemessen an den
dekodierten OGG-Dateien:

- **Peaks:** höchster Wert −4,7 dBFS (Grenze −1 dBFS).
- **Lautheit:** grobe K-Gewichtung (Hochpass 60 Hz + Höhenanhebung), normale Tracks auf −26,0 dB,
  Boss-Tracks −25,5 dB, `theme_finale` −27,5 dB. Die Upstream-Musik liegt mit demselben Maß im Median bei
  −24,5 dB (Spanne −30,5 bis −20,2). Der neue Soundtrack ist also etwa 1,5 dB leiser und deutlich
  gleichmäßiger. Einfaches RMS: −25,2 bis −21,5 dBFS.
- **Höhen:** Spektralschwerpunkt 1,2–2,7 kHz; Energieanteil über 8 kHz höchstens 0,3 %.
- **Loop-Naht:** Sprung vom letzten zum ersten Sample 0,001–0,020, in allen Tracks kleiner als der größte
  normale Sampleschritt in ±50 ms um die Naht. Die Naht ist messbar nicht auffälliger als die Musik davor und danach.
- **BPM-Raster:** alle Dateien sind exakt ganze Takte lang. Die Takt-Autokorrelation der Tiefband-Hüllkurve
  hat ihr Maximum bei allen 31 Tracks genau bei der Soll-BPM (Suchbereich ±5 %, Schritt 0,05 BPM).
  Die freie BPM-Schätzung (Suchbereich 90–160) liegt bei 27 von 31 Tracks auf ±0,1 BPM. Bei `sewers_1/2/3`
  und `sewers_tense` verwirren die weiche Kick, der Sub-Bass und die 3/16-Echos diese Schätzung. Das Raster
  selbst ist davon nicht betroffen.
- PNG-Übersichten (Wellenform + Spektrogramm je Region) werden mit `--report` erzeugt.

| Track | BPM | Takte | Dauer s | Peak dBFS | Lautheit | Schwerpunkt Hz | KB |
|---|---|---|---|---|---|---|---|
| theme_1 | 130 | 40 | 73.8 | −10.3 | −26.0 | 2493 | 647 |
| theme_2 | 128 | 40 | 75.0 | −9.6 | −26.0 | 2490 | 644 |
| theme_finale | 98 | 32 | 78.4 | −11.3 | −27.5 | 1185 | 465 |
| sewers_1 | 120 | 36 | 72.0 | −9.3 | −26.0 | 2377 | 662 |
| sewers_2 | 120 | 36 | 72.0 | −8.7 | −26.0 | 2343 | 669 |
| sewers_3 | 118 | 36 | 73.2 | −7.9 | −26.1 | 2142 | 633 |
| sewers_tense | 122 | 40 | 78.7 | −8.8 | −26.0 | 2431 | 746 |
| sewers_boss | 126 | 40 | 76.2 | −6.5 | −25.5 | 2655 | 778 |
| prison_1 | 124 | 36 | 69.7 | −6.8 | −26.0 | 2279 | 617 |
| prison_2 | 124 | 36 | 69.7 | −5.9 | −26.0 | 2280 | 619 |
| prison_3 | 124 | 36 | 69.7 | −8.2 | −26.0 | 2243 | 633 |
| prison_tense | 124 | 40 | 77.4 | −7.8 | −26.0 | 2189 | 658 |
| prison_boss | 128 | 40 | 75.0 | −4.7 | −25.5 | 2259 | 760 |
| caves_1 | 136 | 40 | 70.6 | −8.0 | −26.0 | 1597 | 642 |
| caves_2 | 136 | 40 | 70.6 | −7.7 | −26.0 | 1614 | 646 |
| caves_3 | 136 | 40 | 70.6 | −8.1 | −26.0 | 1564 | 655 |
| caves_tense | 138 | 48 | 83.5 | −8.4 | −26.0 | 1535 | 770 |
| caves_boss | 140 | 48 | 82.3 | −7.6 | −25.5 | 1995 | 896 |
| caves_boss_finale | 144 | 48 | 80.0 | −6.7 | −25.5 | 2039 | 864 |
| city_1 | 122 | 36 | 70.8 | −10.0 | −26.0 | 2515 | 638 |
| city_2 | 122 | 36 | 70.8 | −8.5 | −26.0 | 2549 | 638 |
| city_3 | 122 | 36 | 70.8 | −9.9 | −26.0 | 2549 | 635 |
| city_tense | 124 | 40 | 77.4 | −9.5 | −26.0 | 2518 | 668 |
| city_boss | 126 | 40 | 76.2 | −7.3 | −25.5 | 2410 | 773 |
| city_boss_finale | 128 | 40 | 75.0 | −7.3 | −25.5 | 2518 | 790 |
| halls_1 | 140 | 44 | 75.4 | −5.1 | −26.0 | 2102 | 671 |
| halls_2 | 140 | 44 | 75.4 | −7.1 | −26.0 | 2151 | 673 |
| halls_3 | 140 | 44 | 75.4 | −6.4 | −26.0 | 2134 | 666 |
| halls_tense | 142 | 48 | 81.1 | −6.3 | −26.0 | 2043 | 698 |
| halls_boss | 145 | 48 | 79.5 | −5.1 | −25.5 | 2047 | 816 |
| halls_boss_finale | 148 | 48 | 77.8 | −4.8 | −25.5 | 2045 | 799 |

## Dateigrößen

| | Vorher (Upstream) | Nachher |
|---|---|---|
| `core/src/main/assets/music/*.ogg` (31 Dateien) | 18.495.403 B (17,6 MiB) | 21.984.048 B (21,0 MiB) |
| größte Datei | – | 896 KB (`caves_boss`) |
| Dauer je Track | 26–140 s | 70–84 s |

Wenn die Größe drücken soll: `--level 1.0` spart ca. 18 % (ca. 64 kbit/s), klingt aber bei Hall und Hihats
wahrscheinlich schlechter. Ungehört nicht empfohlen.

## Einschränkungen und offene Punkte

- **Nicht angehört.** Die Tracks wurden nur gemessen und als Wellenform/Spektrogramm angesehen. Ein Mensch
  muss prüfen, ob Mischung, Motive und Humor funktionieren (z. B. Gong- und Stempel-Lautstärke,
  Acid-Resonanz, Verstimmung im Renditequartier).
- **Nicht im Spiel getestet.** Laden und Loopen unter libGDX (Desktop) ist noch nicht verifiziert. Das Format
  entspricht dem Upstream (Ogg Vorbis, 44,1 kHz, Stereo); libsndfile setzt kein Loop-Tag, die Nahtlosigkeit
  kommt allein aus dem Signal.
- **iOS:** `ios/assets/music/*.mp3` sind weiterhin die Upstream-Musik. Sie müssen aus den neuen OGGs
  konvertiert werden (z. B. mit ffmpeg/lame, im Container nicht vorhanden). Dafür ist der Integrationsagent zuständig.
- **Credits/README:** Die Credits für die Originalmusik (Lumine Haaristo in `AboutScene`, README) bleiben
  bestehen, weil der Fork auf Shattered basiert. Nur der Satz im README, die Musik sei noch die des Originals,
  ist jetzt überholt. Ob der neue Soundtrack in `AboutScene` eigens genannt wird, entscheidet der Integrationsagent.
- Die Tracks sind kürzer und gleichförmiger arrangiert als das Original (eine 8-Takt-Phrasenstruktur mit
  Breakdown). Bei langen Sitzungen können sie sich wiederholen.
- Die Soundeffekte (`core/src/main/assets/sounds`) sind unverändert.
- Das Motiv „Rixdorfer Musike“ aus der Weltbibel wird bewusst nicht zitiert. Das Stück ist gemeinfrei, der
  Auftrag verlangte aber ausschließlich eigene Melodien.
