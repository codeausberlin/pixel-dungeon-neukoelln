# Neukölln Pixel Dungeon – Konvertierungs-Audit

Stand: 2026-09-29, geprüft auf `neukoelln/prototype` @ `5ae700f`, Referenz Upstream
`2bb34a4` (Shattered Pixel Dungeon v4.0.0). Reine Bestandsaufnahme, keine Dateien geändert.
Parallel in Arbeit (nicht committet, hier als **in Arbeit** gezählt):
`core/src/main/assets/sprites/{warrior,mage,rogue,huntress}.png` und `tools/generate-kiez-heroes.cjs`.

Methode: `git diff --name-status 2bb34a4 HEAD`, `git show 2bb34a4:<pfad>`, eigener Node-PNG-Decoder
(alle Farbtypen, Bittiefen 1–16, Filter 0–4, PLTE+tRNS, Interlace) für Pixelvergleiche, eigener
Python-Parser für `.properties` (Fortsetzungszeilen, `=`/`:`), Lesen der Sprite- und Mob-Klassen.
Alles, was nur zur Laufzeit sichtbar wäre (Licht, Animation, Fenster), ist **nicht geprüft**.

## Gesamtbild in Zahlen

| Bereich | Stand |
| --- | --- |
| Grafikdateien `core/src/main/assets` (PNG/JPG) | Upstream 152: **21 geändert**, 131 unverändert; dazu 17 neu (7 Gegner, 9 Splashes, 1 Titel). 4 Helden-Atlanten in Arbeit |
| davon `sprites/` | Upstream 78: 11 geändert, 67 unverändert (4 in Arbeit); 7 neu |
| Item-Icons `items.png` (ItemSpriteSheet) | **1 von 360** geändert (`AMULET` = Mietvertrag); 359 Upstream, alle anderen 16×16-Zellen pixelgleich |
| Plattform-Bilder (Desktop 8, Android 42, iOS 21, `metadata/` 10) | **0 von 81** geändert |
| Deutsche Texte (9 `*_de.properties`) | **5064 Keys: 1900 geändert** (1806 umgeschrieben, 94 neu), 3164 unverändert |
| davon Spielinhalt (actors, items, journal, levels, plants, misc) | 4491 Keys, 1835 geändert, 2656 unverändert |
| davon UI (scenes, ui, windows) | 573 Keys, 65 geändert, 508 unverändert (großteils neutrale Bedienung) |
| Talente (`actors.hero.talent.*`) | 346 Keys, 20 geändert; Titel: 158 von 160 unverändert |
| Englische Basis (9 Dateien) | 5035 Keys: 60 neu (neue Gegner/Expat), 0 Upstream-Werte geändert |
| Weitere 21 Sprachen | 189 Dateien, alle unverändert Upstream |
| Hartcodierte Texte (Java) | AboutScene (Credits, EN), 13 Changelog-Klassen mit 783 Einträgen (EN), `- Evan`-Signatur, `WndEnergizeItem` („You energized:“), Crash-Dialoge Desktop |
| Audio | Musik 31/31, Sounds 67/67 Upstream; iOS-Musikkopien 31/31 Upstream |
| Gegner-Mechanik | 68 Upstream-Mob-Klassen (+ NPCs) mechanisch unverändert, 7 eigene Gegner neu |
| Build | `core:kiezSmokeTest desktop:release` **erfolgreich** (Kopie ohne Android/iOS, Stand `5ae700f`, ohne die Helden-PNGs in Arbeit); Spielstart nicht geprüft |

## 1. Grafik

### 1.1 Verzeichnisse

| Verzeichnis | Upstream | geändert | neu | unverändert | Bemerkung |
| --- | ---: | ---: | ---: | ---: | --- |
| `sprites/` | 78 | 11 | 7 | 67 | 4 Helden in Arbeit; `pet.png`, `undead.png` im Code ungenutzt |
| `environment/` | 28 | 6 | 0 | 22 | 5 Regions-Tilesets + `terrain_features.png` (19 von 144 belegten Zellen = Deko-Zeilen 0–4) |
| `interfaces/` | 21 | 0 | 1 | 21 | nur `neukoelln-title.png` neu |
| `effects/` | 6 | 0 | 0 | 6 | Partikel, `specks`, `spell_icons`, `text_icons` |
| `splashes/` | 15 | 4 | 9 | 11 | 9 JPGs durch `nk_*.png` ersetzt (liegen ungenutzt im Repo); `duelist.jpg`, `cleric.jpg` noch referenziert |
| `fonts/`, `gdx/` | 4 | 0 | 0 | 4 | Font/Cursor, kein Umbau nötig |
| Desktop-Icons `desktop/src/main/assets/icons/` | 8 | 0 | 0 | 8 | Shattered-Logo |
| Android `android/src/{main,debug}/res/mipmap-*` | 42 | 0 | 0 | 42 | Launcher-Icons |
| iOS `ios/assets/Assets.xcassets` | 21 | 0 | 0 | 21 | AppIcon + Banner |
| `metadata/en-US/images` | 10 | 0 | 0 | 10 | Feature-Grafik, Icon, 8 Screenshots |

### 1.2 Geänderte Grafiken (Pixelvergleich)

| Datei | geänderte Pixel (deckend) | Inhalt |
| --- | ---: | --- |
| `environment/tiles_{sewers,prison,caves,city,halls}.png` | 53 / 54 / 50 / 59 / 38 % | Regions-Tilesets (Zellen 164/181/148/182/114 von 199) |
| `splashes/title/*.png` (4) | 100 % | Titel-Parallax |
| `sprites/amulet.png` | 100 % | Mietvertrag (Siegszene) |
| `sprites/gnoll.png` | 97 % | Zeilen 0–2 (Gnoll, Exile, Trickster) |
| `sprites/snake.png`, `slime.png` | 96 %, 100 % | |
| `sprites/crab.png` | 82 % | Zeilen 0–2 (Crab, Hermit, Great) |
| `sprites/goo.png`, `swarm.png`, `ghost.png` | 63 %, 56 %, 49 % | |
| `sprites/mimic.png` | 38 % | Zeile 0 voll, Golden/Crystal nur Zettel (300 px), Ebony 1006 px |
| `sprites/rat.png` | 33 % | Zeile 0 (Rat) voll; Albino und Fetid Rat nur je 72 px (Flaschendetail) |
| `sprites/items.png` | 0,5 % | nur Zelle `AMULET` |

### 1.3 `sprites/`: wer nutzt welches PNG (unverändert = Upstream-Look)

Neu und eigen: `escooter.png` (Leihscooter), `gas-alchemist.png` (Herr Fuß), `pfandgolem.png`,
`terminhaendler.png`, `presslufter.png`, `luxussanierer.png`, `hausordnungs-hydra.png`.

| PNG | Klasse(n) | Neukölln-Name (actors_de) | Region/Ebene | Status |
| --- | --- | --- | --- | --- |
| `rat.png` | Rat / Albino / FetidRat | Pfandratte / Albino-Pfandratte / verfaulende Pfandratte | 1–5 | geändert (Albino/Fetid minimal) |
| `snake.png` | Snake | Kabelschlange | 1–5 | geändert |
| `gnoll.png` | Gnoll / GnollExile / GnollTrickster | Besichtigungswicht / verstoßener Tiefbauer / Abstandswicht | 1–5, Geist-Quest | geändert |
| `crab.png` | Crab / HermitCrab / GreatCrab | Kanalpanzer / Tonnenpanzer / großer Kanalpanzer | 1–5 | geändert |
| `swarm.png` | Swarm | Biomüllschwarm | 1–10 | geändert |
| `slime.png` | Slime / CausticSlime | Abflussschleim / ätzender Abflussschleim | 4–5 | geändert |
| `goo.png` | Goo | Mietschimmel | Boss 5 | geändert |
| `ghost.png` | Ghost, DriedRose | Trauriger Altmieter | 2–4 Quest | geändert |
| `mimic.png` | Mimic/Golden/Crystal/Ebony | Zu-verschenken-Truhe, goldene/Kristall-/Ebenholz-Verschenkkiste | alle | geändert |
| `piranha.png` | Piranha / PhantomPiranha | Kanalpiranha / Phantom-Kanalpiranha | alle (Wasserräume) | **Upstream** |
| `ratking.png` | RatKing | Pfandkönig | 1–5 (Geheimraum) | **Upstream** |
| `sheep.png` | Sheep | Schaf | alle | **Upstream** |
| `statue.png` | Statue / ArmoredStatue | (gepanzerte) Kunst-am-Bau-Statue | alle | **Upstream** |
| `wraith.png` | Wraith / TormentedSpirit | Vormieterspuk / gequälter Vormieter | alle | **Upstream** |
| `bee.png` | Bee | Dachgarten-Biene | alle (Honigtopf) | **Upstream** |
| `shopkeeper.png` | Shopkeeper | Spätimann | 6, 11, 16 | **Upstream** |
| `skeleton.png` | Skeleton (+VaultSkeleton) | ewig Wartender | 6–10 | **Upstream** |
| `thief.png` | Thief / Bandit | Nummernklauer / Nummernhehler | 6–10 | **Upstream** |
| `dm100.png` | DM100 (+Vault) | DM-100 Aufrufautomat | 6–10 | **Upstream** |
| `guard.png` | Guard | Amtssecurity | 6–10 | **Upstream** |
| `necromancer.png` | Necromancer / SpectralNecromancer | Wiedervorlagebeamter / Geister-Sachbearbeiter | 6–10 | **Upstream** |
| `rot_lasher.png`, `rot_heart.png` | RotLasher / RotHeart | Faulbeerranke / Faulbeerherz | 6–10 Quest | **Upstream** |
| `wandmaker.png` | Wandmaker | Ewiger Antragsteller | 6–10 NPC | **Upstream** |
| `tengu.png` | Tengu | Schalterspringer | Boss 10 | **Upstream** |
| `bat.png` | Bat | Schachtvampir | 11–15 | **Upstream** |
| `brute.png` | Brute / ArmoredBrute | (gepanzerter) Bautrupp-Grobian | 11–15 | **Upstream** |
| `shaman.png` | Shaman (+Vault) | Bautrupp-Gutachter | 11–15 | **Upstream** |
| `spinner.png` | Spinner | Flatterbandspinne | 11–15 | **Upstream** |
| `dm200.png` | DM200 / DM201 | DM-200 Bauaggregat / DM-201 Wachaggregat | 11–15 | **Upstream** |
| `blacksmith.png` | Blacksmith | Alter Polier | 11–15 NPC | **Upstream** |
| `gnoll_guard/sapper/geomancer.png` | GnollGuard/Sapper/Geomancer | Bautrupp-Wachmann / -Sprengmeister / Tiefbau-Geomant | 11–15 Mine-Quest | **Upstream** |
| `crystal_{wisp,guardian,spire}.png` | CrystalWisp/Guardian/Spire | Kristallbüschel / Kristallwächter / Riesenkristall | 11–15 Mine-Quest | **Upstream** |
| `fungal_{spinner,sentry,core}.png` | Fungal* | Hausschwamm-Spinne/-Wache/-Kern | 11–15 Mine-Quest | **Upstream** |
| `dm300.png`, `pylon.png` | DM300 / Pylon | DM-300 Bohrlinde / Baustromverteiler | Boss 15 | **Upstream** |
| `ghoul.png` | Ghoul | Kleinanleger-Wiedergänger | 16–20 | **Upstream** |
| `elemental.png` | Elemental (4) + Newborn | Heizkosten-/Heizungsausfall-/Kurzschluss-/Nebenkosten-Elementar | 16–20 | **Upstream** |
| `warlock.png` | Warlock | Abschreibungshexer | 16–20 | **Upstream** |
| `monk.png` | Monk / Senior | Concierge-Mönch / Ober-Concierge | 16–20 | **Upstream** |
| `golem.png` | Golem | Umzugsgolem | 16–20 | **Upstream** |
| `imp.png` | Imp / ImpShopkeeper | Ehrgeiziger Filialist | 16–21 | **Upstream** |
| `vault_*.png` (3) | VaultMirror/TokenDoor/BossElemental | Seltsamer Spiegel / seltsame Tür / – | 16–20 Tresor-Quest | **Upstream** |
| `sentry.png` | VaultSentry/VaultLaser, SentryRoom | Überwachungsposten / Zerfallsstrahl-Wachposten | selten | **Upstream** |
| `king.png` | DwarfKing | König der Eigentumswohnungen | Boss 20 | **Upstream** |
| `succubus.png` | Succubus | Stadtmarketing-Sukkubus | 21–25 | **Upstream** |
| `eye.png` | Eye | Auge des Ordnungsamts | 21–25 | **Upstream** |
| `scorpio.png` | Scorpio / Acidic | (ätzender) Mahnbescheid-Skorpion | 21–25 | **Upstream** |
| `ripper.png`, `spawner.png` | RipperDemon / DemonSpawner | Entmietungsdämon / Kündigungsschleuder | 21–25 | **Upstream** |
| `yog.png`, `yog_fists.png`, `larva.png` | YogDzewa, YogFist (6), Larva | Ewiger Mietspiegel, …faust, Mieterhöhungslarve | Boss 25 | **Upstream** |
| `warrior/mage/rogue/huntress.png` | Helden, auch Avatare in HUD/Heldenwahl | Alteingesessene / Expat / Tourist / Zugezogene | – | **in Arbeit** |
| `duelist.png`, `cleric.png` | nicht wählbar | Zweikämpferin / Kleriker | – | Upstream (entfernen/ignorieren) |
| `spirit_hawk`, `ninja_log`, `wards`, `guardian`, `lotus` | Klassenfähigkeiten / Zauberstäbe | – | – | **Upstream** |
| `avatars.png` | nur SurfaceScene (Siegszene) | – | Ende | **Upstream** |
| `item_icons.png` | 8×8-Overlay-Icons | – | – | **Upstream** |

### 1.4 Items, UI, Effekte

- `items.png`: 360 öffentliche Icon-Konstanten (359 Zellen, 1 Alias). Geändert: nur `AMULET`.
  Alle Start-Items zeigen Upstream-Grafik zu neuem Namen, z. B. Verbogene Gardinenstange
  (Kurzschwert), Hoodie (Stoffrüstung), Magischer Selfie-Stick (Magierstab), Poncho der Schatten
  (Umhang), Upcycling-Bogen (Geisterbogen), Pflasterstein (Wurfstein), Kiez-Aufnäher (Siegel).
  Unbekannte Tränke/Schriftrollen sind im Text umbenannt, die Icons zeigen weiter Farbfläschchen
  und Runen.
- `interfaces/banners.png` (unverändert): Frames `BOSS_SLAIN` („Boss Slain“) und `GAME_OVER`
  („Game Over“) sind **englische Schriftgrafiken** (visuell geprüft). Titel-Frames sind durch
  `neukoelln-title.png` ersetzt, die alten „Shattered Pixel Dungeon“-Frames liegen ungenutzt darin.
- Alle 21 übrigen `interfaces/*.png` unverändert: `chrome`, `toolbar`, `status_pane`, `menu_*`,
  `radial_menu`, `boss_hp`, `buffs`, `large_buffs`, `badges` (Upstream-Heldengesichter), `talent_icons`,
  `hero_icons` (Subklassen/Fähigkeiten), `icons` (u. a. `SHPX`-Logo für „Über“, Credit-Avatare),
  `change_icons`, `surface` (Siegszene), `arcs1/2`, `locked_badge`, `shadow`, `talent_button`.
- `effects/` 6/6 unverändert (generisch, niedrige Priorität).
- `environment/`: unverändert u. a. `custom_tiles/sewer_boss.png` (Goo-Arena), `rat_king_room.png`,
  `weak_floor.png`, `prison_quest.png`, `prison_exit.png`, `caves_boss.png`, `caves_quest.png`,
  `city_boss.png`, `city_quest.png`, `halls_special.png`, `carpet.png`, `tiles_caves_crystal.png`,
  `tiles_caves_gnoll.png`, `raised_terrain.png`, `water0-4.png` (`water3.png` = rote Stadt-Suppe,
  passt laut Design-Doku nicht zum „Zierwasserbecken“).

## 2. Text

### 2.1 Deutsche Dateien

| Datei | Keys | geändert | davon neu | unverändert | fehlt ggü. EN | nur in DE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `actors_de` | 1668 | 575 | 59 | 1093 | 0 | 0 |
| `items_de` | 2069 | 866 | 0 | 1203 | 4 | 0 |
| `journal_de` | 178 | 81 | 0 | 97 | 0 | 0 |
| `levels_de` | 274 | 195 | 35 | 79 | 2 | 35 (regionale Level-Feelings `*_desc_r1..5`) |
| `misc_de` | 235 | 96 | 0 | 139 | 0 | 0 |
| `plants_de` | 67 | 22 | 0 | 45 | 0 | 0 |
| `scenes_de` | 148 | 28 | 0 | 120 | 0 | 0 |
| `ui_de` | 49 | 2 | 0 | 47 | 0 | 0 |
| `windows_de` | 376 | 35 | 0 | 341 | 0 | 0 |
| **Summe** | **5064** | **1900** | **94** | **3164** | **6** | 35 |

Fehlende DE-Keys (schon upstream fehlend, zeigen Englisch): `items.quest.escapecrystal.injure_warning_1..3`,
`items.quest.escapecrystal.injure_confirm`, `levels.rooms.quest.ritualsiteroom$table.name/.desc`.
DE-Wert gleich EN: `actors.buffs.swarminteltracker.name/.desc` („swarm intelligence“),
`actors.hero.spells.beamingray.desc`, `actors.hero.talent.hold_fast.desc`, `.barkskin.desc`,
`.hold_fast.meta_desc` (englischer Text im deutschen File); Expat-Zeilen `line_0..11` sind absichtlich Englisch.

### 2.2 Unveränderte Keys nach Bereich (Auswahl, unverändert/gesamt)

| Bereich | unverändert | Beispiele |
| --- | ---: | --- |
| `actors.hero.talent.*` | 326/346 | `hearty_meal.title`=„herzhafte Mahlzeit“, `.desc`=„…heilt den Krieger…“. Nach Klasse (Zuordnung über Kommentare in `Talent.java`): Alteingesessene 49/55, Expat 59/60, Tourist 48/54, Zugezogene 51/53, Duelist 49/51, Cleric 61/64, allgemein 9/9 |
| `actors.hero.abilities.*` | 157/159 | `warrior.heroicleap.desc`=„Der Krieger springt…“ |
| `actors.hero.spells.*` (nur Kleriker) | 135/136 | `auraofprotection.*` |
| `actors.hero.herosubclass.*` | 34/36 | alle 12 Namen: Berserker, Gladiator, Kampfmagier, Hexenmeister, Attentäter, Freiläufer, Scharfschützin, Wächterin … |
| `actors.hero.heroclass.*` | 6/24 | nur Duelist/Cleric-Texte |
| `actors.buffs.*` | 252/305 | `adrenaline`, `bleeding`=„blutend“, `snipersmark`=„Markierung der Scharfschützin“ |
| `actors.blobs.*` | 28/53 | `toxicgas`=„Giftgas“, `fire` |
| `actors.mobs.*` / `.npcs.*` | 63/379, 39/164 | Mobs weitgehend umgeschrieben; Reste v. a. Sheep, Blacksmith, RatKing, Mirror/PrismaticImage |
| `items.artifacts.*` | 203/318 | `driedrose$ghosthero.dialogue_*` (Zwerge, Kanalisation) |
| `items.weapon.melee.*` | 159/249 | Fähigkeits-Buffs, z. B. `crossbow$chargedshot.desc`=„Die Zweikämpferin…“ |
| `items.trinkets.*` | 81/89 | Namen 17 unverändert: Molchauge, Rattenschädel, Salzwürfel, Frettchenfell … |
| `items.wands.*` | 86/179 | |
| `items.rings.*` | 75/100 | 12 Edelstein-Namen (Granatring, Rubinring …) |
| `items.food.*` | 59/89 | Fadfrucht-Varianten |
| `items.spells.*` | 48/62 | `curseinfusion`, `summonelemental`, 7 umbenannte Zauber mit alter `desc` |
| `items.stones.*` | 35/56 | `stoneofblink`=„Blinzelstein“, 9 umbenannte Steine mit alter `desc` |
| `items.weapon/armor` Glyphen, Verzauberungen, Flüche | 31/31, 45/72, 44/50, 16/16 | „%s der Zuneigung“ usw. |
| `items.quest.*` | 35/57 | Zwergenmünze, Dunkelgold-Erz, Leichenstaub, Zeremoniekerze |
| `items` (Wurzel) | 94/131 | Anch, Tautropfen, Krone des Zwergenkönigs, Tengus Maske, Wasserschlauch |
| `plants.*` | 45/67 | alle 30 Pflanzen-/Samennamen unverändert (Sonnengras, Maguskönigskraut, Erdwurzel …) |
| `journal.*` | 97/178 | Titel der Tagebuch-Dokumente (Bodies umgeschrieben), `catalog.*`, `bestiary.*` |
| `levels.*` | 79/274 | Terrain-Namen (Wand, Tür, Wasser), 21/85 Fallen |
| `misc` Badges/Challenges | 139/235 | u. a. `unlock_duelist`, `unlock_cleric`, Champion-Badges |
| scenes/ui/windows | 508/573 | überwiegend neutrale Bedienung (Einstellungen, Tastenbelegung, Toolbar); inhaltlich relevant: `wndsadghost` 5/10, `wndblacksmith` 10/17, `wndclericspells` 8/8 |

Namens- und Textrisiko: 28 Items haben einen neuen Namen, aber die alte Beschreibung (9 Steine, 7 Zauber,
6 Trinkets, 4 Elixier-/Trank-Buffs, Phantomfleisch, DriedRose-Geist).

### 2.3 Reste alter Namen im deutschen Text (Keys mit Treffer, davon in unveränderten Keys)

| Suchbegriff | Keys | unverändert | Fundstellen (Auswahl) |
| --- | ---: | ---: | --- |
| Zwerg* | 55 | 15 | 40 umgeschriebene Keys verwenden „Eigentümerzwerge“ (Kanon klären); unverändert: 11 DriedRose-Dialoge, `kingscrown`, `dwarftoken` |
| Kleriker | 65 | 62 | Kleriker-Spells/-Talente, `misc` 2 |
| Dungeon | 103 | 55 | quer durch alle Dateien (evtl. zulässig, da Titel „Pixel Dungeon“) |
| Dämon* | 29 | 7 | Spells, `ripperdemon`, Journal |
| Magier | 25 | 21 | Expat-Talente/-Fähigkeiten |
| Schurk* | 25 | 21 | Tourist-Talente/-Fähigkeiten |
| Krieger | 24 | 22 | Alteingesessene-Talente/-Fähigkeiten, `holdfast.desc` |
| Jäger* | 19 | 17 | Zugezogene-Talente/-Fähigkeiten |
| Paladin/Priester | 32 | 31 | Kleriker-Subklassen |
| Shattered | 14 | 1 | 13 bewusst (Credit-/Fork-Hinweis), `items.food.pasty.shattered_desc` unverändert |
| Skelett | 10 | 5 | Vault-Skelett, Nekromant |
| Duell* | 8 | 8 | Duelist-Fähigkeiten |
| Gnoll | 6 | 1 | `levels.traps.gnollrockfalltrap.*`, `windows.wndsadghost.gnoll`, Journal Höhle |
| Mönch | 5 | 0 | Concierge-Mönch (gewollt) |
| Evan / Watabou | 5 / 4 | 0 | Support-/Credit-Texte (behalten) |
| Kanalisation / Gefängnis / Höhle | 3 / 3 / 2 | 3 / 1 / 0 | DriedRose-Dialoge, `regionlorepage$prison.desc` |
| Tengu | 2 | 2 | `items.tengusmask.name/.desc` |
| Warrior/Mage/Rogue/Huntress (EN) | 2 | 2 | `beamingray.desc`, `hold_fast.desc` |
| Yog | 1 | 0 | `yogdzewa.desc` |
| Amulett, Yendor, Dwarf, Kobold, Imp, Goo | 0 | – | sauber |

Konsistenz: `docs/NEUKOELLN-WELT.md` §0/§2 weicht in mindestens 16 Namen von `actors_de` ab (Stichprobe,
nicht vollständig), z. B. Tengu „Der Terminvergeber“ vs. „Schalterspringer“, DM-300 „Tunnelbohrerin Rixi“ vs.
„DM-300 Bohrlinde“, Dwarf King „König Rendite“ vs. „König der Eigentumswohnungen“, Yog „Yog-Grundbuch“ vs.
„Ewiger Mietspiegel“, Albino „Scherbenratte“, Slime „Feuchttuchzopf“, Piranha „Kanalzander“, Sheep „Heidschnucke“,
Blacksmith, Wandmaker, Imp, Skeleton, Thief, Ghost, Gnoll Exile/Trickster. `NEUKOELLN-DESIGN.md` folgt `actors_de`.
`NEUKOELLN-ART-MOBS.md` nutzt teils Weltbibel-Namen.

### 2.4 Englische Basis und andere Sprachen (P4)

- `*.properties` (EN): 5035 Keys, 60 neu, 0 Upstream-Werte geändert → 4975 Keys reiner Shattered-Text.
  Die 35 regionalen Feelings existieren nur auf Deutsch (EN fällt korrekt auf generischen Text zurück).
- 21 weitere Sprachen (189 Dateien) unverändert, Sprachwahl in `WndSettings` weiterhin aktiv.

## 3. Hartcodiert, Branding, Credits

| Fundstelle | Inhalt | Einordnung |
| --- | --- | --- |
| `core/.../scenes/AboutScene.java` | komplett englisch; Shattered (Evan), Pixel Dungeon (Watabou), libGDX, Übersetzer, Musik, freesound-Liste; kein Neukölln-Eintrag | **Credit behalten**, Neukölln-Block ergänzen, Texte ggf. übersetzen |
| `TitleScene.java` Z. 174 ff. | Buttons „Original unterstützen“ (Patreon), „Neuigkeiten“ (Service null), „Änderungen“, „Über“ mit `Icons.SHPX` | Support = Credit (Entscheidung), News/Changes = Branding |
| `TitleScene.SettingsButton` | Deutsch ist in `Languages.java` `X_UNFINISH` → Einstellungen-Button blinkt rot, öffnet Sprach-Tab | Integration, P1 |
| `windows/WndSupportPrompt.java` Z. 53, 64 | hängt „`- Evan`“ an den deutschen Ich-Text des Forks, Patreon-Link `ShatteredPixel`, Titel-Icon `SHPX`; ausgelöst in `WornKey` (nach Goo, Ebene 5) | falsche Zuschreibung, P1 |
| `scenes/SupporterScene.java` Z. 86, 133 | Patreon-Link, „- Evan“ | Credit (Entscheidung) |
| `ui/changelist/*.java` (13 Klassen, 9133 Zeilen) | 783 englische Shattered-Änderungseinträge, kein Neukölln-Eintrag; `change_icons.png` | Branding; Upstream-Historie als Credit behalten oder ausblenden |
| `scenes/NewsScene.java` Z. 152 | Link `https://ShatteredPixel.com` | Branding |
| `windows/WndEnergizeItem.java` Z. 169 | `GLog.h("You energized: " …)` | hartcodiertes Englisch |
| `windows/WndSettings.java` Z. 1068 | „This is the source language…“ (nur bei EN) | P4 |
| `desktop/.../DesktopLauncher.java` Z. 99–110 | Crash-Dialoge EN mit „Evan@ShatteredPixel.com“ | Branding, P3 |
| `desktop/.../DesktopLaunchValidator.java` Z. 67 | „ShatteredPD must start…“ | P3 |
| `build.gradle` | `appName='Neukoelln Pixel Dungeon'`, `appPackageName='de.neukoellnpixeldungeon.game'`, `0.1.0` | erledigt; Fenstertitel ohne „ö“ (Entscheidung) |
| Speicherpfad Desktop | `.neukoellnpixeldungeon/neukoelln-pixel-dungeon/` (Linux), `Library/Application Support/Neukoelln Pixel Dungeon/` (macOS) | getrennt von Shattered ✔ |
| `desktop/build.gradle` Z. 127 f. | hängt noch an `githubUpdates`/`shatteredNews` (im Launcher auf null gesetzt) | aufräumen |
| `android/build.gradle` Z. 46 f., `AndroidLauncher` Z. 112/120 | Release nutzt GitHub-Updates von `00-Evan/shattered-pixel-dungeon` und Feed `shatteredpixel.com` | P4, vor Android-Release Pflicht |
| `ios/build.gradle` Z. 44, `IOSLauncher` Z. 76 | `shatteredNews` aktiv | P4 |
| `services/news/shatteredNews/.../ShatteredNews.java` Z. 49, `services/updates/githubUpdates/.../GitHubUpdates.java` Z. 63 | URLs Shattered | P4 |
| `metadata/en-US/` | `full_description.txt`, `short_description.txt`, `changelogs/896.txt`, `912.txt`: Shattered-Text (6 Helden, Duelist, Cleric); 10 Bilder; kein `de-DE` | P4 |
| `README.md`, `docs/FUNDING.yml` | Shattered-README (Store-Badges, Patreon), `patreon: ShatteredPixel` | README ersetzen, Credit-Absatz behalten |
| `messages/Languages.java` | Übersetzer-Credits aller Sprachen | Credit behalten |
| `items/food/Pasty.java` (`shattered_name/desc`) | Jubiläums-Gebäck erwähnt „Shattered Pixel Dungeon“ | Easter Egg, P3 |

## 4. Audio

`core/src/main/assets/music/`: 31 OGG (theme_1/2/finale, je Region 1–3, tense, boss, boss_finale), 18 MB,
alle Upstream. `sounds/`: 67 MP3, 572 KB, alle Upstream. `ios/assets/music/`: 31 MP3-Kopien, Upstream.
Die neuen Gegner nutzen keine eigenen Sounds. AboutScene führt die Musik- und freesound-Credits.

## 5. Gameplay-Inhalt

| Bereich | Stand |
| --- | --- |
| Upstream-Gegner | 68 Mob-Klassen unter `actors/mobs/` plus 14 NPC-Klassen (ohne Basisklassen `NPC`, `DirectableAlly`): **nur Text** (und Ebene 1–5 teils Sprite), Mechanik unverändert (keine Java-Änderung) |
| Bosse | Goo, Tengu, DM300, DwarfKing, YogDzewa (+YogFist, Larva): nur Text, Goo zusätzlich Sprite; Arenen-Tiles `custom_tiles/*` unverändert |
| NPCs | Ghost, Wandmaker, Blacksmith, Imp, RatKing, Shopkeeper (Spätimann): nur Text, Ghost-Sprite teilweise |
| Eigene Gegner | 1–5: `EScooter` (Leihscooter, Ebene 2–5), `GasAlchemist` (Herr Fuß, 2–5), `Pfandgolem` (3–5, Blob `Scherben`); 6–10: `Terminhaendler`; 11–15: `Presslufter`; 16–20: `Luxussanierer` (Blob `Bauzaun`); 21–25: `HausordnungsHydra` (Buff `Hausregel`). Alle in `MobSpawner`, im Smoke-Test abgedeckt |
| Level | `SewerLevel` ersetzt einen `EmptyRoom` durch `HinterhofRoom`; regionale Feelings über `Level.Feeling.desc()`; sonst Upstream-Levelgenerierung |
| Klassen | Alteingesessene: `WandOfBlastWave.knockbackPower` halbiert Rückstoß. Expat: `ExpatIncantations` (35 % Zuruf beim Zaubern, reiner Flavor). Zugezogene, Tourist: **keine** eigene Mechanik. Alle 4 ohne Freischaltung |
| Duelist/Cleric | Aus Heldenwahl entfernt (`HeroClass.kiezClasses()`), aber sichtbar: Unlock-Badge-Popups („Zweikämpferin freigeschaltet!“ beim Ausrüsten einer Waffe ab Klasse 2 mit genug Stärke, „Kleriker freigeschaltet!“ beim Entfluchen), Badges `BOSS_SLAIN_1_ALL_CLASSES`/`VICTORY_ALL_CLASSES` verlangen alle 6 Klassen und sind **unerreichbar**, Texte (65 Keys Kleriker, 8 Duell), Sprites/Splashes, Shopkeeper-Zeilen `talk_prison_duelist/cleric`. 21 Java-Dateien referenzieren `HeroClass.DUELIST/CLERIC` |
| Unlock-Badges der 4 Klassen | lösen weiter aus („Expat freigeschaltet!“ nach erstem Modernisierungsbescheid usw.), obwohl alle Klassen offen sind |

## 6. Zustand

- Build: Kopie nach `scratchpad/audit-build` (ohne `.git`, `android`, `ios`, `build`, `.gradle`), `google()` und
  `com.android.tools.build` aus `build.gradle`, `:android`/`:ios` aus `settings.gradle` entfernt,
  `./gradlew core:kiezSmokeTest desktop:release -q` → **Exit 0**, Ausgabe „Kiez smoke checks passed: classes, shops,
  spawns, gas save/release, courtyard, scooter lanes, deposit shards, appointment reseller, jackhammer, luxury fences,
  house rules.“, `desktop-0.1.0.jar` (54 MB) erzeugt. Stand `5ae700f` **ohne** die Helden-PNGs in Arbeit.
- Nicht geprüft: Spielstart, Rendering, Animation, Android/iOS-Build (dl.google.com gesperrt).

## 7. Backlog

Aufwand: S ≤ 0,5 Tag, M ≤ 2 Tage, L > 2 Tage. Owner: Art / Lore / Gameplay / Integration.

### P1 – in den ersten Minuten sichtbar (Titel, Heldenwahl, Ebene 1–5, HUD, Standard-Items)

| # | Was | Pfad(e) | Aufwand | Owner |
| --- | --- | --- | --- | --- |
| 1 | Helden-Atlanten fertigstellen (auch HUD-Avatar, Heldenwahl-Icon, Ranglisten) | `sprites/{warrior,mage,rogue,huntress}.png` | in Arbeit | Art |
| 2 | Item-Icons der Start- und Ebene-1–5-Items (Waffen, Rüstungen, Klassen-Items, Proviant, Wurfsteine, 12 Tränke, 12 Schriftrollen, Samen, Beutel) – 359 von 360 Icons Upstream | `sprites/items.png`, `sprites/ItemSpriteSheet.java` (nur lesen) | L (Teilmenge M) | Art |
| 3 | „Boss Slain“/„Game Over“-Schriftgrafik auf Deutsch | `interfaces/banners.png` (Frames 0,157–127,225 und 128,157–256,192) | S | Art |
| 4 | Signatur „- Evan“ unter dem Fork-Ich-Text entfernen, Patreon-Link/Icon entscheiden (Popup nach Goo) | `windows/WndSupportPrompt.java`, `windows_de` `wndsupportprompt.*` | S | Integration |
| 5 | Einstellungen-Button blinkt rot, weil Deutsch als unfertig markiert | `messages/Languages.java` (Status GERMAN) | S | Integration |
| 6 | Unlock-Popups entfernen/umdeuten: Zweikämpferin (Waffe ab Klasse 2), Kleriker (Entfluchen), Expat/Tourist/Zugezogene | `Badges.java` (`validate*Unlock`), `KindOfWeapon.java`, `PotionOfStrength.java`, `ScrollOfUpgrade.java`, `misc_de` `badges$badge.unlock_*` | S | Gameplay |
| 7 | Talent-, Fähigkeits- und Subklassen-Texte der 4 Klassen (207 von 222 Talent-Keys unverändert; „Krieger/Magier/Schurke/Jägerin“: 81 Treffer in unveränderten Keys; 12 Subklassen-Namen) | `actors_de` `actors.hero.talent.*`, `.abilities.*`, `.herosubclass.*` | L | Lore |
| 8 | Titelbildschirm: News-Button (ohne Service), Änderungen (783 EN-Einträge Shattered), „Über“ mit Shattered-Logo | `scenes/TitleScene.java`, `scenes/ChangesScene.java`, `ui/changelist/*`, `interfaces/icons.png` (SHPX) | M | Integration |
| 9 | AboutScene: Neukölln-Credits ergänzen, Upstream-Credits behalten, deutsch oder zweisprachig | `scenes/AboutScene.java` | M | Integration + Lore |
| 10 | Desktop-Fenster-/Taskleisten-Icon | `desktop/src/main/assets/icons/*` (8) | S | Art |
| 11 | Ebene-1–5-Sprites ohne Reskin: Kanalpiranha, Pfandkönig, Schaf, Kunst-am-Bau-Statue, Vormieterspuk, Biene; Albino/Fetid Rat nur Flaschendetail | `sprites/{piranha,ratking,sheep,statue,wraith,bee}.png`, `rat.png` Zeilen 1–2 | M | Art |
| 12 | Goo-Arena und Sonderräume 1–5 | `environment/custom_tiles/{sewer_boss,rat_king_room,weak_floor}.png` | M | Art |
| 13 | Pflanzen/Samen (30 Namen unverändert) und Tautropfen/Wasserschlauch, Heiltrank | `plants_de`, `items_de` `items.waterskin.*`, `items.dewdrop.*`, `potionofhealing.name` | M | Lore |
| 14 | 28 Items mit neuem Namen und alter Beschreibung (u. a. 9 Runensteine) | `items_de` `items.stones.*`, `items.spells.*`, `items.trinkets.*` | M | Lore |
| 15 | Talent- und Subklassen-Icons (Talentbaum ab Stufe 2) | `interfaces/talent_icons.png`, `hero_icons.png` | L | Art |

### P2 – im normalen Spielverlauf sichtbar

| # | Was | Pfad(e) | Aufwand | Owner |
| --- | --- | --- | --- | --- |
| 1 | Spätimann-Sprite | `sprites/shopkeeper.png` | S | Art |
| 2 | Gegner 6–25 (22 Atlanten ohne Reskin, Tabelle 1.3) | `sprites/{skeleton,thief,dm100,guard,necromancer,rot_*,bat,brute,shaman,spinner,dm200,ghoul,elemental,warlock,monk,golem,succubus,eye,scorpio,ripper,spawner,…}.png` | L | Art |
| 3 | Bosse 10/15/20/25 | `sprites/{tengu,dm300,pylon,king,yog,yog_fists,larva}.png` | L | Art |
| 4 | Boss- und Quest-Tiles 6–25 | `environment/custom_tiles/{prison_quest,prison_exit,caves_boss,caves_quest,city_boss,city_quest,halls_special}.png`, `tiles_caves_{crystal,gnoll}.png` | L | Art |
| 5 | NPC-Sprites Antragsteller, Polier, Filialist | `sprites/{wandmaker,blacksmith,imp}.png` | M | Art |
| 6 | Bossmechaniken eigenständig machen (bisher nur Text) | `actors/mobs/{Goo,Tengu,DM300,DwarfKing,YogDzewa}.java` | L | Gameplay |
| 7 | Eigene Mechanik für Zugezogene und Tourist; Expat über Flavor hinaus | `actors/hero/HeroClass.java`, `Talent.java` | L | Gameplay |
| 8 | Namen Weltbibel ↔ `actors_de` angleichen (≥16 Abweichungen) | `docs/NEUKOELLN-WELT.md`, `docs/NEUKOELLN-ART-MOBS.md`, `actors_de` | S | Lore |
| 9 | „Zwerge“-Kanon klären (55 Keys), DriedRose-Geistdialoge (Kanalisation/Gefängnis/Zwerge), Tengus Maske, Krone des Zwergenkönigs, Zwergenmünze | `items_de` `items.artifacts.driedrose$ghosthero.*`, `items.tengusmask.*`, `items.kingscrown.*`, `items.quest.dwarftoken.*` | M | Lore |
| 10 | Buffs (252/305 unverändert), Artefakte (203/318), Trinkets (81/89), Ringe (Edelsteinnamen), Waffen-Fähigkeiten, Glyphen/Verzauberungen/Flüche | `actors_de` `actors.buffs.*`; `items_de` | L | Lore |
| 11 | Item-Icons der übrigen Items (Artefakte, Ringe, Zauberstäbe, Trinkets, höhere Waffen/Rüstungen) | `sprites/items.png` | L | Art |
| 12 | Hartcodiert „You energized:“ | `windows/WndEnergizeItem.java` Z. 169 | S | Integration |
| 13 | Gnoll-Reste: Steinschlagfalle, Geist-Dank, Journal | `levels_de` `levels.traps.gnollrockfalltrap.*`, `levels.mininglevel.barricade_desc`, `windows_de` `wndsadghost.gnoll`, `journal_de` | S | Lore |
| 14 | Stadt-Wasser rot | `environment/water3.png` | S | Art |
| 15 | Buff-Icons, Badges-Grafik (Upstream-Heldengesichter) | `interfaces/{buffs,large_buffs,badges}.png` | M | Art |

### P3 – selten, Endgame, Randfälle

| # | Was | Pfad(e) | Aufwand | Owner |
| --- | --- | --- | --- | --- |
| 1 | Duelist/Cleric aufräumen: Badges `*_ALL_CLASSES` erreichbar machen, Texte (Spells 135, Talente 115), Sprites/Splashes | `Badges.java`, `actors_de` `actors.hero.spells.*`, `sprites/{duelist,cleric}.png`, `splashes/{duelist,cleric}.jpg` | M | Gameplay |
| 2 | Siegszene | `interfaces/surface.png`, `sprites/avatars.png`, `scenes/SurfaceScene.java` | M | Art |
| 3 | Tresor-/Mine-Quest-Sprites | `sprites/{vault_*,crystal_*,fungal_*,gnoll_{guard,sapper,geomancer},sentry}.png` | L | Art |
| 4 | Fehlende DE-Keys (6) | `items_de` `escapecrystal.injure_*`, `levels_de` `ritualsiteroom$table.*` | S | Lore |
| 5 | Englische Reste im DE-File: „swarm intelligence“, `beamingray`, `hold_fast`, `barkskin` | `actors_de` | S | Lore |
| 6 | Crash-/Startfehler-Dialoge | `desktop/.../DesktopLauncher.java`, `DesktopLaunchValidator.java` | S | Integration |
| 7 | Musik und Sounds (31 + 67 Upstream) | `core/src/main/assets/{music,sounds}` | L | Art (Audio) |
| 8 | Klassenfähigkeiten-Grafik | `sprites/{spirit_hawk,ninja_log,wards,guardian,lotus}.png` | M | Art |
| 9 | Ungenutzte Upstream-Dateien entfernen (9 Splash-JPGs, alte Titel-Frames, `pet.png`, `undead.png`) | `splashes/*.jpg`, `interfaces/banners.png` | S | Integration |
| 10 | Pasty-Easter-Egg, Journal-Titel, Effekte | `items_de` `pasty.shattered_*`, `journal_de`, `effects/*` | S | Lore/Art |

### P4 – Englisch-Fallback, Store, Plattformen

| # | Was | Pfad(e) | Aufwand | Owner |
| --- | --- | --- | --- | --- |
| 1 | Englische Basis nachziehen (4975 Upstream-Keys) oder EN-Auswahl deaktivieren | `messages/*/*.properties` | L | Lore |
| 2 | 21 Fremdsprachen (189 Dateien) entfernen oder Sprachwahl sperren | `messages/*/*_xx.properties`, `messages/Languages.java`, `windows/WndSettings.java` | S | Integration |
| 3 | Store-Texte und Bilder, `de-DE` anlegen | `metadata/en-US/*` (4 Texte, 10 Bilder) | M | Lore + Art |
| 4 | Android/iOS-Icons und Banner | `android/src/*/res/mipmap-*` (42), `ios/assets/Assets.xcassets` (21) | M | Art |
| 5 | Update-/News-Services auf eigene Quelle oder `debug*` umstellen | `android/build.gradle`, `ios/build.gradle`, `desktop/build.gradle`, `services/*` | S | Integration |
| 6 | README/FUNDING für den Fork (Upstream-Credit-Absatz behalten) | `README.md`, `docs/FUNDING.yml` | S | Integration |
| 7 | App-Name mit „ö“ oder bewusst „oe“ (Fenstertitel, Pfade) | `build.gradle` | S | Integration |
