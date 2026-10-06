# Instagram-Carousel „Einziehen“ (Stand 2026-10-06, Version 0.1.1)

Zehn Folien in `folien/`, 1080 × 1350 px (4:5), in Dateireihenfolge hochladen.

## Caption

```
Irgendwo unter Neukölln liegt der letzte unbefristete Mietvertrag Berlins. Kaltmiete von 1987.

Pixel Dungeon Neukölln ist ein kostenloses Roguelike auf Deutsch. Du willst nur kurz das Fahrrad aus dem Keller holen, dann fällt die Brandschutztür zu. Ab da geht es 25 Ebenen abwärts: vorbei an Leihscootern, Maklern und der Hausordnungs-Hydra bis zum Endgegner, dem Ewigen Mietspiegel.

Spielbar als Alteingesessene, Expat, Zugezogene oder Tourist. Rundenbasiert, jede Partie neu, dazu 31 Tracks Techno aus dem Keller.

Kostenlos für Android, Windows, macOS und Linux. Keine Werbung, keine Käufe im Spiel. Download: Link in Bio.

Version 0.1.1, noch in Sanierung. Android als APK, nicht im Play Store. iPhone kommt später. Mac: beim ersten Start Rechtsklick, Öffnen.

Wer bist du im Kiez?

Inoffizieller Fan-Fork von Shattered Pixel Dungeon (Evan Debenham), basierend auf Pixel Dungeon von Watabou. Open Source unter GPLv3. Alle Figuren frei erfunden.

#neukölln #berlin #pixelart #roguelike #indiegame #gamedev #opensource #pixeldungeon
```

## Link in Bio

`https://github.com/codeausberlin/pixel-dungeon-neukoelln#einziehen`

Führt auf die Tabelle „Einziehen“ im README: welches Paket für welches System, darunter der Link
auf die neueste Version. Die nackte Release-Seite zeigt zehn Dateien ohne Erklärung, daran
scheitern Leute, die nicht wissen, was `.msi` oder `.deb` heißt.

## Alternativtexte

Instagram: beim Posten „Erweiterte Einstellungen“ → „Alternativtext schreiben“, je Bild.

1. Pixelart: ein schiefes, verwittertes gelbes Ortsschild „Pixel Dungeon: Neukölln“ vor nächtlicher Berliner Skyline mit Fernsehturm. Text: Irgendwo unter Neukölln liegt der letzte unbefristete Mietvertrag Berlins. Altbau, Kaltmiete von 1987.
2. Kellerszene: Eine Brandschutztür knallt mit „RUMS!“ zu, davor eine Figur mit Taschenlampe. Text: Die M41 fährt weg, du holst das Fahrrad aus dem Keller, die Tür fällt zu, der Schlüssel liegt weiter unten.
3. Die Alteingesessene, ältere Frau im Trainingsanzug, vor einem Späti mit Dackel, Sprechblase „Ick wohn hier“. Rolle: Tank.
4. Der Expat mit Mütze und Brille in einem Café mit Leuchtschrift „Disrupt“, er hält einen leuchtenden Selfie-Stick. Rolle: Magier.
5. Die Zugezogene schießt vom Balkon mit Pfeil und Bogen in den Sonnenuntergang über Altbaudächern. Rolle: Fernkampf.
6. Der Tourist mit Sonnenhut und Kamera versteckt sich hinter einer Litfaßsäule, daneben U-Bahn-Schild, Späti und Grill. Rolle: Schleicher.
7. Sechs Pixel-Gegner mit Kurzbeschreibung: Leihscooter, Pfandgolem, Makler, Presslufter, Luxussanierer, Hausordnungs-Hydra. Jede Sonderattacke wird angekündigt.
8. Fünf Regionen mit Bossen: Neuköllner Hinterhöfe, Amt ohne Termin, ewige Baustelle, Renditequartier, unter dem Rathaus mit dem Endgegner Ewiger Mietspiegel.
9. Spielszene von oben: Die Heldin steht in einem Kellerraum, rechts eine Kabelschlange. Rundenbasiert, jede Partie neu, Spätimann auf Ebene 6, 11 und 16, 31 Tracks Techno.
10. Logo, daneben der Spätimann mit Sprechblase „Kostet nüscht, Kollege. Nich ma Pfand.“ Einziehen: kostenlos für Android, Windows, macOS und Linux, Download über den Link in der Bio.

## Beim Hochladen

- Beim Auswählen der Bilder auf das Format-Symbol unten links tippen, sonst beschneidet Instagram
  alle Folien auf 1:1 und schneidet Text ab.
- Eigene Musik: Bei Foto-Carousels bietet Instagram nur Titel aus der eigenen Musikbibliothek an
  (Stand Herbst 2026 nicht neu geprüft). Der eigene Soundtrack geht über ein Video, etwa ein Reel aus
  denselben Folien. `quelle/reel.sh` baut es aus einer Spieldatei der Wahl.

## Was die Folien behaupten, und woher

Alles aus README, Pressekit und Spieltexten (`actors_de.properties`), Stand Version 0.1.1:
vier Rollen von Anfang an spielbar, 25 Ebenen, fünf Bosse, Gegnermechaniken, Spätimann auf 6/11/16,
31 Tracks, Plattformen und Preis. Nicht behauptet wird, dass das Spiel fertig oder ausbalanciert ist:
Ein kompletter Lauf ohne Testhilfen steht laut README noch aus, Windows- und macOS-Pakete sind
nicht auf echten Geräten getestet. Daher „noch in Sanierung“ auf Folie 10 und in der Caption.

## Neu bauen

```
python3 docs/presse/instagram/2026-10-06-carousel/quelle/assets-vorbereiten.py
node docs/presse/instagram/2026-10-06-carousel/quelle/render.cjs
```

Braucht Python mit Pillow, Node mit Playwright (Chromium) und die Schrift Inter im System.
Texte stehen in `quelle/carousel.html`.
