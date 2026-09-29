# Neukölln Pixel Dungeon: UI-Art (Abzeichen, Talente, Rahmen)

Stand 2026-09-29. Erzeugt von `node tools/generate-kiez-ui.cjs` (reines Node mit zlib über
`tools/lib/tileset-kit.cjs`, keine Zufallszahlen; zwei Läufe liefern byte-identische Dateien, per
md5 geprüft). Jedes Sheet startet vom unveränderten Upstream-PNG (git `4256b22`), das Skript ist
also beliebig oft wiederholbar. `--only badges,icons,frames` schränkt ein, `--preview DIR` schreibt
je Sheet `ui-<name>-vorher-nachher.png` (links upstream, rechts neu).

**Nicht im Spiel getestet.** Kein Build, kein Desktop-Lauf (Vorgabe Art-Runde 2). Geprüft nur über
Vorschaubilder und Skript-Checks.

## Dateien und Motive

| Datei | Änderung |
| --- | --- |
| `interfaces/badges.png` | Innenfeld aller Abzeichen neu, Rahmen je Stufe (Bronze bis Diamant) unverändert |
| `interfaces/talent_icons.png` | Zeilen 0-3 (Alteingesessene, Expat, Tourist, Zugezogene) neu, Spalten 0-25 |
| `interfaces/hero_icons.png` | Subklassen 0-7, Rüstungsfähigkeiten 16-27, Aktionsknöpfe 104-107 neu |
| `interfaces/chrome.png`, `status_pane.png`, `toolbar.png`, `menu_button.png`, `menu_pane.png`, `talent_button.png`, `boss_hp.png`, `radial_menu.png` | Stein-Material umgefärbt, Fensterecken Messing, Inventar-Knopf Jutebeutel |

### Abzeichen (Motiv nach deutschem Titel in `misc_de`)

Feldfarben bleiben die Upstream-Familienfarben (Ausnahmen: „Späti hatte zu“ grau, „Eigentor“
Rasengrün, „Bunt wie ein Späti-Kühlschrank“ blau, Spielanzahl-Reihe Klinkerrot). Motive:
Heldengesichter frontal (0 Alteingesessene, 1 Expat, 2 Tourist, 3 Zugezogene nach den Helden-Sprites;
4/5 Duelist/Kleriker upstream), Kammerjäger = Fliegenklatsche, Gold = Münze, zwei Münzen, Stapel,
Zweitwohnung, Häuserzeile, Gegenstandsstufe = Akkuschrauber, Stufe = Schlüssel/Schlüsselbund,
Stärke = Umzugskarton, Essen = Döner, Alchemie = Kombucha-Bügelglas, Bosse = Schimmelfleck,
Wartenummer, Bauhelm, Krone mit Stempel, Tode = Flamme, Giftblase, Gaswolke, Späti-Rollladen,
Treppenhaus, Blitz, Eigentor, blaue Opferflamme, Hundehaufen, Grabkerze, Forscher = Lupe über
Kleingedrucktem, Spielanzahl = Klingelschild, Highscore = Kurve, dazu Sprechblase mit Herz, Brief mit
Siegel, Jutebeutel, Pulle+Formular, Bake, Fisch, Sense, Lastenrad, Boxhandschuh, Fernglas,
Mietvertrag mit Siegel, Vertrag mit vier Unterschriften, Späti-Kühlschrank, Gästeliste, Würfel,
Ratte, Pokal (Bronze/Silber/Gold getönt), Friedenstaube, Spitzhacke; Boss-Herausforderungen mit
Funkeln bzw. durchgestrichener Wartenummer, „Grundübel beseitigt“ = gesprungener Mietspiegel.

### Talente und Heldensymbole (Motiv nach `actors_de`)

- Subklassen: Wutbürgerin Wutgesicht, Kiezboxerin Boxhandschuh, Hands-on-Gründer Selfie-Stick als
  Knüppel, Growth-Hacker Hockeyschläger-Kurve, Schnappschütze Kamera, Sightseeing-Sprinter Socke in
  Sandale, Abstandshalterin Maßband, Baumscheibenpatin Baum mit Zaun.
- Fähigkeiten: Sprung übern Hof (Bogen über Mauer), Ruhe da unten! (Besen klopft), Aussitzen
  (Ohrensessel), Disruption, Brainstorming (Glühbirne), Homeoffice-Anker (Laptop mit Pin),
  Blitzlicht, Roter Pin, Partnerlook (zwei Hüte), Upcycling-Klingen (Cutter), Balkonkraftwerk,
  Geistertaube.
- Einzeltalente, z. B. Schmalzstulle, Brille („Kenn ick schon“), Haustür („Ick wohn hier“),
  Currywurst, Wegbier, Aufnäher, Klappstuhl („Hier geh ick nich weg“), Kohleneimer; Bowl, Matcha,
  Notausgangsschild („Exit-Strategie“), Radar, Burn-Rate-Akku, Hot Desking; Kaffee to go,
  Schneekugel, Guide-Schirm, Pommes, Reiseführer, Rollkoffer, Karte, Bären-Anhänger, Poncho;
  Brombeeren, Preisschild, Balkonkasten, Smoothie, Gießkanne, Pflanzkelle, Ohr, Upcycling-Pfeile,
  Zielscheibe mit Pfeil („Zu nah dran“), Fenster mit Auge („Vorab-Besichtigung“).
- Mechanik-Lesbarkeit: Hintergrundfarbe jeder Talentzelle bleibt die Upstream-Farbe (Mahlzeiten
  grün usw.). Die kleinen Effekt-Overlays unten rechts (Heilkreuz, Schild, Aufwertungspfeil, Ladung,
  Herz …) werden aus dem Upstream-Sheet übernommen: bei Subklassen-/Fähigkeitsgruppen als Differenz
  zum gemeinsamen Grundbild (Modus über die drei Zellen plus Heldensymbol), bei den Mahlzeiten
  (Spalten 0 und 4) als Differenz über alle sechs Klassen. Talentgruppe und Heldensymbol nutzen
  dasselbe Piktogramm.

### Rahmen

Grün-grauer Stein wird warmer Altbau-Putz: Pixel mit geringer Sättigung und Grünstich werden auf
einen warmen Farbton gleicher Luminanz gesetzt, Kontrast zu Text bleibt dadurch gleich. Reine Grautöne
(Schildbalken, Silberfenster, Edelstein), Rot (HP, Menüknopf), Gelb (XP), Schlüsselfarben und
Papierrolle bleiben. Alpha ist in allen Rahmen-Sheets bitgleich zu upstream (Skript bricht sonst ab;
Ausnahme nur der neu gezeichnete Inventar-Knopf 160,0,16,16 in `toolbar.png`). Fenster-Ecknieten
(`WINDOW`, je 5x5) sind Messing wie ein Klingelschild. Neun-Patch-Ränder, Ausschnitte und Größen
unverändert.

## Bewusst offen

- `buffs.png`, `large_buffs.png`: unverändert. Die Buff-Namen sind weitgehend generisch (vergiftet,
  brennend, Eile …); die Upstream-Symbolik ist eindeutig und farbkodiert, ein Umzeichnen ohne
  Spieltest hätte Verwechslungsrisiko. Kandidaten für später: gut genährt (Döner), Kombi (Boxhandschuh),
  Markierung der Abstandshalterin (Maßband), „als Lead markiert“.
- `effects/spell_icons.png`, `effects/text_icons.png`, `interfaces/locked_badge.png`: unverändert
  (Symbole für Zauber/Textmarken bzw. neutrales Grau, kein Neukölln-Bezug nötig).
- Duelist/Kleriker-Zeilen (talent_icons Zeilen 4-5, hero_icons 8-11, 28-66, 108-110), Heroic-Energy-
  Spalte 26-31 und Rattifizieren-Talente bleiben upstream (nicht spielbar bzw. klassenneutral).
- `BadgeBanner.highlight` setzt das Funkeln auf die erste Motivkante in Zeile 4; bei manchen Motiven
  liegt es damit am Umriss statt wie upstream am Bildrand-nahen Motivpixel. Rein kosmetisch.
- Im Spiel zu prüfen: Lesbarkeit der 16px-Talente bei 1x/2x, Abzeichen-Raster, warme Fensterfarbe
  mit weißem/gelbem Text, Messingecken bei großen Fenstern.
