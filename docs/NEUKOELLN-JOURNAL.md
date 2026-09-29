# Neukölln Pixel Dungeon – Journal (Tagebuch-Fenster)

Stand: 2026-09-29. Bestandsaufnahme und Umbau des Tagebuchs (`windows/WndJournal.java`,
Titelbild-Variante `scenes/JournalScene.java`). Referenz Upstream: `2bb34a4` (Shattered v4.0.0).
Methode: Code gelesen (`WndJournal`, `journal/Document`, `Notes`, `Catalog`, `Bestiary`,
`ui/Icons`, `ui/MenuPane`, `ui/CustomNoteButton`), Pixelvergleich der Zellen gegen `git show 2bb34a4:…`,
Key-Vergleich der `*_de.properties` gegen Upstream. Laufzeit: Desktop-Build unter Xvfb geprüft
(siehe unten).

Grafik-Generator: `tools/generate-kiez-journal.cjs` (deterministisch, liest Upstream-`icons.png`
aus git, ändert nur die unten gelisteten Zellen und bricht ab, wenn ein Pixel außerhalb davon
anders wäre). Aufruf: `node tools/generate-kiez-journal.cjs [--preview DIR]`.

## 1. Reiter und Seiten

Status: **alt** = pixel- bzw. textgleich mit Upstream, **neu** = Neukölln-Fassung, **neutral** =
Upstream-Wortlaut, aber reine Bedienung ohne alten Kanon (bleibt bewusst).

| Reiter/Seite | Element | Datei / Key | Status vorher → jetzt | Maßnahme |
| --- | --- | --- | --- | --- |
| Reiterleiste | Reiter „Kieznotizen" | `Icons.JOURNAL` → `interfaces/icons.png` (136,0,17×15) | alt → **neu** | Offene Kraftpapier-Kladde mit Spirale und roter Wartenummer. Auch Titelbild-Button „Tagebuch". |
| Reiterleiste | Reiter Kiezführer | `ItemSpriteSheet.MASTERY` (items.png, Index 62) | alt → alt | Nur dokumentiert (items.png gehört dem Item-Agenten). |
| Reiterleiste | Reiter Alchemie | `Icons.ALCHEMY` (96,48,16×16) | alt → **neu** | Roter Emaille-Einkochtopf mit grünem Gebräu. Auch AlchemyScene. |
| Reiterleiste | Reiter Katalog | `Icons.CATALOG` (80,48,13×16) | alt → **neu** | Blauer Aktenordner (Kanon: Aktenordner = Schriftrollenbehälter). |
| Reiterleiste | Reiter Abzeichen | `Icons.BADGES` (51,0,16×16) | alt → **neu** | Anstecker-Button mit Stern. Auch in WndRanking/Titel. |
| Reiterleiste | Tooltips | `windows.wndjournal$notestab.title`, `$badgestab.title`, `$guidetab.title`, `$alchemytab.title`, `$catalogtab.title` | teils alt → **neu** | „Kieznotizen", „Abzeichen" (statt „Abz."); Kiezführer/Handbuch waren schon neu; „Katalog" neutral. |
| Kieznotizen | Kopf, Beschreibung | `$notestab.title/desc`, `$notestab.floor_header`, `$notestab.custom_notes` | teils alt → **neu** | „Eigene Notizen" statt „Benutzerdefiniert"; `floor_header` neutral. |
| Kieznotizen | Ebenen-Gefühl (Treppe + Marker) | `Icons.STAIRS…STAIRS_SECRETS` (0..112,64, je 15×16) | alt → **neu** | Altbau-Kellertreppe (Eichenstufen mit Messingkante, Backstein). Marker oben rechts pixelgleich aus Upstream kopiert, damit sie zu den HUD-Tiefenicons passen. STAIRS erscheint auch in Start-/Ranglisten-/Ladebildschirm. |
| Kieznotizen | Ebenen-Gefühl Texte | `levels.level$feeling.*` (levels_de) | teils alt | **Offen**, nicht meine Datei (z. B. „hallen durch den Dungeon"). |
| Kieznotizen | Landmarke Späti | Sprite `ShopkeeperSprite`/`ImpSprite` | alt | Nur dokumentiert (Figuren-Sprites). Text `journal.notes$landmark.shop`: „Laden" → **„Späti"**. |
| Kieznotizen | Landmarke Alchemiekessel | `Icons.ALCHEMY` | alt → **neu** | Text bleibt „Alchemiekessel" (= Spielobjekt-Name). |
| Kieznotizen | Landmarke Garten | `Icons.GRASS` (112,48) | alt → **neu** | Hochbeet mit Sonnenblume und Tomate; Text „Garten" → **„Gemeinschaftsgarten"**. |
| Kieznotizen | Landmarke Brunnen der Gesundheit / Wahrnehmung | `Icons.WELL_HEALTH` (128,64), `WELL_AWARENESS` (144,64) | alt → **neu** | Rand als grüne Gusseisen-„Plumpe" mit Messingnieten; Wasser + rotes Kreuz / blaues ? aus Upstream (Bedeutung bleibt). Texte bleiben (= Objektnamen). |
| Kieznotizen | Landmarke Ferner Brunnen | `Icons.DISTANT_WELL` (176,64) | alt → **neu** | Loch in morschen Dielen, tief unten ein Brunnen; Text „entfernter Brunnen" → **„Ferner Brunnen"** (wie `levels_de` hiddenwell). |
| Kieznotizen | Landmarke Opferflamme | `Icons.SACRIFICE_ALTAR` (160,64) | alt → **neu** | Einweggrill vom Feld mit Schädel in den Flammen; Text bleibt (= `actors.blobs.sacrificialfire.name`). |
| Kieznotizen | Landmarke Statue | `StatueSprite` | alt | Sprite nur dokumentiert; Text „Belebte Statue" → **„Belebte Kunst-am-Bau-Statue"**. |
| Kieznotizen | Landmarke Kündigungsschleuder | `SpawnerSprite` | alt | Sprite nur dokumentiert; Text „Dämonenschleuder" → **„Kündigungsschleuder"** (Kanon). |
| Kieznotizen | Landmarken Quest-NPCs | `GhostSprite` (neu), `RatKingSprite`, `WandmakerSprite`, `BlacksmithSprite`, `ImpSprite` (alt) | gemischt | Nur dokumentiert; Texte waren schon Kanon. |
| Kieznotizen | Verlorener Rucksack | `Icons.BACKPACK_LRG` (0,48) | alt → **neu** | Jutebeutel mit Herz (Kanon: Tasche = Jutebeutel). Auch WndRanking. |
| Kieznotizen | Schlüssel-Einträge | Item-Sprites Schlüssel (items.png) | teils neu | Nur dokumentiert. |
| Kieznotizen | Eigene Notiz (Text) | `Icons.SCROLL_COLOR` (160,32,15×14) | alt → **neu** | Hausflur-Aushang mit Reißzwecke und Abreißzetteln (einer fehlt). |
| Kieznotizen | Eigene Notiz, Fenster | `ui.customnotebutton.*` (ui_de) | alt/neutral | `desc` → **neu** („Ebene des Untergrunds", „Sorte Pulle/Formular/Ring"); übrige Bedienknöpfe neutral. |
| Kiezführer | Seitenliste | Item-Sprite `GUIDE_PAGE` (items.png 496) | alt | Nur dokumentiert. |
| Kiezführer | Seitenbilder im Katalog/Lesefenster | `Document.pageSprite`: `MASTERY`, `Icons.MAGNIFY`, `Icons.SNAKE`, `ScrollOfIdentify`, `PASTY`, `TRINKET_CATA`, `TOMB`, `Icons.MAGNIFY`, `GREATAXE`, `RING_EMERALD`, `CRYSTAL_KEY`, `Icons.TALENT`, `SPIRIT_BOW`, `WAND_FIREBOLT` | gemischt | `Icons.SNAKE` (48,48,9×13) → **neu**: orange Verlängerungskabel mit Stecker (Kabelschlange). `MAGNIFY`, `TALENT` bleiben (allgemeine UI-Symbole, vielfach genutzt). Item-Sprites: PASTY, GREATAXE, CRYSTAL_KEY, SPIRIT_BOW schon neu; MASTERY, TRINKET_CATA, TOMB, RING_EMERALD, WAND_FIREBOLT noch alt (items.png, nur dokumentiert). |
| Kiezführer | Seitentitel/-texte | `journal.document.adventurers_guide.*` | Bodies schon neu, Reste alt → **neu** | „Dungeon" → Untergrund/Lauf/Ebene; Tränke/Schriftrollen → Pullen/Formulare (mit Kanon-Namen); Schlangen/Gespenster → Kabelschlangen/Vormieterspuk; Karton → Sperrmüllberg; Fallen → (Hunde-)Haufen; „Registerkarte Notizen" → Kieznotizen. Neutrale Seitentitel bleiben. |
| Kiezführer | Fehlende Seite | `$guidetab.missing` | neutral | bleibt. |
| Alchemie | Seitenknöpfe | Item-Sprites `SEED/STONE/FOOD/POTION/SCROLL/BOMB/MISSILE/ELIXIR/SPELL_HOLDER`, `SOMETHING`, `ALCH_PAGE` | alt | Nur dokumentiert (items.png). |
| Alchemie | Seitentexte | `journal.document.alchemy_guide.*` | teils alt → **neu** | Titel „Einleitung und Pullen", „Exotische Pullen", „Exotische Formulare", „Bowlen und Elixiere"; Bodies auf Pullen/Formulare/Samenbomben/Silvesterbombe umgestellt, Rezeptmechanik unverändert. |
| Katalog | Unterknöpfe | `WEAPON_HOLDER`, `POTION_HOLDER`, `MOB_HOLDER`, `DOCUMENT_HOLDER` (items.png) | alt | Nur dokumentiert. |
| Katalog | Kategorietitel | `journal.catalog.*`, `journal.bestiary.*` | alt → **neu** (Auswahl) | Pullen, Formulare, Samenbomben, exotische Pullen/Formulare, präparierte Dartpfeile, Bowlen und Elixiere, Bestiarium „Fallen" → **„Haufen"**. Übrige (Nahkampfwaffen, Ringe, Bomben …) neutral. |
| Katalog | Hinweise, Zähler | `$catalogtab.*` | alt | `not_seen_trap`, `trap_count` → **„Haufen"**; übrige neutral. `gold_count` bleibt „Gold" (= `items.gold.name`). |
| Katalog | Einträge | Item-, Gegner-, Fallen- (terrain_features.png, schon Hundehaufen), Pflanzen-Sprites | gemischt | Nicht Journal-eigen; nur dokumentiert. |
| Katalog → Hintergrund | Dokument-Icons | `Document.pageSprite`: `Icons.STAIRS` (Intros, **neu**), `SEWER/PRISON/CAVES/CITY/HALLS_PAGE` (items.png 498–502, alt) | gemischt | Seiten-Sprites nur dokumentiert. |
| Katalog → Hintergrund | Lore-Texte | `journal.document.intros/sewers_guard/prison_warden/caves_explorer/city_warlock/halls_king.*` | fast alle schon neu, Reste alt → **neu** | Zwergenstadt/Stadt (des Königs) → Zwergenkiez/Quartier/Kiez; Kriegermönche → Concierge-Mönche; Höhlentroll → Handwerker mit Sichtbeton-Haut; Erzmagier → Oberzauberrat; Riesenratten → Pfandratten; Baumscheibengras-Salbe → Pflasterkraut-Salbe; Kartons → Sperrmüllberge; „Der Eingang zur Stadt" → „Der Eingang zum Quartier". |
| Abzeichen | Abzeichen-Bilder | `interfaces/badges.png` | alt | **Offen** (eigener großer Atlas, nicht Journal-eigen). |
| Abzeichen | Texte | `badges$badge.*` (misc_de) | teils alt → **neu** (Auswahl) | Kündigungsschleudern, Kanalpiranhas, Haufen (grim_trap, boss_challenge_2, enemy_hazards), `challenges.stronger_bosses_desc` Phase 1 Haufen. Übrige Titel/Beschreibungen neutral bzw. schon neu. |
| Abzeichen | Knöpfe „Dieser Lauf/Insgesamt" | `Icons.BADGES` | alt → **neu** | siehe oben. |
| Fensterrahmen | Rahmen, Reiter | `interfaces/chrome.png` | alt | Nicht Journal-eigen (alle Fenster); **offen** für ein UI-Paket. |
| HUD | Tagebuch-Knopf oben rechts | `interfaces/menu_button.png` (31,0,11×6 Buchumriss) | alt | Neutraler Buchumriss, bleibt; Kiezführer-Text „Buchsymbol oben rechts" stimmt weiter. |

## 2. Geänderte Zellen in `interfaces/icons.png`

Nur diese Rechtecke (x, y, Breite × Höhe aus `ui/Icons.java`) wurden neu gezeichnet; der Rest ist
pixelgleich zur vorherigen Datei.

| Icon | Rechteck | Motiv |
| --- | --- | --- |
| JOURNAL | 136,0 17×15 | Kladde mit Wartenummer |
| BADGES | 51,0 16×16 | Anstecker-Button |
| SCROLL_COLOR | 160,32 15×14 | Hausflur-Aushang |
| BACKPACK_LRG | 0,48 16×16 | Jutebeutel |
| SNAKE | 48,48 9×13 | Kabelschlange |
| CATALOG | 80,48 13×16 | Aktenordner |
| ALCHEMY | 96,48 16×16 | Einkochtopf |
| GRASS | 112,48 16×16 | Hochbeet |
| STAIRS, _CHASM, _WATER, _GRASS, _DARK, _LARGE, _TRAPS, _SECRETS | 0/16/…/112,64 je 15×16 | Altbau-Kellertreppe + Upstream-Marker |
| WELL_HEALTH, WELL_AWARENESS | 128,64 / 144,64 16×16 | Plumpen-Rand, Upstream-Wasser/Marker |
| SACRIFICE_ALTAR | 160,64 16×16 | Einweggrill mit Schädel |
| DISTANT_WELL | 176,64 16×16 | Loch in Dielen |

## 3. Außerhalb meiner Dateien geänderte Keys

`items_de` (nur Journal-Seiten-Items): `items.journal.guidepage.name/desc` („Kiezführer für
Abenteurer" statt „Almanach der Abenteurer"), `items.journal.alchemypage.desc` (Handbuch der
Hinterhof-Alchemie), `items.journal.regionlorepage$prison.desc` (Hinterhöfe statt Kanalisation).
`windows_de`: zusätzlich `windows.wndinfotrap.inactive` (Haufen, auf Anweisung der Integration).

## 4. Laufzeitprüfung

Desktop-Release (Kopie ohne Android) gebaut und unter Xvfb gestartet. Angesehen: Titelbild-
Tagebuch (Abzeichen, Katalog Ausrüstung/Verbrauch/Bestiarium, Kiezführer, Alchemie), Spielstand
Ebene 11: Kieznotizen mit Ebenen-Eintrag (Abgrund-Treppe), Eigene-Notiz-Fenster, Kiezführer,
Abzeichen. Neue Symbole und Texte erscheinen wie vorgesehen. Nicht angesehen: Landmarken-Einträge
(im Testspielstand keine vorhanden), Lore-Lesefenster mit gefundenen Seiten.

## 5. Offen

- items.png: Journal-Symbole `MASTERY`, `GUIDE_PAGE`, `ALCH_PAGE`, `*_PAGE` (Regionsseiten),
  alle `*_HOLDER`, `SOMETHING`, `TRINKET_CATA`, `TOMB`, `RING_EMERALD`, `WAND_FIREBOLT` sind Upstream
  (Item-Agent).
- NPC-Sprites Spätimann, Filialist, Pfandkönig, Antragsteller, Polier, Statue, Kündigungsschleuder
  sind Upstream (Gegner-/Figuren-Art).
- `badges.png`, `chrome.png`, `menu_button.png` Upstream.
- `levels_de` Ebenen-Gefühle enthalten noch „Dungeon".
