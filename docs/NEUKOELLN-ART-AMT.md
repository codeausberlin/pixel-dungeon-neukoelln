# Neukölln Pixel Dungeon: Art Amt (Ebene 6-10)

Stand 2026-09-29. Die Gegner und die zwei Sondertile-Sheets der Region "Das Amt ohne Termin"
(upstream Prison) sind Reskins der Upstream-Sheets (Shattered Pixel Dungeon v4.0.0). Erzeugt
werden sie mit `node tools/generate-kiez-amt.cjs`. Der Schalter `--only guard,tengu`
schränkt auf einzelne Sheets ein, `--preview DIR` schreibt pro Sheet eine Vorher/Nachher-Vorschau
(`<sheet>-vorher-nachher.png`, Sprites sechsfach, Tiles dreifach). Das Skript nutzt nur Node und zlib.

**Vertrag:** Quelle ist immer das unveränderte Original als git-Blob, nie die eigene Ausgabe.
Zwei Läufe erzeugen byte-identische Dateien (geprüft per sha256). Sheetgröße, Frame-Raster,
Frame-Reihenfolge und der Alphawert jedes Pixels bleiben gleich; das Skript bricht sonst ab.
Geändert wird nur RGB: Paletten- und Helligkeits-Remaps und kleine Details innerhalb der
Silhouette, pro Frame an einem Anker ausgerichtet (Augen, Hand, Gürtel, Mantelschließe).
`XxxSprite.java`, `MassGraveRoom`, `RitualSiteRoom` und `PrisonBossLevel` bleiben unverändert.

| Sheet (Frame) | Upstream | Figur (Name aus `actors_de`) | Umsetzung |
| --- | --- | --- | --- |
| skeleton.png (12x15, Vault-Reihe 12x16) | Skeleton 0-16, Vault 21-37 | ewig Wartender | Knochen vergilbt (Elfenbein statt Weiß); auf den Rippen eine Wartemarke, weißer Zettel mit rotem Strich (liest sich in klein auch wie Hemd mit Krawatte). Anker: Augenpaar; die Idle-Frames 1-3 (nur Kopfdrehung) nutzen den Anker von Frame 0, damit nichts flackert. Vault-Bart bleibt |
| thief.png (12x13) | Thief 0-12 | Nummernklauer | Grüner Umhang wird verwaschener Petrol-Hoodie; das Messer wird eine geklaute Wartenummer (weiß + rot) |
| | Bandit 21-33 | Nummernhehler | Dunkler Maßanzug in Anthrazit mit feinen hellen Nadelstreifen und lila Einstecktuch; kein Trainingsanzug (Writers-Room-Leitplanke). Details nicht in den Todesframes 26-30 |
| dm100.png (16x14) | DM-100 0-15 | DM-100 Aufrufautomat | Kopfgehäuse cremefarbenes Blech, gelbes Auge wird rote LED-Anzeige im schwarzen Rahmen, unten ein weißes Ticket im Ausgabeschlitz; Beine bleiben Stahl; Todesframes dimmen die LED |
| | Vault 16-31 | DM-100 (Tresor) | Gleiches Gehäuse, Cyan-Anzeige bleibt als Unterscheidung |
| guard.png (12x16) | Guard 0-14 | Amtssecurity | Marineblaue Schirmmütze mit gelbem Abzeichen, dunkler Schirm, Gesicht bleibt, Kinnschutz wird Haut mit Mundlinie, Uniformjacke mit gelbem Brustabzeichen, dunkle Hose. Die hellgelbe Kette an der Hüfte bleibt exakt (sie ist seine Mechanik) |
| necromancer.png (16x16) | Necromancer 0-12 | Wiedervorlagebeamter | Kapuze wird graues Haar um ein verschattetes Gesicht, graue Augen werden Brillengläser mit Steg, brauner Cardigan, vor der Brust eine rote Wiedervorlagemappe mit weißem Etikett (Anker: Mantelschließe) |
| | Spectral 16-28 | Geister-Sachbearbeiter | Halbtransparenz bleibt, Schwarz wird kaltes Blaugrau, weiße Augen bleiben |
| tengu.png (14x16) | Tengu 0-10 (Boss) | Schalterspringer | Die Maske ist ein Formular (Papierweiß, der schwarze Augenschlitz liest sich als leeres Feld) mit violettem Amtsstempel; hellblaues Bürohemd, brauner Gürtel, graue Hose; schwarze Arme = Ärmelschoner, helle Kniewickel = Kniebandagen (wie im Text). Teleport-Rauch wird eine Wolke loser Formulare mit Zeilen und Stempelpunkten |
| custom_tiles/prison_quest.png (16x16) | Tisch (Tile 0/16) | Tisch im Ritualraum | Holzregal wird graubeiges Resopal, Blut wird violette Stempelfarbe, Knochen werden Papiere, Boden Linoleum |
| | Ritualzeichen (5x5 ab Tile 32) | Ritualzeichen | Roter Kreis bleibt (Stempelrot), Steinboden wird Amts-Linoleum (Vorlage: Bodentile aus `tiles_prison.png`) |
| | Massengrab (9x9 ab Tile 5), Knochenfeld (Tile 19) | Massengrab / Archiv | Wände: Beige-Kappe bleibt, Wandfläche exakt wie die Amtswand (grüne Farbe, Fliesensockel); Rundbogennische und Statuen bleiben; Boden abgedunkeltes Linoleum (Helligkeit pro 8x8-Feld aus der Quelle); Knochenstriche werden ein Aktenberg aus Papier, Manila-Mappen, einigen Knochen, roten Wiedervorlage- und blauen Mappen |
| custom_tiles/prison_exit.png (16x16) | Ausgang nach dem Boss | Durchbruch zur Baustelle | Aufgerissene Bodenziegel in Linoleum-Olivgrau, Fels und dunkler Tunnel bleiben, jede Stufenkante der Metalltreppe bekommt gelb-schwarze Warnmarkierung. Die zwei Tiles, die pixelgleich mit `tiles_prison.png`-Tile 91 und 116 sind, übernehmen die konvertierte Amt-Fassung (geprüft) |

Palette: Wartemarke `ffffff` / `d23a2c`; Petrol-Hoodie `163a44` `2f7280` `4a959e`;
Maßanzug `272a31` `363a43` `474c57`, Nadelstreifen `6a707c`, Einstecktuch `b86cc0`; Aufrufautomat `e6dfc6` `b8ad8c`, LED `ff4a3a` `ff7a5c`;
Security `161d36` `24305a` `34457a`; Beamter Haar `8a857c`, Cardigan `7a5c3a`, Mappe `d23a2c`;
Schalterspringer Maske `f4f0e2`, Hemd `8ea6c4`, Stempel `4a48a8`; Amtswand `7b9477` `869f82`
`a7a28b`, Linoleum `57594f` `505248` `42443c`, Warnmarkierung `c9a93a` / `2a2620`.

Offen und ehrlich vermerkt:
- Nur per Vorschau-PNG geprüft. Im Spiel (Licht, Nebel, Animation in Bewegung) sind die
  Reskins noch nicht getestet.
- Die Wartemarke des ewig Wartenden ist 3x2 Pixel; in Spielgröße wirkt sie auch wie ein Hemd mit
  roter Krawatte. Beides passt zur Figur, eindeutig lesbar als Zettel ist sie nicht.
- `prison_exit.png` liest Tile 91 und 116 aus der aktuellen `tiles_prison.png`
  (`tools/generate-amt-tiles.cjs`). Ändert sich deren Wandfassung, muss dieses Skript neu laufen.
- Die Nische im Massengrab ist mit fester Position (x 147-156, y 4-15) ausgespart, weil sie
  sich farblich nicht sauber von der Wand trennen lässt.
- Java-Farben bleiben upstream: Blutfarbe des Wartenden (Hellgrau), Funkenfarbe des Automaten,
  Zauberstrahl des Beamten, Kettenoptik (Effekt-Asset) der Security. Anpassung ist Sache des
  Gameplay-Agents.
- Die Wurfgeschosse des Schalterspringers und die Tengu-Arena-Fallen liegen in anderen Sheets
  und sind hier nicht angefasst.
- `actors.mobs.bandit.desc` spricht noch von einem "glänzenden lila Maßanzug". Die Grafik
  ist auf Anweisung des Koordinators anthrazit, Lila bleibt nur im Einstecktuch. Text oder Grafik
  sollten angeglichen werden (Lore-Agent).
