# Pixel Dungeon Neukölln – Soundtrack (Kiez-Techno)

Stand: 2026-09-29, Audio-Agent. Status: **generiert und in `core/src/main/assets/music/` eingesetzt,
aber noch nicht im laufenden Spiel angehört oder getestet.** Geprüft wurde nur objektiv (Messwerte unten).

> **Stand 2026-09-29:** Auf Wunsch des Projektinhabers sind alle 67 Soundeffekte zurück auf den Originalen von Shattered Pixel Dungeon (Stand 4256b22). Die synthetischen Kiez-Sounds klangen zu billig. `tools/generate-kiez-sfx.py` bleibt als Werkzeug im Repo, wird aber nicht ausgeführt; ein Lauf würde die Originale überschreiben.

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
- Die Soundeffekte sind inzwischen ebenfalls ersetzt, siehe Abschnitt „Soundeffekte (Kiez-Sounds)“ unten.
- Das Motiv „Rixdorfer Musike“ aus der Weltbibel wird bewusst nicht zitiert. Das Stück ist gemeinfrei, der
  Auftrag verlangte aber ausschließlich eigene Melodien.

## Soundeffekte (Kiez-Sounds)

Stand: 2026-09-29, Audio-Agent. Status: **alle 67 Dateien in `core/src/main/assets/sounds/` ersetzt und
gemessen, aber von niemandem angehört und nicht im laufenden Spiel getestet.**

### Methode

- Generator `tools/generate-kiez-sfx.py`, reine Synthese mit numpy/scipy: Rauschen, Filter, gedämpfte
  Teiltöne für Metall, Glas, Holz und Glocke, Karplus-Strong-Zupfer, Formantfilter für Stimmen,
  synthetischer Hall. Keine Samples, keine Downloads, keine Zitate realer Marken-Jingles.
- Deterministisch: Seed je Sound aus CRC32 des Namens. Zwei Läufe liefern byte-identische MP3s.
- Format: weiterhin MP3, jetzt einheitlich 44,1 kHz, Mono, 64 kbit/s CBR (Upstream gemischt 16–48 kHz,
  32–128 kbit/s). Ausnahme: die 13 überarbeiteten Kampfklänge (siehe unten) mit 160 kbit/s CBR. Kodiert mit dem PyPI-Paket `lameenc` (LAME, kein ffmpeg nötig). Die Dateinamen sind gleich
  geblieben, deshalb ist keine Java-Änderung nötig: `Assets.Sounds` lädt dieselben Pfade.
- Lautheit: grobe K-Gewichtung (Hochpass 60 Hz, +4 dB ab 1,5 kHz), Energie der aktiven 20-ms-Frames
  (höchstens 20 dB unter dem lautesten Frame). Die Upstream-Werte wurden vor dem Ersetzen gemessen und stehen
  fest im Skript (`REF`). Jeder neue Sound wird nach dem Kodieren am **dekodierten** MP3 nachgemessen und
  nachgeregelt. Ergebnis: mittlere Abweichung 0,1 dB. Nur `evoke` und `mimic` liegen 0,5 dB leiser, weil dort die
  Peak-Grenze greift. `blast` und `shatter` treffen die Referenz seit der zweiten Fassung. Der dekodierte Peak liegt überall bei höchstens −1,0 dBFS.
- Dauer: höchstens 15 % bzw. 0,15 s länger als das Original, längere Hallfahnen werden ausgeblendet.
  Kürzer sind `descend` (3,5 s statt 4,8 s) sowie `health_warn` und `health_critical` (0,6 bzw. 0,8 s statt
  0,9 bzw. 1,0 s). `trap` ist mit 0,2 s etwas länger als das sehr kurze Original (0,13 s).
- Größe: 67 Dateien, 562 KiB (Upstream 423 KiB, erste Kiez-Fassung 495 KiB).

### Lesbarkeit der Mechanik

- Warn- und Gefahrenklänge gehören jeweils zu einer eigenen Klangfamilie: Herzschlag-Bass (`health_warn`),
  derselbe schneller plus zweitöniger Fehlerpiep (`health_critical`), Sirene mit Heulern und Zweiklang
  (`alert`), Quietschen plus Plopp (`trap`), tiefes Moll-Horn (`boss`), helle Fanfare kurz-kurz-lang
  (`challenge`), tiefer Summer (`cursed`).
- Treffer (dumpfer Körperschlag, kurz) und Abwehr (`hit_parry`, nachklingendes Metall) unterscheiden sich klar.
  `miss` ist ein tiefer Luftzug ohne Aufprall und klingt bewusst anders als die raschelnde Tüte bei `item`.
- Prüfung: 24-Band-Spektralprofil, paarweise RMS-Differenz. In der Gruppe alert, trap, hit, miss,
  health_warn, health_critical, boss, challenge, hit_parry, cursed, debuff, item und gold beträgt der kleinste
  Abstand 8,2 dB (miss/challenge, zudem völlig anderer Zeitverlauf). Stand der ersten Fassung; die
  Kampfklänge wurden danach neu gebaut, ihre Abstände stehen im nächsten Abschnitt. Die ähnlichsten Paare insgesamt sind
  atk_crossbow/ray und eat/trample (je etwa 4 dB), sie unterscheiden sich aber in Zeitverlauf und Kontext.
- Der Herzschlag liegt tief (um 60 Hz, Schwerpunkt unter 700 Hz). Auf Handylautsprechern kann er leise wirken.
  Das Spiel spielt ihn ohnehin mit Lautstärke 1/3 bis 1 ab. Bitte am Gerät prüfen.
- Spektrogramme aller 67 Sounds wurden angesehen (Ton, Hüllkurve, keine Übersteuerung). Das ersetzt kein Anhören.

### Waffenklänge, zweite Fassung (nach Hörfeedback)

Stand: 2026-09-29, Audio-Agent. Anlass: Der Projektinhaber hat die erste Fassung angehört. Die Waffenklänge
klangen „billig, wie Plastik“, und der Bogen klang wie der Handschuh. Neu gebaut wurden `hit`, `hit_slash`,
`hit_stab`, `hit_crush`, `hit_strong`, `hit_magic`, `hit_parry`, `hit_arrow`, `atk_spiritbow`,
`atk_crossbow`, `miss` sowie `blast` und `shatter`. Die übrigen 54 Dateien sind byte-identisch geblieben.
**Status: gemessen und Spektrogramme angesehen, aber noch von niemandem angehört.**

Wo die Klänge im Spiel laufen (per grep geprüft): `hit` ist der Standard-Treffer jedes Monsters
(`Char.hitSound`) und der Klang von Handschuh, Bolas, Wurfstein, Armbrust im Nahkampf und Magierstab.
Die Jägerin/Zugezogene hört also bei jedem Nahkampfschlag `hit` und beim Schuss `atk_spiritbow`, dann
`hit_arrow`. `miss` ist zugleich das Wurfgeräusch aller Gegenstände (`Item.java`, Tonhöhe 1,5).
`atk_crossbow` spielt auch beim Werfen von Pfeilen mit ausgerüsteter Armbrust. Das Spiel variiert die Tonhöhe
bei jedem Abspielen um ±13–15 %. Deshalb gibt es je Datei nur eine neutrale Fassung.

**Ursache „Plastik“ (Messung am dekodierten MP3, Upstream nur als Maßstab):**

- Der Körper war fast immer **ein reiner Sinus mit Tonhöhen-Glide** (z. B. 110→55 Hz), dazu ein paar
  Sinus-Moden. Die spektrale Flachheit (Rauschanteil 100 Hz–8 kHz) lag bei `hit`, `hit_stab`, `hit_crush`,
  `hit_strong`, `hit_parry` und `hit_arrow` bei 0,00–0,01. Upstream liegt bei 0,06–0,43. Ein tonaler „Boing“
  ohne Rauschen und Materialresonanz klingt nach Spielzeug.
- **Keine Höhen:** Über 6 kHz lagen 0,0–0,9 % der Energie (Upstream 4–19 %). Der Anschlag hatte keine
  Brillanz, der Rest war Pappe.
- **Gleiche Tonhöhe bei Handschuh und Bogen:** Der Pappkörper von `hit` hatte seine stärkste Spitze bei
  159 Hz, der Gummiband-Zupfer von `atk_spiritbow` lag bei 160 Hz (Spitze bei 321 Hz, 2. Harmonische).
  Beide begannen mit demselben kurzen Rauschklick. Deshalb klangen sie gleich, obwohl das
  24-Band-Profil sie trennte.
- Kein Raum: Die Klänge waren trocken. Dazu kamen einförmige Hüllkurven mit einer einzigen
  Exponentialkurve, 0–3 ms Attack und ohne Mikro-Transienten. Kodiert war mit 64 kbit/s.

**Methode der zweiten Fassung** (neue Bausteine im Generator: `res_bank`, `strike`, `thump`, `noise_hit`,
`whoosh`, `room_ir`/`room`, `compress`, `master`, `blade_modes`, `bow_string`; Dekorator `sound_hq`):

1. Transient: Ein Halbsinus-Kontaktpuls regt eine Bank gedämpfter Zwei-Pol-Resonatoren an (Modalsynthese).
   Die Kontaktdauer steht für die Härte: Handschuh 3,5 ms, Pfeil 0,25 ms, Metall 0,18 ms. Die Resonatoren
   haben Nullstellen bei 0 Hz, damit der Gleichanteil des Pulses nicht als Bass-Brei durchkommt.
2. Körper: `thump`, Tonhöhenabfall plus Oberton plus mitlaufendes Rauschband, kein reiner Sinus.
3. Material: Leder/Polster (430/760/1180 Hz, 5–10 ms), Holz, Klinge mit Stabmoden 1 : 2,76 : 5,40 : 8,93
   als leicht verstimmte Paare (Schwebung), zufällige Plattenmoden für das Metallfunkeln, einzelne
   Glasscherben mit je eigenen Moden, Knack-Mikrobrüche.
4. Raum: Faltung mit synthetischer Raumantwort aus 7–10 frühen Reflexionen und diffusem Nachhall. Die
   Höhen klingen 2,5-mal schneller ab. RT 0,16 s (`hit`) bis 0,8 s (`blast`), Hallanteil 10–28 %.
5. Mastering: sanfter Kompressor, weiche Sättigung, Tiefpass 8–14 kHz gegen digitale Härte, Hochpass 30 Hz.
6. Kodierung 160 kbit/s CBR, 44,1 kHz, Mono. Die Lautheit wird wie bisher per `REF` auf das Original gepegelt,
   der dekodierte Peak liegt bei höchstens −1 dBFS.

| Datei | Neuer Klang |
|---|---|
| `hit` | Dumpfer Punch: Leder klatscht (zwei Mikrostöße 3,5 ms versetzt), Thump 150→62 Hz, Polster-Moden, kein Klick |
| `atk_spiritbow` | Sehnen-Twang (Karplus-Strong, Grundton 98 Hz), Holz-Wurfarme 142/233/371 Hz, Sehne am Armschutz, dann ein sich entfernender Pfeil-Luftzug (2,6→0,9 kHz) mit Federflattern |
| `hit_arrow` | Kurzes Heranzischen, harter heller „Tock“ (Holzmoden 0,96–3,95 kHz), dann schwirrt der Schaft (~70 Hz gepulstes Rauschband) |
| `hit_slash` | Klingen-Luftzug (0,9→4 kHz), körniger Schnitt, Thump, kurzer Klingen-Nachklang mit Schwebung |
| `hit_stab` | Spitzer Metall-Tick, Durchdringen (Rauschband gleitet 3,4→1 kHz), feuchtes Körnen, kleiner Thump |
| `hit_crush` | Schwerer Thump 118→46 Hz, Holzkopf der Keule, sieben Knack-Mikrobrüche in 40 ms, Schutt |
| `hit_strong` | Sub-Bass 92→36 Hz, drei Anschläge in 13 ms, Grollen, Staub, deutlicher Kellerraum (RT 0,42 s) |
| `hit_magic` | Druckstoß, Entladung durch Kammfilter mit gleitender Verzögerung, Funkenknistern, kurz verklingendes Brummen |
| `hit_parry` | Metall auf Metall: harter Anschlag, zwei Klingen mit Stabmoden und Schwebung, Plattenfunkeln, kurzes Kratzen |
| `atk_crossbow` | Abzug klackt zweimal metallisch, straffe Sehne schnappt (168 Hz, sehr kurz) gegen Holzanschlag, kurzer Bolzen-Luftzug |
| `miss` | Luftzug erst steigend, dann fallend (Doppler-artig, 0,3–1,2 kHz plus Oktave), leichtes Flattern, kein Aufprall |
| `blast` | Friedlander-Druckwelle statt Sinus, Rumpeln, Schutt, Hinterhof-Reflexionen (RT 0,8 s) |
| `shatter` | Dumpfer Aufprall, Krachen, 34 einzeln angeregte Glasscherben, deren Dichte und Pegel abnehmen |

**Messwerte vorher → nachher** (dekodiertes MP3; Flachheit = Rauschanteil 100 Hz–8 kHz; Abklingen = ms vom
Maximum bis −20 dB; in Klammern Upstream):

| Datei | Schwerpunkt Hz | Energie < 200 Hz | Energie > 6 kHz | Flachheit | Abklingen −20 dB ms |
|---|---|---|---|---|---|
| `hit` | 1391 → 2626 (5075) | 72 → 55 % (8) | 0,0 → 1,0 % (17) | 0,01 → 0,17 (0,39) | 52 → 20 (92) |
| `hit_slash` | 4116 → 4792 (4806) | 43 → 69 % (41) | 3,9 → 7,6 % (12) | 0,20 → 0,24 (0,37) | 35 → 55 (53) |
| `hit_stab` | 1107 → 4481 (5167) | 15 → 57 % (14) | 0,0 → 5,8 % (19) | 0,00 → 0,22 (0,43) | 22 → 44 (70) |
| `hit_crush` | 1258 → 2727 (3514) | 89 → 76 % (43) | 0,0 → 0,7 % (4) | 0,01 → 0,09 (0,36) | 17 → 18 (82) |
| `hit_strong` | 1091 → 3039 (2589) | 93 → 93 % (71) | 0,0 → 0,8 % (0,5) | 0,01 → 0,13 (0,06) | 38 → 26 (29) |
| `hit_magic` | 2588 → 3920 (3966) | 46 → 75 % (56) | 0,9 → 2,6 % (4) | 0,09 → 0,29 (0,28) | 46 → 55 (62) |
| `hit_parry` | 2440 → 3959 (4889) | 0 → 3 % (8) | 0,5 → 5,7 % (16) | 0,01 → 0,03 (0,33) | 298 → 106 (87) |
| `hit_arrow` | 999 → 3120 (4613) | 0,4 → 6 % (25) | 0,0 → 0,7 % (11) | 0,00 → 0,04 (0,36) | 36 → 27 (63) |
| `atk_spiritbow` | 4435 → 2341 (3972) | 0,5 → 42 % (63) | 9,3 → 0,2 % (3) | 0,10 → 0,06 (0,22) | 128 → 103 (48) |
| `atk_crossbow` | 4529 → 4253 (4635) | 1,5 → 42 % (35) | 10,7 → 7,3 % (11) | 0,28 → 0,12 (0,37) | 140 → 50 (68) |
| `miss` | 1761 → 2204 (2077) | 0 → 0,6 % (99) | 0 → 0,1 % (0) | 0,02 → 0,06 (0,26) | 150 → 39 (14) |
| `blast` | 4709 → 3052 (405) | 95 → 75 % (88) | 0,9 → 0,8 % (0) | 0,15 → 0,09 (0,00) | 18 → 85 (5) |
| `shatter` | 7504 → 5942 (4584) | 0 → 5 % (0,4) | 33 → 26 % (51) | 0,06 → 0,16 (0,15) | 185 → 141 (85) |

Lautheit wie in der Zuordnungstabelle: Abweichung zur Referenz höchstens 0,2 dB. Nur `blast` liegt jetzt
genau auf −11,9 dB (erste Fassung: 1,1 dB zu leise). Alle Peaks liegen bei höchstens −1,1 dBFS.

**Unterscheidbarkeit** (nach Onset ausgerichtet, 40-Band-Mel-Spektrogramm über 0,3 s, mittlere Differenz in
dB über die Zellen, in denen einer der beiden Klänge lauter als −40 dB ist; dazu das 24-Band-Profil wie oben):

| Paar | erste Fassung zeit-spektral / Profil | zweite Fassung zeit-spektral / Profil |
|---|---|---|
| `hit` / `atk_spiritbow` | 18,5 / 18,3 dB | 19,1 / 9,4 dB |
| `hit` / `hit_arrow` | 18,1 / 30,6 dB | 14,4 / 12,2 dB |
| `atk_spiritbow` / `hit_arrow` | 22,6 / 36,3 dB | 14,2 / 8,1 dB |
| `atk_spiritbow` / `atk_crossbow` | 11,0 / 19,3 dB | 11,5 / 10,2 dB |
| kleinster Abstand der 11 Waffenklänge | 7,1 dB (`hit_crush`/`hit_strong`) | 8,0 dB (`hit_crush`/`hit_strong`) |

Wichtig: Schon die erste Fassung trennte `hit` und `atk_spiritbow` messbar, und trotzdem klangen sie
gleich (gleiche Grundtonhöhe von etwa 160 Hz, gleicher Klick). Die Zahlen belegen also keine hörbare
Unterscheidbarkeit. Entscheidend ist der jetzt andere Aufbau: `hit` ist ein geräuschhafter Schlag, nach
−20 dB in 20 ms abgeklungen, ohne erkennbaren Ton. `atk_spiritbow` ist ein tonaler Twang (98 Hz mit
Obertönen) mit hörbarem Luftzug über 0,3 s. `hit_arrow` ist ein heller Tock bei 0,96 kHz mit Schaftschwirren
und fast ohne Bass (6 % statt 55 % unter 200 Hz).


Werte am dekodierten MP3, in Klammern das Upstream-Original. Die dekodierte Dauer enthält bei beiden ca.
25–50 ms MP3-Encoder-Vorlauf. Kampfklänge, `blast` und `shatter` in der zweiten Fassung (siehe oben).

**Oberfläche, Bewegung, Umgebung**

| Datei | Kiez-Klang | Dauer s (alt) | Lautheit dB (alt) | Peak dBFS |
|---|---|---|---|---|
| `click` | Kugelschreiber-Klick am Amtsschalter: zwei Mikroklicks | 0.08 (0.10) | −24.6 (−24.7) | −14.1 |
| `step` | Schritt auf Altbaudielen: dumpfer Tritt, kurzer Holzton | 0.21 (0.18) | −22.6 (−22.6) | −10.5 |
| `grass` | Laub und Kiezgrün auf dem Tempelhofer Feld: kurzes Rascheln | 0.21 (0.18) | −32.1 (−32.2) | −22.0 |
| `water` | Pfütze vor dem Späti: Platschen + zwei Blubber | 0.29 (0.21) | −31.9 (−31.7) | −18.1 |
| `trample` | Plastikbecher wird zertreten: Knistern + kleiner Tritt | 0.16 (0.21) | −28.8 (−28.8) | −11.5 |
| `sturdy` | Klopfen an einer massiven Altbautür | 0.18 (0.15) | −22.2 (−22.0) | −10.6 |
| `dewdrop` | Biertropfen landet im Kronkorken: Tropfen + kleines Blechklimpern | 0.47 (0.48) | −19.3 (−19.3) | −6.7 |
| `item` | Plastiktüte vom Späti raschelt | 0.47 (0.46) | −19.8 (−19.7) | −6.7 |
| `gold` | Münzen fallen in den Pfandautomaten: Klapp + drei Münzen | 0.39 (0.29) | −17.8 (−17.9) | −7.1 |
| `door_open` | Altbautür: Schnappschloss klackt, dann knarzt das Scharnier | 0.47 (0.39) | −34.0 (−34.2) | −20.3 |
| `unlock` | Schlüsselbund klimpert, Riegel schnappt | 0.50 (0.55) | −29.9 (−29.9) | −14.5 |
| `descend` | Treppenhaus: Schritte nach unten mit Hall, am Ende klackt der Minutenlicht-Schalter | 3.45 (4.82) | −20.3 (−20.4) | −7.6 |

**Kampf**

| Datei | Kiez-Klang | Dauer s (alt) | Lautheit dB (alt) | Peak dBFS |
|---|---|---|---|---|
| `hit` | Dumpfer Punch: Leder auf Körper, tiefer Thump, kurzer Raum | 0.26 (0.30) | −15.2 (−15.2) | −2.0 |
| `hit_slash` | Klinge: Luftzug, körniger Schnitt, kurzer Klingen-Nachklang | 0.34 (0.31) | −14.3 (−14.4) | −1.1 |
| `hit_stab` | Stich: spitzer Tick, Durchdringen, kleiner Thump | 0.21 (0.25) | −14.5 (−14.6) | −2.2 |
| `hit_crush` | Keule/Hammer: schwerer Thump, Holzkopf, Knacken | 0.42 (0.34) | −15.6 (−15.6) | −1.3 |
| `hit_magic` | Energie-Einschlag: Druckstoß, Kammfilter-Entladung, Funken | 0.50 (0.54) | −16.1 (−16.1) | −1.3 |
| `hit_strong` | Wuchtiger Aufprall mit Sub-Bass, Grollen, Staub, Kellerraum | 0.68 (0.67) | −18.6 (−18.6) | −2.0 |
| `hit_parry` | Abgewehrt: Metall auf Metall, Klingenmoden mit Schwebung | 0.52 (0.44) | −13.3 (−13.3) | −1.4 |
| `hit_arrow` | Pfeil: Heranzischen, harter Tock, Schaft schwirrt | 0.34 (0.36) | −17.0 (−17.1) | −4.2 |
| `miss` | Daneben/Wurf: Luftzug steigend, dann fallend, kein Aufprall | 0.39 (0.42) | −25.8 (−25.8) | −13.8 |
| `atk_crossbow` | Armbrust: Abzug klackt, straffe Sehne schnappt, Bolzen-Luftzug | 0.26 (0.41) | −17.8 (−17.9) | −4.9 |
| `atk_spiritbow` | Bogen: tiefer Sehnen-Twang, Holz-Wurfarme, Pfeil-Luftzug | 0.47 (0.41) | −18.5 (−18.5) | −6.9 |

**Warnung und Gefahr**

| Datei | Kiez-Klang | Dauer s (alt) | Lautheit dB (alt) | Peak dBFS |
|---|---|---|---|---|
| `health_warn` | Bass vom Nachbarn wummert durch die Wand: Lub-Dub, tief und weich | 0.57 (0.88) | −16.4 (−16.4) | −3.8 |
| `health_critical` | Schnelleres Wummern + zweitöniger Kassen-Fehlerpiep | 0.76 (1.02) | −13.3 (−13.3) | −1.8 |
| `alert` | Autoalarmanlage: zwei Heuler, dann Zweiklang-Hupen (weich gefiltert) | 2.90 (2.48) | −15.3 (−15.3) | −3.8 |
| `trap` | Falle: Quietscheente wird zertreten + Plopp | 0.21 (0.13) | −17.0 (−17.0) | −12.7 |
| `boss` | Boss erscheint: tiefes Baustellen-Signalhorn in Moll + Rumms | 3.89 (3.34) | −19.0 (−19.0) | −3.6 |
| `challenge` | Kampfansage: Druckluftfanfare wie im Stadion, kurz-kurz-lang | 3.34 (3.60) | −13.2 (−13.2) | −2.9 |
| `cursed` | Verflucht: Fehlersummer vom Amt, schwebend tief | 0.55 (0.55) | −14.8 (−14.8) | −6.1 |
| `debuff` | Schwächung: "Bu-dumm", zwei weiche fallende Töne | 1.38 (1.18) | −23.1 (−23.1) | −11.7 |
| `degrade` | Etwas geht kaputt: Luft zischt aus dem Fahrradreifen, dazu Wah-Wah abwärts | 1.96 (2.09) | −19.9 (−19.9) | −9.4 |
| `death` | Tod: der Rollladen rattert herunter und knallt auf | 2.43 (2.09) | −20.0 (−20.0) | −2.0 |

**Gegenstände, Zauber, Gegner**

| Datei | Kiez-Klang | Dauer s (alt) | Lautheit dB (alt) | Peak dBFS |
|---|---|---|---|---|
| `eat` | Baklava aus der Papiertüte: Knistern, dann zwei knusprige Bissen | 0.78 (0.89) | −33.1 (−33.1) | −20.1 |
| `drink` | Kronkorken-Plopp, Zischen, zwei Schlucke | 0.73 (0.60) | −29.1 (−29.1) | −18.7 |
| `read` | Formular: Blatt umschlagen, Stempel drauf | 0.47 (0.42) | −23.0 (−23.0) | −7.8 |
| `lullaby` | Schlaflied: kleine Spieluhr, eigene Melodie | 2.25 (1.92) | −19.7 (−19.7) | −8.8 |
| `shatter` | Flasche zerbricht: Aufprall, Krachen, viele einzelne Scherben | 0.44 (0.55) | −12.0 (−12.0) | −1.4 |
| `zap` | Elektro-Zap aus dem Zauberstab (Stromkasten-Knistern) | 0.63 (0.70) | −21.2 (−21.1) | −4.2 |
| `lightning` | Blitz: scharfer Überschlag, Knistern, kurzes Grollen | 0.52 (0.42) | −23.6 (−23.8) | −6.3 |
| `evoke` | Aufladen eines Artefakts: elektrisches Anschwellen + Pling | 0.89 (0.91) | −12.4 (−11.9) | −1.1 |
| `tomb` | Mülltonnendeckel knallt zu | 0.31 (0.29) | −20.5 (−20.4) | −8.2 |
| `meld` | Wand verschmilzt: tiefes Wuusch wie Bauschaum | 0.55 (0.52) | −25.3 (−25.3) | −16.8 |
| `blast` | Explosion: Druckwelle, Rumpeln, Schutt, Hinterhof-Reflexionen | 1.04 (1.04) | −11.9 (−11.9) | −1.2 |
| `plant` | Pflanze sprießt: Blumentopf-Plopp mit etwas Erde | 0.26 (0.26) | −39.2 (−39.2) | −29.0 |
| `ray` | Strahl: brummender Elektrostrahl (Oberleitung) | 1.10 (1.10) | −17.7 (−17.7) | −1.8 |
| `beacon` | Leuchtfeuer: Sonar-Ping wie ein Signal aus dem Treppenhaus | 0.94 (0.89) | −23.3 (−23.3) | −12.8 |
| `teleport` | Teleport: U-Bahn-Türen piepen, schließen zischend, weg | 1.33 (1.31) | −22.1 (−22.1) | −9.0 |
| `charms` | Bezirzt: Fahrradklingel, zweimal "Ring-ring" | 0.76 (0.70) | −24.1 (−24.1) | −17.1 |
| `mastery` | Spezialisierung: Stempel "Genehmigt!" + heller Akkord | 0.78 (0.70) | −14.9 (−14.9) | −1.6 |
| `puff` | Rauchwolke: Spraydose schütteln (Kugelklacken) und Psst | 0.47 (0.44) | −20.2 (−20.1) | −9.3 |
| `rocks` | Bauschutt rutscht in den Container | 1.28 (1.30) | −18.5 (−18.5) | −4.1 |
| `burning` | Brennen: Holzkohlegrill knistert, leises Fauchen | 0.84 (0.78) | −27.0 (−27.0) | −11.1 |
| `falling` | In die A100-Baugrube: Lotusflöte (Zugpfeife) abwärts, dann Plopp | 1.41 (1.41) | −16.7 (−16.6) | −7.6 |
| `ghost` | Geist: Wind im Hinterhof + gehauchtes "Huuu" | 2.40 (2.06) | −21.9 (−21.9) | −11.7 |
| `secret` | Geheimnis entdeckt: Pfandflaschen-Glockenspiel aufwärts | 1.85 (1.78) | −23.2 (−23.2) | −11.7 |
| `bones` | Knochenhaufen: Pfandflaschen klappern im Kasten | 0.81 (0.86) | −26.2 (−26.2) | −13.0 |
| `bee` | Bienen: Wespenschwarm am Späti-Kuchen | 1.15 (1.10) | −31.6 (−31.6) | −17.5 |
| `mimic` | Mimic: Sperrmüll-Schrank schnappt zu und knurrt | 0.86 (0.89) | −12.5 (−12.0) | −1.0 |
| `chargeup` | Aufladen: E-Scooter-Akku summt hoch, Klick bei voll | 1.15 (1.19) | −21.4 (−21.4) | −13.7 |
| `gas` | Gas: Ventil quietscht, dann zischt das Leck | 1.57 (1.59) | −21.2 (−21.2) | −9.7 |
| `chains` | Ketten: Fahrradschloss-Kette rasselt | 0.57 (0.68) | −20.2 (−20.4) | −8.3 |
| `scan` | Scannen: Barcode-Scanner piept, dann tastet ein Sonar-Sweep den Raum ab | 1.67 (1.91) | −17.8 (−17.8) | −9.7 |
| `sheep` | Schaf: ein blökendes "Määäh" (Kiez-Ziege aus dem Streichelzoo) | 0.55 (0.53) | −23.4 (−23.4) | −13.1 |
| `mine` | Abbau: Spitzhacke auf Beton, Bröckeln | 0.78 (0.82) | −20.3 (−20.3) | −7.0 |
| `badge` | Erfolg: der Pfandautomat rattert und sagt "Dan-ke" (Roboterstimme) | 0.94 (0.99) | −30.8 (−30.7) | −18.2 |
| `levelup` | Stufenaufstieg: die Türklingel vom Späti, "Ding-Ding-Dong" aufwärts | 1.78 (1.51) | −17.8 (−17.8) | −4.8 |

### Reproduktion

```bash
pip install --user numpy scipy soundfile lameenc
python3 tools/generate-kiez-sfx.py                       # alle 67 nach core/src/main/assets/sounds/
python3 tools/generate-kiez-sfx.py --only hit,alert      # einzelne Sounds
python3 tools/generate-kiez-sfx.py --out /tmp/x --wav    # woanders hin, zusätzlich WAV zum Anhören
python3 tools/generate-kiez-sfx.py --measure DIR         # MP3s in DIR messen (Zeilen im REF-Format)
```

Laufzeit: etwa 5 Sekunden. Die Tabelle oben entspricht der Konsolenausgabe des Skripts.

### Offene Punkte

- **Waffenklänge, zweite Fassung: noch nicht angehört.** Bitte vor allem prüfen: Klingt `hit` bei hunderten
  Monster-Treffern angenehm dumpf? Ist `atk_spiritbow` jetzt klar vom Handschuh zu unterscheiden? Bleibt der
  Klingen-Nachklang in `hit_slash` und das Klingen in `hit_parry` unaufdringlich? Klingt `miss` als
  Wurfgeräusch mit Tonhöhe 1,5 noch wie ein Wurf? Auf Handylautsprechern verlieren `hit_crush`, `hit_strong`
  und `blast` ihren Bass (75–93 % der Energie unter 200 Hz), dort bleiben nur Anschlag und Textur übrig.
- **Nicht angehört, nicht im Spiel getestet.** Geprüft wurden nur Messwerte und Spektrogramme. Ein Mensch
  muss prüfen, ob die Klänge erkennbar und nicht nervig sind, besonders `alert`, `health_critical`, `badge`
  (Roboterstimme „Dan-ke“, synthetisch und eventuell schwer verständlich), `sheep` und `degrade` (Wah-Wah).
- Laden unter libGDX ist nicht verifiziert. Das Format (MPEG-1 Layer III, 44,1 kHz, Mono) ist Standard und
  entspricht bereits einigen Upstream-Dateien.
- iOS: Die iOS-Kopien der Sounds wurden nicht angefasst und enthalten weiter die Upstream-Sounds.
- Credits: Die Upstream-Soundeffekte stammen von Celesti (README, AboutScene). Ob der Credit bleibt oder um
  „Kiez-Sounds: synthetisch erzeugt“ ergänzt wird, entscheidet der Integrationsagent. Der README-Satz, die
  Soundeffekte seien noch die des Originals, ist überholt.

## Intro-Klangbett (Bilder-Intro, `IntroScene`)

Stand: 2026-09-29, Gameplay-/Audio-Agent. Status: **generiert, eingebaut, auf Desktop (Xvfb, ohne
Audiogerät) durchgeklickt; von niemandem angehört.** Geprüft wurden Messwerte und Spektrogramme.

### Was läuft wann

Das Intro läuft jetzt vor **jedem** neuen Spiel (normal, mit Seed und Daily), Überspringen bleibt. Der
Einstieg ist `IntroScene.startNewGame()` (beide Start-Knöpfe in `HeroSelectScene`). `SPDSettings.introSequenceSeen`
wird weiter gesetzt, unterdrückt aber nichts mehr.

| Seite | Datei | Wiedergabe | Inhalt |
|---|---|---|---|
| 1 Bushaltestelle | `intro_1.ogg` (32 s) | Loop | Regen (Rauschen + Tropfen-Prasseln in 7 Bändern + Aufschläge aufs Plexiglasdach + Rinnsal), ferne Stadt, zwei Autos auf nasser Straße, Theme-1-Pad Am9/Fmaj7 und das Theme-Motiv als weiche Sägezahnlinie |
| 2 Bus fährt ab | `intro_2.ogg` (36 s) | einmal, danach `intro_1` als Loop | Türzischen + Türschlag, Druckluftbremse löst (nah, rechts), Sechszylinder-Diesel beschleunigt mit zwei Schaltpausen und entfernt sich nach rechts (Pegel ~1/d, Luftdämpfung per Tiefpass), hält fern an einer Ampel (leises Druckluftzischen mit Hall), fährt weiter; danach Regen, Pad kehrt zurück |
| 3 Hausflur | `intro_3.ogg` (24 s) | Loop | Minutenlicht: Taster + Relais-Klick, Lampenbrummen (gepulstes Rauschen, 100 Hz), 24 Schritte die Steintreppe hinab mit zwei Absätzen, werden nach unten dunkler; bei 21 s Relais-Klick, Licht aus; Regen von draußen gedämpft; Treppenhaus-Hall mit frühen Reflexionen |
| 4 Brandschutztür | `intro_4.ogg` (23,2 s = 12 Takte à 124 BPM) | einmal, harter Schnitt beim Umblättern, danach `intro_keller` | RUMS: Luftzug, Schlag aus rauschangeregten Blechmoden (58–1570 Hz, gedämpft), Druckwelle, Schlossfalle, Nachrappeln, Kellerhall (RT60 2,7 s); dann Stille, Raumton, Tropfen und ferner Clubbass blenden ein |
| danach | `intro_keller.ogg` (31,0 s = 16 Takte) | Loop | Keller-Stille: sehr leiser Raumton, Tropfen (Auftreffklick + rauschangeregte Blasenresonanz mit steigender Tonhöhe), Kick + Offbeat-Bass eines Clubs hinter Beton (Tiefpass 95 Hz), kaum hörbares Pad |

Übergänge: Seite 1 blendet die Titelmusik 0,6 s aus, Seite 2 0,15 s, Seite 3 0,45 s, Seite 4 schneidet hart
(der Schlag soll überraschen). Beim Start (Ende oder Überspringen) blendet das Intro 0,4 s auf `intro_keller`
über; der Keller läuft unter der Regions-Einleitung in `InterlevelScene` weiter, bis `GameScene` wie gewohnt
die Levelmusik startet. Zurück zum Titel: 0,8 s Ausblende. Alles läuft über `Music.INSTANCE`, also mit der
Musik-Lautstärke und dem Musik-Schalter des Spielers. Ist Musik aus, bleibt das Intro stumm.

### Qualitätsregel

Nach der Ablehnung der synthetischen Soundeffekte („billig, wie Plastik“) enthält das Intro nur Klänge, die
sich rauschbasiert glaubwürdig erzeugen lassen: Regen, Reifen auf nasser Straße, Stadtrauschen, Druckluft,
Diesel aus Rauschimpulsen mit Karosserieresonanzen und Sättigung, Schritte (Absatz, Körper, Abrollen,
Schleifen mit Sandkörnern), Klicks, Tür über rauschangeregte Resonatoren. Räume per Faltung (diffuser Nachhall
plus frühe Reflexionen), Entfernung per Pegel und Tiefpass. Keine reinen Sinus-Klänge, keine Melodie-Pieptöne.
Einzige tonale Elemente: das Pad aus verstimmten Sägezähnen (wie im Soundtrack) und die Club-Kick, die nur
unter 95 Hz durch die Wand kommt.

### Messwerte (dekodierte OGG, gleiche grobe K-Gewichtung wie oben)

| Datei | Dauer s | Peak dBFS | Lautheit | Kurzzeit min/max (3 s) | Schwerpunkt Hz | Anteil > 8 kHz | Loop-Naht (Sprung / lokaler Max.-Schritt) | KB |
|---|---|---|---|---|---|---|---|---|
| intro_1 | 32,0 | −9,5 | −27,2 | −29,6 / −23,8 | 3832 | 2,2 % | 0,012 / 0,041 | 463 |
| intro_2 | 36,0 | −5,0 | −26,8 | −31,0 / −20,7 | 3618 | 1,5 % | – | 526 |
| intro_3 | 24,0 | −4,3 | −28,6 | −33,3 / −25,5 | 1753 | 0,05 % | 0,004 / 0,005 | 326 |
| intro_4 | 23,2 | −4,2 | −30,9 | −43,4 / −26,4 | 997 | 0,02 % | – | 292 |
| intro_keller | 31,0 | −6,5 | −31,1 | −32,0 / −30,3 | 860 | 0,01 % | 0,0005 / 0,002 | 409 |

- Pegelbezug: Soundtrack −26,0 dB. Das Außen-Bett liegt 1 dB darunter, der Bus kurz 5 dB darüber, der Keller
  bewusst 5 dB darunter (Stille). `intro_2` nutzt dieselbe Verstärkung wie `intro_1` und `intro_4` dieselbe wie
  `intro_keller`, damit Regen bzw. Keller beim Wechsel auf den Loop gleich laut bleiben.
- Regen ist naturgemäß heller als die Musik (Schwerpunkt 3,6–3,8 kHz); Master-Tiefpass 11 kHz, Anteil über
  8 kHz 1,5–2,2 %.
- Summe: 5 Dateien, 2,0 MiB.

### Reproduktion

```bash
python3 tools/generate-kiez-intro-audio.py                        # alle fünf nach core/src/main/assets/music/
python3 tools/generate-kiez-intro-audio.py --report /tmp/x --wav  # dazu Metriken, WAVs, Spektrogramm-PNG
python3 tools/generate-kiez-intro-audio.py --analyze-only --report /tmp/x
```

Laufzeit etwa 30 s. Deterministisch (Seeds aus CRC32 der Namen); zwei Läufe ergaben identisches dekodiertes
Audio. Vorbis `compression_level=0.6` (etwas besser als der Soundtrack, Rauschen verträgt starke Kompression
schlecht). Bausteine (Filter, Hall-Impulsantwort, Pad, Lautheitsmaß, OGG-Schreiber) kommen aus
`tools/generate-kiez-music.py`.

### Offene Punkte

- **Nicht angehört.** Bitte besonders prüfen: Klingt der Regen nach Regen oder nach Rauschen? Ist der Diesel
  glaubwürdig (Zündfrequenz 30–75 Hz, Nageln)? Ist der Türschlag wuchtig genug, ohne zu erschrecken? Ist der
  Clubbass auf Laptop-Lautsprechern überhaupt hörbar (fast nur unter 100 Hz)?
- Beim Wechsel von einer Einmal-Datei auf den Loop (`intro_2` → `intro_1`, `intro_4` → `intro_keller`) startet
  libGDX eine neue Datei; eine kurze Lücke (einige zehn ms) im Regen bzw. Raumton ist möglich.
- Auf Desktop ohne Audiogerät getestet: Seitenwechsel, Überspringen, Start und zweites neues Spiel mit
  gesetztem Flag laufen ohne Fehler. Die Wiedergabe selbst wurde nicht gehört.
- **iOS:** `Music` ersetzt dort `.ogg` durch `.mp3`; `ios/assets/music/intro_*.mp3` fehlen (kein Encoder im
  Container). Ohne sie bleibt das Intro auf iOS stumm (die Ausnahme wird von `Music` abgefangen). Zuständig:
  Integrationsagent.
