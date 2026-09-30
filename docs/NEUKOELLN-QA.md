# QA-Lauf vor dem Launch

Datum: 2026-09-30, QA-Agent. Stand: Arbeitsbranch `f9163a7` (Merge neukoelln/prototype), Desktop,
INDEV-Build (`0.1.0-INDEV`), Xvfb 1024x640. Nichts behoben, nichts committet.

## Ergebnis in Kürze

- **Keine Abstürze.** In keinem Lauf stand "ist abgestuerzt" oder eine Exception im Log.
- **Keine Blocker.**
- **1 major:** englischer Dialog im Club (fehlende deutsche Keys, im Spiel reproduziert).
- Mehrere minor: abgeschnittene Titel und Buttons, kleine Namens- und Textinkonsistenzen.

## Testaufbau

- Build: `scratchpad/sync.sh`, danach eigene Kopie `scratchpad/qa/src`. Gestartet wurde direkt über den
  Klassenpfad von `desktop:debug` mit `-DSpecification-Version=0.1.0-INDEV`, `-Duser.home=scratchpad/qa/home`
  und `NK_START_DEPTH=<n>` (Skripte `scratchpad/qa/run.sh` und `scratchpad/qa/depth.sh`). Die Spielstände lagen unter
  `qa/home/.local/share/.neukoellnpixeldungeon/neukoelln-pixel-dungeon/`, also getrennt von Shattered (ok).
- Steuerung mit `scratchpad/qa/Shot2.java`: Kopie von `Shot.java`, zusätzlich mit `drag` und `scroll`.
- **Testhilfe nur in der Scratch-Kopie, nicht im Repo:** Ist die Umgebungsvariable `NK_QA` gesetzt, deckt
  `Dungeon.switchLevel` die Karte auf, setzt die LP auf 999 und schreibt die Gegnerliste jeder Ebene ins Log.
  `NK_QA_NEAR=<Klasse>` setzt den Helden neben diesen Gegner oder NPC, `NK_QA_HP=<n>` setzt die LP (bei 30 max. LP).
  Außerdem bekommt der Held im Nahkampf Treffsicherheit 10000 und Schaden 300. Grund: Mit einem Helden auf Stufe 1
  lassen sich die Ebenen ab 6 sonst nicht erkunden. Die Tests 1 (Klassen) und die Tests auf Ebene 5 liefen **ohne**
  diese Hilfe. Die großen dunkelblauen Flächen auf manchen Screenshots mit aufgedeckter Karte (z. B. `d6_z.png`, `d26_c.png`)
  sind vermutlich eine Folge dieser Hilfe und werden nicht als Befund gewertet.
- Alle Screenshots liegen unter
  `scratchpad/qa/`
  (im Folgenden nur der Dateiname).

## Getestete Pfade

| Bereich | Was geprüft wurde | Ergebnis | Screenshots |
| --- | --- | --- | --- |
| Start | Willkommensfenster, Heldenauswahl, Klassen-Info, Intro (4 Seiten durchgeklickt und übersprungen) | ok | `t0`, `t1`, `c1`, `c1_intro1..4`, `c3_info` |
| Alteingesessene | Tutorial-Start, laufen, Kiezführer lesen, Inventar, Hoftaube untersuchen und werfen, Wandtext (Barbershop) | ok | `c1_*` |
| Expat | Überspringen, laufen, Konfetti-Stick untersuchen und abfeuern | ok (Name siehe M5) | `c2_*` |
| Zugezogene | Überspringen, Sternchen-Pils untersuchen | ok | `c3_*` |
| Tourist | Poncho, Souvenir-Brieföffner, Graffiti "MIETE?!" | ok | `c4_*` |
| Speichern/Laden | Menü > Hauptmenü > Spielstand > Weiter (Ebene 1, 6 und im Club auf 17) | ok, Zustand bleibt erhalten | `c2_slots`, `c2_load`, `d6_reload`, `d17_reload` |
| Ebene 5 | Mietschimmel: Arena, Beschreibung, Kampfbeginn ("FALSCH GELÜFTET!"), Hoftaube auf den Boss | ok (ohne Testhilfe) | `d5_*` |
| Ebene 6 | Amt, Laden, Spätimann: reden (Expat-Text), Hoodie verkaufen (20g), Kaufdialog | ok | `d6_b`, `d6_shop*`, `d6_sold`, `d6_buyw` |
| Ebene 10 | Kurzparker: Schlüssel in der Zelle, Phase 1 mit Knöllchen-Haufen, Umparken, Arena Tempelhofer Feld (Asphalt, Kalkstein, Landebahnmarkierung), Abgasbombe, Sieg, Duftbäumchen, Unterklassenwahl | ok | `d10_*` |
| Ebene 11 | Spätimann auf der Baustelle (Ebenentext), Clubplakat-Wandtext | ok | `d11_*` |
| Ebene 12-14 | Netztechniker auf 14 (13 hatte ihn in einem anderen Seed auch), Questdialoge, Spitzhacke, Abstieg in den Kabelschacht, Wand abgraben, Glasfaserstück | ok | `d12_b`, `d14_*` |
| Ebene 15 | Bohrlinde: Versiegelung am Pylon, Boss-Spruch, Steinschlag-Markierung, Schaden, Aufladung ("unverwundbar, solange sie unter Strom steht") | ok; Kampf **nicht** zu Ende gespielt | `d15_*` |
| Ebene 16 | Renditequartier, Spätimann (Ebenentext) | ok (Inhalt siehe M9) | `d16_*` |
| Ebene 17 | Filialist (3 Dialoge), Club-Eingang, Club "Ilse" betreten, Vorgeschichte, Notausgangs-Bändchen (im Eingangsbereich abgelehnt, außerhalb Rückkehr mit kompletter Ausrüstung) | ok (siehe M1, M3, M7) | `d17_*`, `e1..e4` |
| Ebene 20 | König der Eigentumswohnungen: Thronsaal, Spruch, Beschreibung, Phase "Anleger erheben sich" mit Schild | ok; Kampf **nicht** zu Ende gespielt | `d20_*` |
| Ebene 21-24 | Unterwelt: Stadtmarketing-Sukkubus, Hausordnungs-Hydra (Log), Graffiti "WEG DA", je ein paar Züge | ok | `d21_*`, `d22_w`, `d23_w`, `d24_*` |
| Ebene 25 | Ewiger Mietspiegel: Spruch, 300 Schaden, Nebenkostenfaust samt Beschreibung, Faust in Augennähe unverwundbar | ok; Kampf **nicht** zu Ende gespielt | `d25_*` |
| Ebene 26 | Mietvertrag aufheben, Siegdialog "Schluss für heute", Siegfenster, Rangliste | ok (siehe M4) | `d26_*` |
| Texte statisch | Alle Keys in `*.properties` gegen `*_de.properties` abgeglichen | 4 fehlende Keys (M1) | - |

Nicht getestet: Die Bosskämpfe auf 15, 20 und 25 wurden nicht bis zum Ende gespielt (Tod des Bosses, Tor, Beute).
Die Club-Garderobe (7 Marken), der VIP-Bereich und der Laden des Filialisten weiter unten wurden nicht erreicht.
Terminhändler, Presslufter, Technojünger und Luxussanierer standen nur im Log und wurden nicht angesehen.
Tod des Helden und Rangliste nach einer Niederlage liefen nur nebenbei (Ebene 6, ohne Screenshot).
Android und iOS wurden nicht getestet.

## Befunde

### Blocker

Keine.

### Major

**M1 (behoben) Englischer Dialog im Club, wenn der Held angeschlagen ist.**
- In `items_de.properties` fehlen `items.quest.escapecrystal.injure_warning_1..3` und `injure_confirm`.
  Aufgerufen werden sie in `Hero.java` (Z. 950ff.): im `VaultLevel` bei LP < 1/3, höchstens 3-mal pro Installation.
- Der Spieler sieht dann den englischen Upstream-Text ("Time seems to slow down as you hear the Imp's voice ...",
  "teleport items from the starting room", "that crystal I gave you"). Das Fenster kann außerdem über der Vorgeschichte
  des Clubs liegen.
- Reproduktion: Club auf 17-19 betreten, dort Schaden nehmen, bis die LP unter 1/3 fallen. Im Test wurden die LP
  über die Testhilfe auf 9/30 gesetzt. Screenshot: `e4.png`.

### Minor

- **M2 Abgeschnittene Titel (behoben):** Das Fenster des Notausgangs-Bändchens zeigt "Notausgangs-Bändche", weil das
  Katalog-Icon den Titel überdeckt (`d17_band.png`). Das Info-Fenster des Königs zeigt "König der Eigentumswohnunc"
  (`d20_ex.png`). Reproduktion: Bändchen im Club antippen bzw. den König per Lupe untersuchen.
- **M3 Bändchen "jederzeit" (behoben):** Beschreibung, Einstiegsdialog und `NEUKOELLN-CLUB.md` versprechen, dass das Bändchen
  jederzeit nutzbar ist. Im Eingangsbereich lehnt der Filialist aber ab ("verlass wenigstens den Eingangsbereich",
  `d17_exit1.png`). Das ist Upstream-Mechanik, der Text sollte die Einschränkung nennen.
- **M4 Button abgeschnitten (behoben):** Im Siegfenster steht "Original unterstütze" statt "unterstützen" (`d26_win.png`).
- **M5 Namen uneinheitlich (behoben):** Das Item heißt "Konfetti-Stick", Beschreibung und Klassentext sagen
  "Selfie-Stick" (`c2_item.png`, `c2_sel.png`). Das Tutorial-Item heißt "Kiez-Überlebensratgeber", der Text darin
  und die Seiten sagen "Kiezführer" (`c1_guide.png`, `c1_journal.png`).
- **M6 Spielstandliste (behoben):** Der Name wird zu "Alteingesesse" gekürzt (`sel.png`, `c4_slots.png`). Dort steht auch
  "vor 1 Minuten" statt "vor 1 Minute" (`c2_slots.png`, `c4_slots.png`).
- **M7 Lore (behoben):** Der Hoodie kommt laut Beschreibung aus dem Club "Tresen" (`d6_sell.png`), der Club heißt sonst "Ilse".
  `shopkeeper.talk_halls` spricht noch von "Tresor" und "Fluchtkristall". Dieser Text ist derzeit nicht erreichbar,
  weil es auf 21 keinen Laden gibt.
- **M8 Icons beim Untersuchen von Wanddeko (Icon behoben, "W" offen):** Graffiti, Clubplakat und "WEG DA" zeigen im Untersuchen-Fenster eine
  leere Wand- bzw. Säulenkachel statt des Motivs (`c4_wall.png`, `d11_wall.png`, `d24_wall.png`). Beim "W" von
  "WEG DA" ist das Motiv schwer lesbar (sieht aus wie "HEG", `d24_crop.png`).
- **M9 Reale Person (entschärft):** Der Spätimann-Text auf Ebene 16 lautet "Der März war hier. Hat vorm Laden 'n Foto gemacht.
  Stadtbild und so." (`d16_talk.png`). Das spielt erkennbar auf eine reale Politikeräußerung an. Die Lore sollte das
  gegen die Regel "keine Behauptungen über reale Personen" prüfen. Die "MÄRZ"-Plakate an den Wänden gehören
  vermutlich zum selben Motiv.
- **M10 Debug-Start schaltet Abzeichen frei (behoben):** Mit `NK_START_DEPTH` gibt es sofort "Gewaltfreie Kommunikation" und
  "Liest Kleingedrucktes". Ein Sieg über Debug-Start schaltet Herausforderungen, Seeds und Tagesläufe frei. Das
  betrifft nur INDEV-Builds, verfälscht aber Tester-Profile.
- **M11 Wandplakate wiederholen sich (behoben):** "BÄRG" steht auf den Ebenen 11-15 oft mehrfach nebeneinander
  ("BÄRGBÄRGBÄRG", `d12_b.png`, `d15_c.png`). Das wirkt wie ein Kachelmuster.
- **M12 Englischer Rest (nicht erreichbar, behoben):** `actors.hero.spells.beamingray.desc` gehört zur Upstream-Klasse
  Kleriker, die es in diesem Fork nicht gibt.

### Weitere Beobachtungen (kein Handlungsbedarf)

- `PrisonBossLevel` Z. 703 schreibt `System.out.println(tries)` ins Log. Das stammt aus Upstream (Commit a4b1e26).
- Beim ersten Klick nach dem Umparken des Kurzparkers reagierte der Held kurz nicht auf Eingaben (`d10_t.png`).
  Danach lief alles normal.

## Nachtrag: Behebung (Fix-Agent, 2026-09-30)

Stand: nicht committet. Geprüft mit `check_props.py` (rc=0), `core:kiezSmokeTest` und `desktop:release` in
der Build-Kopie sowie im Spiel (INDEV, Xvfb :89, eigenes `user.home` unter `scratchpad/fx/home`, Screenshots
`scratchpad/fx/v_*.png`). Testhilfe `NK_QA` wie oben, nur in der Kopie `scratchpad/fx/src`.

- **M1 behoben:** `injure_warning_1..3` und `injure_confirm` auf Deutsch (Filialist, Ilse, Stempel aus dem
  Eingangsbereich, Exit-Bändchen). Skript über alle Bundles (EN-Key fehlt in `_de`): außerdem
  `levels.rooms.quest.ritualsiteroom$table.name/desc` ergänzt; jetzt fehlt kein Key mehr. Im Spiel gesehen
  (`v_inj.png`). Nebenbei: Nach Neuladen im Club erscheint die Vorgeschichte erneut unter dem Fenster
  (Spielstand wurde vor dem Setzen von `intro_shown` gesichert); nicht geändert, nur beobachtet.
- **M2 behoben:** Item heißt jetzt **Exit-Bändchen** (alle Texte angepasst, Aufdruck "Notausgang,
  jederzeit*" bleibt in der Beschreibung). Allgemein: `IconTitle` verkleinert die Schrift (9 bis 6), wenn ein
  einzelnes Wort nicht in die Titelzeile passt. `WndInfoMob` bricht lange Namen um; der König steht jetzt
  zweizeilig vollständig da (`v_king.png`, `v_band.png`).
- **M3 behoben:** Beschreibung ("jederzeit*" mit Sternchen: nicht im Eingangsbereich), Vorgeschichte und
  `NEUKOELLN-CLUB.md` nennen die Ausnahme. Mechanik unverändert.
- **M4 behoben:** Button heißt "Unterstützen" (`v_title.png`). Offen: im Hochformat (Fensterbreite 120)
  nicht geprüft.
- **M5 behoben:** Stab-Namen lauten "Selfie-Stick (Konfetti)" usw. (13 Zauberstäbe), in Fließtexten
  "Konfetti-Selfie-Stick" (`v_ex2.png`). Tutorial-Item, Statusmeldung und Seiten heißen durchgehend
  **Kiezführer** (Seite: "Seite aus dem Kiezführer"). Kiezführer nicht im Spiel angesehen, nur Text.
- **M6 behoben:** Klassenname in der Spielstandliste wird kleiner gesetzt, bis er vor das Treppen-Icon passt;
  60-119 s zeigen "vor einer Minute" (`StartScene`, `v_slots.png`).
- **M7 behoben:** Hoodie aus der "Ilse" (`v_hood.png`); `talk_halls` spricht von der Ilse und dem Exit-Bändchen.
- **M8 Icon behoben:** `WndInfoCell` zeigt bei Wandmotiven die Wandfront mit Motiv (`v_wall.png`, BÄRG).
  Offen (Art): Lesbarkeit des "W" in "WEG DA".
- **M9 entschärft:** Das Wort "Stadtbild" (Anspielung auf eine reale Äußerung) ist raus, im Spätimann-Satz
  und im Wahlplakat `maerz_1`. Neu: Fototermin-Parodie ("nah an den Menschen", Einkaufstüte mitgebracht),
  Plakat verspricht »mehr Tempo«. Name März bleibt (§8).
- **M10 behoben:** `Dungeon.debugStart` (gesetzt, wenn `NK_START_DEPTH` > 1 greift, im Spielstand
  gespeichert) unterdrückt in `Badges.displayBadge/unlock` alle Abzeichen, damit auch Sieg-Freischaltungen.
  Release unberührt (`debugStartDepth` liefert dort immer 1). Im Spiel: Start auf 17/20/12 ohne Abzeichen,
  keine `badges.dat` angelegt.
- **M11 behoben:** Auf der Baustelle (auch Arena 15) zeigt nur noch etwa jede zehnte glatte Wandmitte das
  BÄRG-Plakat statt fast jeder zweiten, und nie zwei nebeneinander (`DungeonTileSheet.getRaisedWallTile`,
  `WallDeco.PLAIN_ALT_CHANCE_BAUSTELLE`; `v_d12c.png`).
- **M12 behoben:** `beamingray.desc` übersetzt (Kleriker, nicht spielbar).
