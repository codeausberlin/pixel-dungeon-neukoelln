# Pixel Dungeon Neukölln: Helden-Art

Stand 2026-09-29. Die vier spielbaren Heldenatlanten `core/src/main/assets/sprites/`
`warrior.png`, `mage.png`, `rogue.png` und `huntress.png` sind vollständig neu gezeichnete,
originale Pixelart. Sie ersetzen die Upstream-Figuren (Krieger, Magier, Schurke, Jägerin) und
übernehmen das Figurendesign der Splash-Bilder `splashes/nk_*.png`.

Erzeugt werden sie mit `node tools/generate-kiez-heroes.cjs` (`--only mage,rogue` schränkt ein,
`--preview DIR` schreibt je Klasse eine x6-Vorschau aller 7x21 Frames mit einer Vergleichszeile
"Frame 0 je Stufe, links neu, rechts upstream" und die Sammelvorschau
`heroes-sammelvorschau-x6.png`). Reines Node mit zlib, keine Zufallszahlen: zwei Läufe erzeugen
byte-identische Dateien (per md5 geprüft). Die Upstream-Atlanten werden nur für die Vorschau
als git-Blob gelesen.

## Atlasvertrag (HeroSprite.java)

- 256x128 RGBA, harte Alpha (nur 0 und 255; das Skript bricht sonst ab).
- Zeile r (y = 15r) = Rüstungsstufe r, 21 Frames zu 12x15. Zeile 7 (y 105-119) und
  x 252-255 bleiben leer wie upstream; `Hero.tier()` liefert höchstens 6.
- Frames: 0-1 idle (1 = Kopf dreht sich um), 2-7 laufen (4 und 7 Bodenkontakt, Körper 1 px
  tiefer), 8-12 sterben, 13-15 Angriff/Zap, 16-17 hantieren (Rückansicht), 18 fliegen
  (Beine angezogen), 19-20 lesen (Behördenbrief erst in der Hand, dann vor dem Gesicht).
- Kopf auf y 0-7, Füße auf y 14 in allen stehenden Frames aller Stufen (geprüft), wie upstream.
  Frame 0 hat Spalte 0 leer, Frame 1 ebenfalls; das Avatar-Bild (`uvRect(1,0,..)`, Spalten 1-12)
  schneidet daher nichts ab und zieht nichts aus Frame 1 herein.
- Pose und Timing folgen den Upstream-Frames; Java-Code bleibt unverändert.

Weitere Nutzer der Atlanten, alle mit Frame 0 bzw. den gleichen Indizes: `HeroSprite.avatar`
(Statusleiste, WndHero, WndRanking, WndGameInProgress, GameScene-Info), `StartScene`
(Spielstände, Frame 0 der gespeicherten Stufe), `HeroSelectScene` (Knopf: Frame 0 der Stufe 6),
`MirrorSprite` (Spiegelbilder), `ShadowClone` (rogue.png Stufe 6) und `PowerOfMany`.
`HeroSprite.tiers()` misst das Raster an `rogue.png`; die Größe bleibt 256x128.

## Figuren

| Atlas | Klasse | Kopf (in allen Stufen gleich) | Stufe 0 (ohne Rüstung) | Stufe 6 (Klassenjacke) | Accessoire / Waffe |
| --- | --- | --- | --- | --- | --- |
| warrior.png | Alteingesessene | Grau-lila Dauerwelle mit Lockenlichtern, Brille mit hellen Gläsern, strenger Mund | Hellblaue Kittelschürze mit weißen Tupfen, bloße Unterarme | Ballonseiden-Anzug: türkis, lila Passe und Kragen, weißer Reißverschluss, türkise Hose | Weiße Turnschuhe; im Angriff ein bordeauxroter Stockschirm |
| mage.png | Expat | Senfgelbe Slouch-Beanie mit Umschlag, braune Haare, runde Brille mit violetten Gläsern | Weißes Startup-T-Shirt | Gründer-Fleeceweste (marineblau, Reißverschluss) über dem mintgrünen Hoodie | Pinkes Lanyard mit Badge (alle Stufen); im Angriff Selfie-Stick mit violettem Leuchtpunkt |
| rogue.png | Tourist | Cremefarbener Sonnenhut mit roter Hutschnur und breiter Krempe, Sonnenbrand-Nase | Feinripp-Unterhemd, sonnenverbrannte Unterarme | Hawaiihemd: türkis mit rosa, orangen und weißen Blüten | Kamera vor der Brust, orange Bauchtasche, Khaki-Shorts, weiße Socken in Sandalen; Taschenmesser im Angriff |
| huntress.png | Zugezogene | Dunkle Aubergine-Mulletfrisur mit Pony, Ohrring | Colourblock-Oberteil wie auf dem Splash: türkis, rosa Streifen, creme Saum | Vintage-Cordjacke: ocker mit Cordrillen, cremefarbener Sherpakragen | Jutebeutel mit rotem Herz an der Hüfte (auch in der Rückansicht), Jeans; Bogen in den Angriffsframes (Sehne gespannt, voll ausgezogen mit Pfeil, gelöst) |

Gemeinsame Rüstungsstufen 1-5 (für alle Klassen gleich, klar unterscheidbar in Farbe und Form):

| Stufe | Item | Farbe | Form |
| --- | --- | --- | --- |
| 1 | Hoodie | Grau-lila | Dunklere Kapuze um den Hals und Kapuzenbeule hinter dem Nacken, weiße Kordeln |
| 2 | Lederjacke | Braun | Heller Kragen, silberner Reißverschluss |
| 3 | Bomberjacke | Oliv | Oranges Kragenfutter, dunkler Rippbund |
| 4 | Funktionsjacke | Signalrot | Dunkler Reißverschluss, Reflexstreifen an Saum und Ärmelbündchen |
| 5 | Türsteherweste | Schwarz | Graue Plattennaht quer über die Brust, bloße Unterarme |

## Verfahren

Jeder Frame wird aus Materialcode-Karten zusammengesetzt: eine gemeinsame Körperpose
(Zeilen 7-14), der Klassenkopf (12x8, Seiten- oder Rückansicht, bei Frame 1 gespiegelt), dann
Accessoires und Waffe an Ankern (`*` Brust, `+` Hüfte, `!` vordere Hand), die mit der Pose
wandern. Muster (Tupfen, Blüten, Cordrillen, Colourblock) sind am Brustanker ausgerichtet und
rutschen beim Laufen nicht. `o` ist eine selektive Kontur: ein abgedunkelter Ton des
angrenzenden Materials, wie bei den Upstream-Helden. Die Zugezogene hat eigene Posen für
13-15 (Bogenhaltung).

Sterben: 8 taumeln (Augen zu), 9 zusammensacken (sitzen), 10-12 bäuchlings hingestreckt,
Kopf links als kleine Klassen-Silhouette (Dauerwelle, Beanie, Haare; beim Touristen liegt der
Hut auf dem Rücken), 10 fällt noch 1 px. Kein Blut, passend zu `HeroSprite.bloodBurstA`.

## Offen

- Im Spiel noch nicht geprüft: Desktop-Build, Heldenwahl-Knopf, Statusleisten-Avatar,
  Rankings, Lauf- und Angriffsanimation in Bewegung, Spiegelbild und Schattenklon.
- Die Waffen in den Angriffsframes sind bewusst nur Andeutungen (2-4 px). Upstream zeigt keine
  Waffen; ob sie im Spiel lesbar sind oder stören, braucht einen Playtest.
- Die Liegeframes sind wegen der 12 px Breite kleiner im Kopfmaßstab als die stehende Figur.
- Duelist und Cleric (nicht spielbar) nutzen weiter die Upstream-Atlanten.
