# Pixel Dungeon Neukölln – Weltbibel

Stand: 2026-09-29. Arbeitsdokument des Lore-Teams. Nichts hier ist automatisch
implementiert oder spielbar. Namen und Konzepte sind Vorschläge, bis Gameplay-
und Art-Agent sie übernommen, integriert und getestet haben.

Verbindlicher Kanon kommt aus `AGENTS.md` und dem Auftrag an das Lore-Team.
Diese Datei ergänzt `docs/NEUKOELLN-DESIGN.md` und ersetzt es nicht.

> **Offener Widerspruch (an Integration melden):** Die Gebietstabelle in
> `NEUKOELLN-DESIGN.md` ordnet noch anders zu (6-10 U-Bahn, 11-15 Altbau,
> 16-20 Bürokratie, 21-25 Spekulationsstadt). Diese Weltbibel folgt dem neueren
> Kanon unten. Die Design-Datei sollte von ihrem Eigentümer angeglichen werden.

## 0. Kanon auf einen Blick

| Ebene | Upstream | Neukölln-Region | Boss | Kern-Satire |
| --- | --- | --- | --- | --- |
| 1-5 | Sewers | **Neuköllner Hinterhöfe** – Höfe, Keller, Kanäle | Mietschimmel (Goo) | Mängel, die niemand behebt |
| 6-10 | Prison | **Das Amt ohne Termin** – unterirdische Bürgeramt-Außenstelle, Wartezonen statt Zellen | Kurzparker (Tengu; SUV, Arena Tempelhofer Feld, seit Runde 3) | Warten als Lebensform |
| 11-15 | Caves | **Die ewige Baustelle** – U7/U8-Schacht, Tunnelbau, Bergbau-Gefühl | Bohrlinde (DM-300) | Fertigstellung „voraussichtlich im Herbst" |
| 16-20 | City | **Das Renditequartier** – Luxussanierung, Investorenstadt | König der Eigentumswohnungen (Dwarf King) | Wohnen als Anlageklasse |
| 21-25 | Halls | **Unter dem Rathaus** – das Grundübel unter allem | Ewiger Mietspiegel (Yog-Dzewa) | Das System selbst |

Siegziel: der letzte **unbefristete Mietvertrag** Berlins (ersetzt das Amulett von Yendor;
Altbau, Kaltmiete von 1987, keine Staffel, kein Index, kein Eigenbedarf). Der Ewige Mietspiegel
will ihn zurück, der König der Eigentumswohnungen hat ihn gehortet.

Einstieg (Intro, Stand 2026-09-30): Du bist auf dem Weg zur Sitzung beim Mieterverein. Die M41
kommt erst nicht und fährt dir dann vor der Nase weg. Also schnell das Fahrrad aus dem Keller holen;
hinter dir fällt die Brandschutztür ins Schloss, der Schlüssel liegt irgendwo weiter unten.

Spätimann: Händler auf Ebene 6, 11 und 16 (An- und Verkauf). Klassen: Expat
(Magier), Alteingesessene (Krieger/Tank), Zugezogene (Fernkampf), Tourist
(Schurke/Schleicher).

Leitmotiv, das alle Regionen verbindet: Neukölln hieß bis 1912 Rixdorf und wurde
umbenannt, weil der Ort einen schlechten Ruf hatte – eine Imagekampagne
(siehe Fundstück F01). Im Spiel ist jede Ebene tiefer eine weitere „Umbenennung",
unter der das alte Rixdorf noch durchschimmert. Die Wahrheit liegt ganz unten.

---

## 1. Regionen und Orte

Hinweis zur Nutzung realer Orte: Plätze, Straßen, Bauwerke und Institutionen sind
Inspiration für Kulissen. Reale Firmen, Politiker, Initiativen und Privatleute
erscheinen **nicht namentlich** im Spiel. Wir erfinden Stellvertreter
(z. B. „Hausverwaltung Rendita GmbH" statt eines realen Konzerns).

### 1.1 Ebene 1-5: Neuköllner Hinterhöfe

Farbwelt: Backstein, Teerpappe, Fahrradleichen, Wäscheleinen, grünliche Kellerfeuchte.

| # | Ort / Motiv | Umsetzung im Spiel |
| --- | --- | --- |
| 1 | **Hinterhof im Altbau (1., 2., 3. Hof)** | Grundraum der Region: Hof-Tiles mit Mülltonnen-Batterie als Deko und Durchgangstor, das tiefer in den nächsten Hof führt. |
| 2 | **Kellerverschläge mit Latten** | Lattenwände als Tile-Variante; hinter verschlossenen Verschlägen liegen Truhen (Schlüssel = „Kellerschlüssel"). |
| 3 | **Tonnenhäuschen / Biotonnenhof** | Setpiece-Raum mit Biomüllschwarm-Spawn und Stinkgas-Pfützen. |
| 4 | **Sperrmüll am Bordstein** (Neukölln führt seit Jahren die Berliner Meldestatistik an, F02) | Zufallsdeko: Matratze, Ecksofa, Röhrenfernseher; die Zu-verschenken-Truhe (Mimic) tarnt sich darunter. |
| 5 | **Landwehrkanal / Maybachufer** | Wasser-Tiles mit Kanalpiranhas (Piranha); am Ufer Boule-Kiesfläche als begehbare Deko. |
| 6 | **Neuköllner Schifffahrtskanal / Weigandufer** | Längere Kanalräume mit Brücken-Engstellen; gut für Kanalpanzer-Kämpfe. |
| 7 | **Reuterplatz** (Rattenplage, F03) | Setpiece „Umzäunte Grünfläche": Bauzaun-Tiles, Rattenfallen als harmlose Deko, Pfandratten-Nest. |
| 8 | **Kanalisation mit Feuchttuch-Zöpfen** (F04) | Pumpwerk-Raum, in dem Feuchttuchzöpfe (Slime) spawnen; Deko: verstopfte Pumpe. |
| 9 | **Richardplatz / Böhmisches Dorf** | Ruhiger „Dorfkern"-Raum mit Kopfsteinpflaster und Petroleumlaterne; seltener Rastraum ohne Spawns. |
| 10 | **Körnerpark-Kellergewölbe** (barocke Parkanlage, hier fiktiv unterkellert) | Gewölbe-Raum mit Statue (Kunst-am-Bau-Statue). |
| 11 | **Pfandflaschen-Ecke im Hausflur** | Deko-Stapel aus Flaschen; Pfandgolem-Spawnpunkt, Scherbenfeld nach seinem Tod. |
| 12 | **Hasenheide-Tiergehege** (Damwild, Heidschnucken, Pfauen) | Schaf-NPC (im Spiel „Schaf“, optisch gern Heidschnucke); Gehege-Zaun als Raumteiler. |
| 13 | **Fahrradkeller** | Tile-Variante: Speichenhaufen; Leihscooter-Spawn, weil hier „endlich Parkplatz" ist. |

### 1.2 Ebene 6-10: Das Amt ohne Termin

Farbwelt: Linoleum in Amtsbeige, Neonröhre, Nummernanzeige in Rot, Topfpflanzen.
Zellen werden zu **Wartezonen**: Stuhlreihen, Nummernziehautomat, Glasschalter.

| # | Ort / Motiv | Umsetzung im Spiel |
| --- | --- | --- |
| 1 | **Rathaus Neukölln, Karl-Marx-Straße 83** (Uhrturm, ca. 68 m, oben eine Fortuna-Figur; F05) | Regionseingang: Treppenhaus mit Turmansicht; der Turm wiederholt sich als Landmarke auf Ebene 21-25. |
| 2 | **Bürgeramt-Wartehalle** | Standardraum: Stuhlreihen als halbdurchlässige Hindernisse, Nummernanzeige als Licht-Deko. |
| 3 | **Nummernziehautomat** | Interaktives Deko-Objekt, gibt eine „Wartenummer" (Flavor-Item ohne Nutzen, sammelbarer Running Gag). |
| 4 | **Glasschalter „Geschlossen"** | Tür-Variante: sieht aus wie Tür, ist aber Wand, bis ein Schalter umgelegt wird (klar markiert). |
| 5 | **Aktenkeller** | Ersetzt Gefängnis-Bibliothek; Schriftrollen-Häufung, Aktenskelette. |
| 6 | **Online-Terminportal (6:59 Uhr)** (F06) | Setpiece-Rätsel: ein Terminal öffnet genau in einem Zug eine Tür; wer zu spät kommt, wartet einen Zyklus. |
| 7 | **Ohne Ratskeller** (Rathaus Neukölln hat seit Kriegsschaden keinen Ratskeller mehr; F05) | Lore-Witz: Der „Ratskeller" existiert im Spiel nur als verschlossener Raum ohne Tür. Nur Deko. |
| 8 | **Standesamt-Flur** | Raumvariante mit Blumendeko; hier wartet der Ewige Antragsteller (Wandmaker). |
| 9 | **Büro mit Büropflanze** | Faulbeerranken-Quest-Raum: von der Faulbeere überwucherte Amtsstube. |
| 10 | **Stempelkarussell** | Deko-Tile, Fallen-Variante „Stempelfalle" (optisch neu, Mechanik der Upstream-Falle). |
| 11 | **Beschwerdebriefkasten** | Deko; Schlitz schluckt beim Untersuchen einen Flavor-Text. |
| 12 | **Spätimann Ebene 6** | Späti in einer ehemaligen Kantine: Kühlschrankschein, Regale, müder Inhaber. Sicherer Landmarken-Raum. |

### 1.3 Ebene 11-15: Die ewige Baustelle

Farbwelt: Beton, Baustellenrot-weiß, gelbes BVG-Signet (nur als fiktive
„U"-Schilder, keine Originallogos), Stirnlampenlicht, Grundwasser.

| # | Ort / Motiv | Umsetzung im Spiel |
| --- | --- | --- |
| 1 | **U-Bahnhof Hermannplatz (U7/U8-Kreuzung)** | Zweistöckiger Umsteigeraum; der gesperrte Zugang (Treppe seit 2020 zu, F07) ist eine Wand mit Bauzaun und Schild „Fertigstellung vsl. Herbst". |
| 2 | **U7-Tunnel unter der Karl-Marx-Straße** (15 Jahre Umbau, F08) | Lange Tunnelkorridore mit Gleisbett-Tiles; Deko-Kalender, der „Jahr 15" anzeigt. |
| 3 | **U-Bahnhof Rathaus Neukölln** | Bahnsteigraum, der später als Brücke zum Rathaus-Fundament (Ebene 21+) dient. |
| 4 | **U8 Hermannstraße / S-Bahn-Kreuz** | Umsteigekreuz: zwei Gleisebenen, Rampen; Ringbahn-Motiv als kreisförmiger Raum. |
| 5 | **Ringbahn „Hundekopf"** (Ringbahn wegen neuem Stellwerk Neukölln gesperrt, F09) | Setpiece: ein Rundkurs-Raum, dessen Ausgang „wegen Stellwerksarbeiten" durch Schienenersatzverkehr-Schild auf einen Umweg verweist. |
| 6 | **Aufzug außer Betrieb** (F07) | Tile-Deko; Aufzugsschacht als tiefer Abgrund (Chasm) mit klarer Kante. |
| 7 | **Rolltreppe steht** | Deko-Treppe, die man normal begehen kann; Flavor-Text „Ist jetzt eine Treppe." |
| 8 | **Notausgang Bildhauerweg** (Baustopp und Umplanung, F10) | Schmaler Nebengang, der in einer Sackgasse mit Statik-Gutachten-Schild endet. |
| 9 | **Kindl-Sudhaus mit Kupferkesseln** (sechs riesige Kessel, früher größte Braupfannen Europas; F11) | Setpiece-Halle: Kessel als Hindernisse, Dampf als Deko. Blacksmith-Quest-Eingang. |
| 10 | **Rixdorfer Höhe (Trümmerberg, ca. 68 m aus 700.000 m³ Schutt)** | Mine-Motiv: Schuttadern statt Erzadern für die Blacksmith-Quest. |
| 11 | **Tempelhofer-Feld-Unterbau** (fiktiv; reale Tunnel/Keller unter dem Flughafen nur als Anregung) | Große offene Höhle mit Windzug-Deko. Keine historischen NS-Bezüge verwenden. |
| 12 | **Schmiede am Richardplatz** (seit 1624 erwähnt, Familienbetrieb, F12) | Ursprünglich Raum des Alten Poliers; seit Runde 3 Technikerwerkstatt des Netztechnikers (Blacksmith-NPC), Esse und Amboss bleiben als Grafik. |
| 13 | **Spätimann Ebene 11** | Späti in einem ausgedienten Bauwagen neben dem Tunnelportal. |

### 1.4 Ebene 16-20: Das Renditequartier

Farbwelt: Sichtbeton, Messing, Milchglas, Lounge-Grün aus Kunststoff, dazwischen
alte Backsteinreste, die durchbrechen.

| # | Ort / Motiv | Umsetzung im Spiel |
| --- | --- | --- |
| 1 | **Karstadt am Hermannplatz** (1929 eröffnet, zwei Türme, Dachgarten; Nachbau-Pläne eines Investors, F13) | Zentraler Setpiece-Palast: ein Kaufhaus, das sein eigenes 1929-Ich nachbaut; Fassade aus zwei Epochen. |
| 2 | **Dachgarten-Terrasse** | Offene Bossarena-Vorstufe mit Pflanzkübeln als Deckung. |
| 3 | **Estrel und Estrel Tower** (größtes Hotel Deutschlands, 176-m-Turm an der Sonnenallee; F14) | Endloser Hotelflur mit identischen Türen; Teleport-Fallen-Variante „Falsches Zimmer". |
| 4 | **Klunkerkranich auf dem Parkdeck der Neukölln Arcaden** (Kulturdachgarten; F15) | Letzte Oase: Raum mit Hochbeeten, Bienen (Bee) und Tauschregal. Kein Investorengegner betritt ihn (Lore, keine Mechanikzusage). |
| 5 | **Kindl-Areal / Kunstzentrum** | Galerie-Raum: Bilderrahmen als Deko, einer davon ist ein Mimic. |
| 6 | **Weserstraße** (Barmeile, stark gestiegene Mieten; F16) | Lange Flaniermeile als Korridor mit Barhockern als Hindernissen und Schildern „Beer Yoga". |
| 7 | **Sonnenallee** (2,6 km vom Hermannplatz bis über den Kanal) | Sehr langer, gerader Korridor; Leuchtreklame als Lichtquellen. |
| 8 | **Schillerkiez am Tempelhofer Feld** (Aufwertungsdruck seit Feldöffnung; F17) | Wohnblöcke mit neuen Balkonen aus Glas, die man nicht betreten darf. |
| 9 | **Randbebauung Tempelhofer Feld** (Volksentscheid 2014, Debatte wieder offen; F17) | Setpiece: Baufeld-Markierungen auf leerer Wiese, die sich pro Besuch verschieben. |
| 10 | **Ehemaliger Club an der Sonnenallee** (Club musste 2020 weichen, Investor wollte bauen; F18) | Leere Halle mit Stroboskop-Deko, still; Wiedergänger-Nest. |
| 11 | **Möbliertes Mikroapartment** (Mietpreisbremse wird über Möblierung umgangen; F19) | Raumtyp „Wohnen auf Zeit": 9-Tile-Zelle mit Designer-Lampe; Truhe darin kostet Gold zum Öffnen (Flavor, nur wenn Gameplay es will). |
| 12 | **Showroom / Musterwohnung** | Raum voller Deko-Möbel, die sich nicht benutzen lassen. |
| 13 | **Spätimann Ebene 16** | Der letzte Späti im Quartier, eingeklemmt zwischen Concept Store und Showroom. Seine Preise bleiben normal (Mechanik: Standardpreise). |

### 1.5 Ebene 21-25: Unter dem Rathaus

Farbwelt: Stadtbad-Mosaik, Säulen, tiefe Blau- und Grüntöne, Aktenregale, die in
Felswände übergehen; ganz unten roter Samt der Ratssäle.

| # | Ort / Motiv | Umsetzung im Spiel |
| --- | --- | --- |
| 1 | **Fundament des Rathausturms** | Der Turm von Ebene 6 steht auf dem Kopf; Treppe nach unten statt oben. |
| 2 | **Stadtbad Neukölln** (1914, Säulen, Mosaiken, Tempelgrundriss; F20) | Hallen-Setpiece: Becken als tiefes Wasser, Säulen als Deckung. |
| 3 | **Plenarsaal mit Vertäfelung** | Yog-Arena-Vorraum; Stuhlreihen, Rednerpult. |
| 4 | **Das Grundbuchamt** | Aktenhalle mit endlosen Regalen; Demon-Spawner-Variante „Kündigungsschleuder“. |
| 5 | **Fortuna auf dem Turm** | Wiederkehrende Statuen-Deko; Glücksmotiv für Ringe des Wohlstands. |
| 6 | **Alt-Rixdorf unter Neukölln** (Umbenennung 1912; F01) | Tiefster Ring: alte Ortsschilder „Rixdorf" an den Wänden – das verdrängte Original. |
| 7 | **Hufeisensiedlung Britz** (1925-30, UNESCO-Welterbe) | Hufeisenförmiger Raum als Erinnerung an sozialen Wohnungsbau; Heilquelle-/Tau-Motiv. |
| 8 | **Gropiusstadt-Hochhaus „Ideal"** (30 Wohngeschosse) | Vertikaler Schacht-Raum, der als Abgrund-Deko dient. |
| 9 | **Neukölln-Chronik** | Wandtafeln mit Lore-Schnipseln (Signs), die den Weg zur Wahrheit erzählen. |
| 10 | **Rixdorfer Musike** („In Rixdorf ist Musike", Gassenhauer um 1900) | Audio-/Text-Motiv: ferne Musik als Flavor, lauter werdend Richtung Boss. |

---

## 2. Gegner- und NPC-Mapping

Regel: Die Upstream-Mechanik bleibt, nur Name, Look und Text wechseln. Jede
Beschreibung muss die Mechanik ehrlich nennen (siehe Stil-Leitfaden).
Namensabgleich 2026-09-29: `actors_de.properties` ist führend. **Fette** Namen stehen
so im Spieltext; die Konzeptspalte beschreibt die Upstream-Mechanik.

### 2.1 Ebene 1-5: Neuköllner Hinterhöfe

| Upstream | Neukölln-Name | Konzept passend zur Mechanik |
| --- | --- | --- |
| Rat | **Pfandratte** | Schwacher Einstiegsgegner, der in Flaschenkisten wohnt und jeden Deckel für seinen hält. |
| Albino (Albino-Ratte) | **Albino-Pfandratte** | Seltene weiße Pfandratte mit gezackten Zähnen; ihr Biss verursacht Blutung wie upstream. |
| Snake | **Kabelschlange** | Verhedderte Verlängerungskabel mit hoher Ausweichchance; schwer zu treffen, leicht zu überrumpeln (Überraschungsangriffe). |
| Gnoll (Scout) | **Besichtigungswicht** | Schlangestehender Wohnungsinteressent mit Bewerbungsmappe; Standard-Nahkämpfer. |
| Gnoll Exile | **verstoßener Tiefbauer** | Passiver Bauwicht mit Verstoßenen-Markierung (flog raus, weil er pünktlich fertig wurde); greift nur an, wenn provoziert. |
| Gnoll Trickster | **Abstandswicht** | Verlangt 3000 Euro Abstand für eine Einbauküche und hält selbst Abstand; wirft Pfeile mit Statuseffekten (wie upstream); Geist-Quest-Gegner. |
| Crab | **Kanalpanzer** | Schneller, gepanzerter Kanalbewohner aus dem Landwehrkanal. |
| Hermit Crab | Tonnenpanzer | Kanalpanzer mit Biotonnendeckel auf dem Kopf; langsamer, mehr Verteidigung, klappert beim Laufen. |
| Great Crab | **großer Kanalpanzer** | Hält eine alte Kühlschranktür als Schild und blockt Angriffe, solange er dich sieht; Geist-Quest-Gegner. |
| Swarm | **Biomüllschwarm** | Fruchtfliegen aus der Biotonne; teilt sich bei Treffern. |
| Slime | **Abflussschleim** | Gummiartiger Schleim aus dem Rohrbruch-Keller; begrenzt hohe Einzeltreffer wie upstream. (Art-Datei nutzt Feuchttuch-Optik.) |
| Caustic Slime | **ätzender Abflussschleim** | Abflussschleim aus dem Fettabscheider; hinterlässt ätzenden Schleim. |
| Fetid Rat | **verfaulende Pfandratte** | Stinkende Pfandratte, die im August in der Biotonne übernachtet hat; sondert Stinkgas ab; Geist-Quest-Gegner. |
| Goo | **Mietschimmel** | Boss: schwarzer Schimmel aus der Ecke hinter dem Schrank. Lädt telegrafiert einen Sprung-/Flächenangriff auf; in Pfützen regeneriert er. „Falsch gelüftet", sagt die Hausverwaltung. |
| Piranha | **Kanalpiranha** | Wohnt in tiefem Wasser, verlässt es nie; im Landwehrkanal ausgesetzt. Einfach nicht reinspringen. |
| Phantom Piranha | **Phantom-Kanalpiranha** | Wird durchscheinend und taucht an anderer Wasserstelle wieder auf, wie upstream. |
| Sheep (NPC/Zauber) | **Schaf** | Harmlos, blockiert Wege für kurze Zeit; magisch, verschwindet von selbst. |
| Ghost (NPC) | **Dagebliebener Schwabe** (ersetzt den Traurigen Altmieter, 2026-09-29) | Ein Schwabe, der an Weihnachten ausnahmsweise nicht zur Familie gefahren ist. Alle Berliner Freunde sind bei ihren Eltern, niemand grüßt zurück, und er ist so allein, dass er schon halb durchsichtig ist (daher bleibt das Geist-Sprite halbtransparent). Er ist nicht tot. Monster blockieren Kellerabteil, Christbaumständer oder Mülltonnen; er bittet dich um Hilfe und lässt dich zwischen Waffe und Rüstung wählen. Derselbe Mann ist der Begleiter aus dem Nadelnden Christbaum. Stimme: `NEUKOELLN-WRITERSROOM.md` §3. |
| Rat King (NPC) | Der Pfandkönig | Schläft auf einem Thron aus Leergut, hält Hof über die Pfandratten und ist beleidigt, wenn man ihn weckt. |
| *Eigen:* Gas Alchemist | **Herr Fuß** | Seit Runde 3: frei erfundener, eigenwilliger Nachbar mit Käsefüßen, ausgelatschten Socken und Latschen. Kein Rollstuhl, kein Apparat, kein Gas als Motiv. Er schlüpft einen Zug vorher aus den Latschen, dann steht die Stinkwolke (mechanisch die bisherige Giftwolke) um ihn. Karikiert wird nur der Mief. |
| *Eigen:* E-Scooter | **Leihscooter** | Klingelt eine Runde lang, dann Sturmfahrt in gerader Linie; knallt gegen Wände. Hat noch nie einen Parkplatz gefunden. |
| *Eigen:* Pfandgolem | **Pfandgolem** | Langsamer Flaschenberg, der hart zuschlägt; zerbricht in ein Scherbenfeld, das Laufwege verändert. Nimmt es der Welt übel, nie zurückgebracht worden zu sein. |

### 2.2 Ebene 6-10: Das Amt ohne Termin

| Upstream | Neukölln-Name | Konzept passend zur Mechanik |
| --- | --- | --- |
| Skeleton | **ewig Wartender** | Wartender, der nie aufgerufen wurde, bis nur Knochen und Wartemarke blieben; explodiert beim Tod in Knochen (Flächenschaden wie upstream). |
| Thief | **Nummernklauer** | Klaut ein Item und rennt; wer ihn einholt, bekommt es zurück. |
| Bandit | **Nummernhehler** | Elite-Nummernklauer im lila Trainingsanzug; sein Treffer blendet, vergiftet und verkrüppelt wie upstream. |
| DM-100 | **DM-100 Aufrufautomat** | Nummernanzeige auf Beinchen; schießt Blitze auf Distanz, im Wasser besonders gefährlich. |
| Guard | **Amtssecurity** | Zieht dich mit einer Kette zu sich („Haben Sie einen Termin?“); dann Nahkampf. |
| Necromancer | **Wiedervorlagebeamter** | Belebt ewig Wartende und hält Abstand; zuerst ausschalten. |
| Spectral Necromancer | **Geister-Sachbearbeiter** | Beschwört Vormieterspuk statt ewig Wartender. |
| Rot Lasher | **Faulbeerranke** | Unbewegliche Ranke der Büropflanze Faulbeere, die zuschlägt, wenn man danebensteht. |
| Rot Heart | **Faulbeerherz** | Herz der Faulbeere, gibt Giftgas ab; bewegt sich nicht, muss zerstört werden (Antragsteller-Quest). |
| Wandmaker (NPC) | **Ewiger Antragsteller** | Rüstiger alter Herr mit vergilbter Wartenummer, laut Anzeige seit Jahrzehnten als Nächstes dran; gibt dir einen Zauberstab, wenn du vorher sein Anliegen erledigst. |
| Tengu | **Kurzparker** (bis Runde 2: Schalterspringer) | Boss: SUV ohne Marke, der hinter der Außenstelle das Tempelhofer Feld als Parkplatz entdeckt hat und „nur kurz“ steht. Umparken = Teleport, Parkknöllchen aus dem Seitenfenster = Wurfgeschoss, Haufen mit Scheibenwaschdüse = Phase-1-Fallen; Phase 2: Abgasbombe, Glut aus der Grillzone, Alarmanlage. Drop: Duftbäumchen des Kurzparkers. |
| Wraith | **Vormieterspuk** | Rachsüchtiger Geist eines Vormieters, dessen Sperrmüll angerührt wurde; schwer zu treffen, aber schwach. |
| Tormented Spirit | **gequälter Vormieter** | Verfluchter Geist; mit Fluch-Entfernen befreit, belohnt er dich. |
| Statue | **belebte Kunst-am-Bau-Statue** | Belebte Statue mit Waffe, die du nach dem Kampf behältst. |
| Armored Statue | **gepanzerte Kunst-am-Bau-Statue** | Wie oben, zusätzlich mit Rüstung; härter, aber doppelte Beute. |
| Shopkeeper | **Spätimann** | Händler auf 6, 11, 16: kauft und verkauft. Trocken, unbeeindruckt, macht Wechselgeld. Nie als ethnischer Witz. |

### 2.3 Ebene 11-15: Die ewige Baustelle

| Upstream | Neukölln-Name | Konzept passend zur Mechanik |
| --- | --- | --- |
| Bat | **Schachtvampir** | Schnelle Fledermaus aus den U-Bahn-Schächten, heilt sich durch Treffer. |
| Brute (Gnoll Brute) | **Bautrupp-Grobian** | Stärkster Bauwicht im Trupp, Helm nie richtig auf; bei tödlichem Schaden kurze Raserei mit Schild wie upstream. |
| Armored Brute | **gepanzerter Bautrupp-Grobian** | Gepanzerte Variante; Raserei hält länger. |
| Shaman (rot) | **Bautrupp-Gutachter** (rot) | Zaubert auf Distanz und schwächt dich („Mangel festgestellt“). |
| Shaman (blau) | **Bautrupp-Gutachter** (blau) | Macht dich verwundbar („Tragfähigkeit fraglich"). |
| Shaman (lila) | **Bautrupp-Gutachter** (lila) | Verhext dich („Genehmigung ausstehend"). |
| Spinner | **Flatterbandspinne** | Spinnt rot-weißes Absperrnetz und vergiftet; hält Abstand. |
| DM-200 | **DM-200 Bauaggregat** | Verteidigungsmaschine der Eigentümerzwerge, stößt giftiges Gas aus. |
| DM-201 | **DM-201 Wachaggregat** | Stationärer Wächter mit ätzendem Gas; bewegt sich erst nach Treffer. |
| Gnoll Geomancer | **Tiefbau-Geomant** | Chef des Bautrupps in der Mine: lässt Schuttbrocken fallen (mit Vorwarnung) und schützt sich mit Gestein. |
| Gnoll Guard | **Bautrupp-Wachmann** | Speerträger ohne Helm, stärker neben dem Geomanten. |
| Gnoll Sapper | **Bautrupp-Sprengmeister** | Wirft Gesteinsbrocken und ruft Wachleute; flieht vor Nahkampf. |
| Delayed Rock Fall | Putzbrocken | Umgebungsgefahr: Markierte Felder zeigen an, wo nächste Runde Putz von der Decke fällt. |
| Crystal Wisp | **Kristallbüschel** | Leuchtet wie ein Späti um vier Uhr morgens, schießt Lichtstrahlen; Kristall-Minen-Variante. |
| Crystal Guardian | **Kristallwächter** | Wächter der Glasbaustein-Mine; schläft ein, wenn man ihn in Ruhe lässt. |
| Crystal Spire | **Riesenkristall** | Bossobjekt der Kristallmine, schießt Kristallsplitter; mit der Spitzhacke zerschlagen. |
| Fungal Core / Sentry / Spinner | **Hausschwamm-Kern / Hausschwamm-Wache / Hausschwamm-Spinne** | Pilz-Minen-Variante: Hausschwamm hat im Stollen ein eigenes Ökosystem gebaut, laut Gutachten „optisch unbedenklich“. Kern stationär, Wache schießt Sporen. |
| Pylon | Baustromverteiler | Energiesäulen der Bossarena; wer sie aktiv lässt, bekommt Stromschläge ab. |
| DM-300 | **DM-300 Bohrlinde** | Boss: Tunnelbohrmaschine mit Namensschild. Gräbt, stampft, stößt Gas aus; wird von Baustromverteilern gespeist. „Fertigstellung vsl. im Herbst.“ Welcher Herbst, steht nicht da. |
| Blacksmith (NPC) | **Netztechniker** (bis Runde 2: Alter Polier) | Der Techniker vom Netzbetreiber, auf den man seit zwei Jahren wartet („Termin zwischen 8 und 18 Uhr“); kein Markenname, keine Markenfarbe. Du holst ihm 40 Glasfaserstücke (vorher Dunkelgold-Erz) aus dem Kabelschacht, dann verbessert und schmiedet er Items. Mechanik unverändert. |
| Crystal Mimic | **Kristall-Verschenkkiste** | Glasvitrine, die mit einem Item flieht; beim Einholen gibt es Beute. |

### 2.4 Ebene 16-20: Das Renditequartier

| Upstream | Neukölln-Name | Konzept passend zur Mechanik |
| --- | --- | --- |
| Ghoul | **Kleinanleger-Wiedergänger** | Treten paarweise auf; fällt einer, steht er wieder auf, solange der Partner lebt. |
| Fire Elemental | **Heizkosten-Feuerelementar** | Brennt und setzt dich in Flammen; Einschlag trifft wie eine Nachzahlung. |
| Frost Elemental | **Heizungsausfall-Frostelementar** | Friert dich ein. |
| Shock Elemental | **Kurzschluss-Schockelementar** | Blitzt Umstehende und entwaffnet kurz. |
| Chaos Elemental | **Nebenkosten-Chaoselementar** | Zufälliger Effekt pro Treffer, wie upstream. |
| Warlock | **Abschreibungshexer** | Hält Abstand und schwächt dich mit Zaubern; heilt sich an Gefolge. „Das ist keine Miete, das ist eine Investition in Sie." |
| Monk | **Concierge-Mönch** | Schnelle Schläge, konzentriert sich und pariert; kann dir die Waffe verschwinden lassen. |
| Senior | **Ober-Concierge** | Seltene, stärkere Coach-Variante mit festem Hieb. |
| Golem | **Umzugsgolem** | Robuster Wächter, teleportiert dich weg oder sich heran. |
| Dwarf King | **König der Eigentumswohnungen** | Boss: ehemaliger Hausverwalter der Eigentümerzwerge; beschwört Gefolge über Portale, entzieht Lebenskraft, Phase 2 mit Krone und Schild. Hortet den unbefristeten Mietvertrag. |
| Imp (NPC) | **Ehrgeiziger Filialist** | Filialleiter einer Späti-Kette, die nur aus ihm besteht; will, dass du Umzugsgolems oder Concierge-Mönche erledigst und Belege sammelst; zahlt mit einem Ring. |
| Imp Shopkeeper | **Ehrgeiziger Filialist** (Händler) | Upstream-Händler auf Ebene 21. Er ist **nicht** der Spätimann (der bleibt auf 6/11/16). |
| Bee | **Dachgarten-Biene** | Aus dem Honigtopf; verteidigt den Stock, kann Verbündete werden. |
| Golden Mimic | **goldene Zu-verschenken-Truhe** | Stärkere, glänzende Zu-verschenken-Truhe mit besserer Beute. |

### 2.5 Ebene 21-25: Unter dem Rathaus

| Upstream | Neukölln-Name | Konzept passend zur Mechanik |
| --- | --- | --- |
| Succubus | **Stadtmarketing-Sukkubus** | Bezaubert (Charme) und springt; saugt Leben. Flüstert Imagekampagnen-Slogans. Keine sexualisierte Darstellung. |
| Eye (Evil Eye) | **Auge des Ordnungsamts** | Sieht alles; lädt sichtbar einen Todesblick auf und feuert einen Strahl; Deckung suchen. |
| Scorpio | **Mahnbescheid-Skorpion** | Schießt aus Distanz Stacheln mit Aktenzeichen und verkrüppelt; flieht vor Nahkampf. |
| Acidic Scorpio | **ätzender Mahnbescheid-Skorpion** | Wie oben, aber Treffer ätzen zurück; „die Neufassung". |
| Ripper Demon | **Entmietungsdämon** | Springt aus Distanz an und verursacht Blutung; kommt aus der Kündigungsschleuder. |
| Demon Spawner | **Kündigungsschleuder** | Stationäres Portal, das Entmietungsdämonen ausspuckt, bis es zerstört ist. |
| Yog-Dzewa | **Ewiger Mietspiegel** | Endboss: das Grundübel unter dem Rathaus, ein alter Gott, der alle zwei Jahre wächst. Ruft Fäuste und Larven, lässt sich nicht direkt verletzen, solange seine Fäuste leben. |
| Burning Fist | **Heizkostenfaust** | Brennt und setzt den Boden in Flammen. |
| Soiled Fist | **Fassadenbegrünungsfaust** | Lässt Pflanzen/Sporen wuchern, heilt sich im Gras. |
| Rotting Fist | **Faust des Instandhaltungsstaus** | Heilt in Wasser, verursacht Fäulnis/Gift. |
| Rusted Fist | **Ratenzahlungsfaust** | Verkrüppelt, Schaden kommt verzögert („Sie haben 14 Tage Zeit"). |
| Bright Fist | **Hochglanzprospekt-Faust** | Blendet und teleportiert sich weg. |
| Dark Fist | **Nebenkostenfaust** | Löscht Licht und teleportiert sich weg. |
| Larva (Yog's Larva) | **Mieterhöhungslarve** | Kleine, zahlreiche Gegner, die aus dem Mietspiegel kriechen. |

### 2.6 Regionsübergreifend

| Upstream | Neukölln-Name | Konzept passend zur Mechanik |
| --- | --- | --- |
| Mimic | **Zu-verschenken-Truhe** | Kiste mit Zettel am Straßenrand; beißt, wenn man sie öffnet. Beute bleibt fair. |
| Golden Mimic | **goldene Zu-verschenken-Truhe** | Siehe 2.4. |
| Ebony Mimic | **Ebenholz-Verschenkkiste** | Nicht sichtbar, bis man sie berührt; nur in Truhenräumen. |
| Crystal Mimic | **Kristall-Verschenkkiste** | Siehe 2.3. |
| Statue / Armored Statue | **Kunst-am-Bau-Statue** | Siehe 2.2. |
| Wraith | **Vormieterspuk** | Siehe 2.2. |
| Bee | **Dachgarten-Biene** | Siehe 2.4. |
| Piranha / Phantom Piranha | **Kanalpiranha / Phantom-Kanalpiranha** | Siehe 2.1. |
| Tormented Spirit | **gequälter Vormieter** | Siehe 2.2. |
| Mirror Image / Prismatic Image | **Spiegelbild / Lichtbrechung** | Verbündete Kopien des Spielers. |
| Vault-Gegner (VaultRat, VaultSkeleton, VaultDM100, VaultDM200, VaultShaman, VaultGhoul, VaultGolem, VaultElemental, VaultBossElemental, VaultSentry, VaultLaser, VaultMirror, VaultTokenDoor) | Tresor-Varianten: „Schließfach-" + Grundname (z. B. Schließfach-Pfandratte, Schließfach-Wartender) | Upstream-Testinhalt im Ordner `quest/vault`. Thema „Tresorraum der Hausverwaltung": Wachen patrouillieren feste Routen, Sensoren (VaultSentry = „Bewegungsmelder") scannen Linien. Erst ausarbeiten, wenn Gameplay bestätigt, dass Vaults im Fork aktiv sind. |

### 2.7 Helden: Subklassen und Rüstungsfähigkeiten

Stand 2026-09-29, so in `actors_de.properties`. Mechanik unverändert upstream.

| Klasse (Upstream) | Subklassen | Rüstungsfähigkeiten |
| --- | --- | --- |
| Alteingesessene (Warrior) | **Wutbürgerin** (Berserker), **Kiezboxerin** (Gladiator) | **Sprung übern Hof** (Heroic Leap), **Ruhe da unten!** (Shockwave), **Aussitzen** (Endure) |
| Expat (Mage) | **Hands-on-Gründer** (Battlemage), **Growth-Hacker** (Warlock; Seelenmarkierung heißt „Lead-Markierung“) | **Disruption** (Elemental Blast), **Brainstorming** (Wild Magic), **Homeoffice-Anker** (Warp Beacon) |
| Tourist (Rogue) | **Schnappschütze** (Assassin), **Sightseeing-Sprinter** (Freerunner) | **Blitzlicht** (Smoke Bomb, Köder = Pappaufsteller), **Roter Pin** (Death Mark), **Partnerlook** (Shadow Clone) |
| Zugezogene (Huntress) | **Abstandshalterin** (Sniper), **Baumscheibenpatin** (Warden) | **Upcycling-Klingen** (Spectral Blades), **Balkonkraftwerk** (Nature's Power), **Geistertaube** (Spirit Hawk) |
| Zweikämpferin (Duelist) | **Nebenjobberin** (Champion), **Hinterhof-Yogini** (Monk) | Fähigkeiten noch upstream |
| Kleriker (Cleric) | **Quartiersmanager** (Priest), **Mieterschützer** (Paladin) | Fähigkeiten noch upstream |

Pflanzen und Samenbomben: siehe 3.1. Heiltrank = Ingwer-Heilshot.

---

## 3. Item-Kategorien

Grundregel: Neuer Name und Flavor-Text, Mechanik und Werte bleiben lesbar. Die
Unbekannt-Namen (Farben, Runen, Edelsteine) können Neukölln-Motive bekommen,
z. B. Tränke nach Späti-Getränkefarben.

| Kategorie | Neukölln-Motiv | Namensbeispiele (Upstream → Vorschlag) |
| --- | --- | --- |
| **Tränke** | Späti-Getränke in Flaschen mit Eigenetikett | Heilung → Späti-Mate; Stärke → Doppelkorn der Alteingesessenen; Erfahrung → Kiezweisheit in Flaschen; Hast → Energy-Dose „Ringbahn"; Unsichtbarkeit → Tarnkappen-Tonic; Levitation → Heliumballon-Limo; Gedankensicht → Nachbarschafts-App-Saft; Giftgas → Feuchter-Keller-Aroma; Lähmgas → Amtsluft; Flüssigfeuer → Grillanzünder vom Feld; Frost → Eiswürfelbeutel; Reinheit → Stoßlüften. Unbekannt-Namen: Etikettfarben („Club-Mate-gelbe Flasche", „Waldmeistergrüne Flasche"). |
| **Schriftrollen** | Zettel, Aushänge, Bescheide | Verbesserung → Modernisierungsankündigung; Identifizieren → Mietspiegel; Magische Karte → Liniennetzplan; Teleportation → Schienenersatzverkehr; Fluch entfernen → Mängelbehebung; Wiederaufladen → Steckdosen-Fund; Spiegelbild → Doppelgänger-Anmeldung; Wut → Hausordnung; Schrecken → Mahnung in Rot; Schlaflied → Ruhezeiten-Aushang; Vergeltung → Widerspruch; Verwandlung → Umwidmung. Unbekannt-Namen: Aushang-Titel („ZU VERSCHENKEN", „WG sucht", „KATZE ENTLAUFEN"). |
| **Ringe** | Schlüsselringe, Kronkorken, Festival-Bändchen | Wohlstand → Fortunas Ring (Rathausturm-Figur); Hast → Monatskarten-Ring; Ausweichen → Tourist-Ausweichring; Genauigkeit → Kiezkenner-Ring; Kraft → Fahrradschloss-Ring (bewusst kein Schlagring); Macht → Mietvertrags-Ring (unbefristet); Energie → Powerbank-Ring; Zähigkeit → Ick-wohn-hier-Ring; Elemente → Vier-Jahreszeiten-Ring; Scharfschuss → Frisbee-Ring vom Feld; Raserei → Espresso-Ring; Arcana → Dritter-Ring-von-Links. Unbekannt-Namen: Kronkorken-Sorten. |
| **Zauberstäbe** | Laserpointer, Selfie-Sticks, Baustellen-Leuchtstäbe, Dirigierstab | Magisches Geschoss → Präsentations-Laserpointer; Feuerstoß → Grillanzünder-Stab; Frost → Kühlakku-Stab; Blitz → Baustrom-Kabel; Zersetzung → Schimmelsporenstab; Korruption → Provisionsstab; Druckwelle → Laubbläser; Lebende Erde → Hochbeet-Stab; Nachwachsen → Guerilla-Gärtner-Stab; Transfusion → Blutspende-Werbestab; Prismatisches Licht → Diskokugel-Stab; Zerfall (Disintegration) → Abrissbirnen-Stab; Schutzwache → Bauzaun-Stab. Expat-Flavor: Aktivierung mit Business-Englisch („Let's circle back!"), deutsche Effektzeile darunter. |
| **Artefakte** | Kiez-Reliquien mit Ladung | Umhang der Schatten → Kapuzenpulli des Touristen; Zeitmesser-Sanduhr → BVG-Fahrplan (unzuverlässig); Horn des Überflusses → Späti-Tüte; Kelch des Blutes → Blutspende-Pokal; Ätherische Ketten → Fahrradkette; Getrocknete Rose → Nadelnder Christbaum (Rosenblätter → Vertrocknete Tannenzweige; ersetzt die Balkonrose); Sandalen der Natur → Birkenstock des Gärtners; Lloyds Leuchtfeuer → Schlüsselfinder; Alchemistenkasten → Mate-Brauset; Dornenumhang → Kaktus-Rucksack; Talisman der Voraussicht → Wetter-App; Instabiles Zauberbuch → Sprachkurs A1; Heiliges Buch → Grundgesetz-Taschenbuch; Meisterdieb-Armband → Festivalbändchen. |
| **Kleinode (Trinkets)** | Fundstücke vom Sperrmüll | Rattenschädel → Pfandrattenschädel; Dreizehnblättriges Kleeblatt → Kleeblatt vom Tempelhofer Feld; Mimikzahn → Truhenzahn; Salzwürfel → Streusalz-Brocken; Fallenmechanik → Stolperkante; Rest nach Bedarf. |
| **Waffen** | Improvisiertes aus Hof, Baustelle und Späti | Nahkampf: Kuli (Dolch), Zollstock (Schwert), Baustellenbake (Speer), Spitzhacke der Baustelle, Wischmopp (Quarterstaff), Schraubenschlüssel (Streitkolben), Kehrschaufel (Axt). Fernkampf: Kronkorken (Wurfsterne), Hoftauben (Wurfsteine), Bumerang-Frisbee (Zugezogene), Dartpfeile vom Kneipenautomat. Keine realen Waffen verherrlichen. |
| **Rüstungen** | Kleidung als Statussymbol | Stoff → Kapuzenpulli; Leder → Kiezjacke; Kette → Fahrradkurier-Weste; Schuppe → Warnweste mit Reflektoren; Platte → Bauhelm-Komplettausrüstung. Klassenrüstungen: Expat = Merch-Hoodie der Startup-Konferenz; Alteingesessene = Trainingsanzug seit 1989; Zugezogene = Funktionsjacke; Tourist = Regenponcho mit Stadtplan. |
| **Nahrung** | Späti, Imbiss, Wochenmarkt | Ration → Dönerteller; kleine Ration → Schrippe; Pastete → Currywurst; Mystery Meat → Undefinierbarer Grillrest; Gegrilltes → Grillgut vom Feld; Beeren → Obst vom Maybachufer-Markt; Fadfrucht (Blandfruit) → Spätiobst mit Samen-Aroma; Gefrierfleisch → Tiefkühlpizza. Kein Essen als Herkunfts-Witz. |
| **Samen/Pflanzen** | Samenbomben aus dem Guerilla-Gardening, Doppelsinn-Gewächse | Umgesetzt nach Konzept A, siehe 3.1. |
| **Bomben** | Böller (Silvester in Neukölln), Farbbeutel | Bombe → Böller; Brandbombe → Wunderkerzen-Bündel; Lärmbombe → Bluetooth-Box; Frostbombe → Trockeneis-Böller; Heiligbombe → Konfettikanone. Silvester-Motiv ohne Verharmlosung echter Verletzungen. |
| **Schlüssel** | Schlüsselbund des Hauswarts | Eisenschlüssel → Kellerschlüssel; Goldschlüssel → Hausverwaltungsschlüssel; Kristallschlüssel → Transponder-Chip; Skelettschlüssel → Generalschlüssel. |
| **Gold** | Kleingeld und Pfand | „Kleingeld" im UI, Flavor: Münzen plus Pfandbons. Mechanik bleibt Gold. Der Spätimann nimmt „alles außer Karte" (nur Text, keine Mechanik). |


### 3.1 Samen und Pflanzen: Konzeptvergleich (2026-09-29)

Mechanik (unverändert): Ein Samen wird geworfen oder gepflanzt, daraus wächst eine Pflanze,
die beim Betreten einmal ihren Effekt auslöst. Spieler lernen die Pflanzen über den Namen,
also muss der Name den Effekt verraten, und Samen und Pflanze müssen sofort zusammengehören.

**Konzept A: Samenbomben und Doppelsinn-Gewächse.** Samen sind Samenbomben aus dem
Guerilla-Gardening (Erde, Ton, Samen), die man auf Baumscheiben, in Pflasterritzen oder
Gegnern vor die Füße wirft. Daraus wächst ein Kiez-Gewächs, dessen Name ein deutsches Wort mit
doppeltem Boden ist: botanisch klingend, im Alltag der Effekt.

| Upstream | Effekt | Pflanze | Samen | Warum |
| --- | --- | --- | --- | --- |
| Sungrass | Heilung | Pflasterkraut | Pflasterkraut-Samenbombe | Wächst zwischen Pflastersteinen, wirkt wie ein Pflaster. |
| Firebloom | Feuer | Brandnessel | Brandnessel-Samenbombe | Die Brennnessel, die ernst macht. |
| Icecap | Frost | Frostbeule | Frostbeulen-Samenbombe | Knolle und Kälteschaden in einem Wort. |
| Sorrowmoss | Gift | Neidmoos | Neidmoos-Samenbombe | Giftig vor Neid; „kein Moos“-Witz bleibt. |
| Blindweed | Blenden | Blendwerk | Blendwerk-Samenbombe | Blendet, und alles ist nur Blendwerk. |
| Stormvine | Schwindel | Schwindelranke | Schwindelranken-Samenbombe | Schwindel wie Drehwurm und wie Maklerexposé. |
| Earthroot | Rüstung, solange man stehen bleibt | Sitzfleischwurz | Sitzfleischwurz-Samenbombe | Schützt nur, wer sitzen bleibt; Bewegen bricht sie. |
| Fadeleaf | Teleport an zufälligen Ort | Räumungsklee | Räumungsklee-Samenbombe | Plötzlich woanders wohnen. |
| Mageroyal | Reinigung von Negativeffekten | Kehrwochenkraut | Kehrwochenkraut-Samenbombe | Zugezogene Putzordnung, putzt alles weg. |
| Starflower | Segen | Mietsenkungsblume | Mietsenkungsblumen-Samenbombe | Heilig und extrem selten. |
| Swiftthistle | Zeit beschleunigt | Hektikdistel | Hektikdistel-Samenbombe | Mittelstreifen-Tempo. |
| Rotberry | Giftgas (Quest) | Faulbeere | Faulbeeren-Samenbombe | Bleibt, Quest-Kanon. |
| Blandfruit | Kochzutat | Fadfrucht | Fadfrucht-Samenbombe | Bleibt. |

**Konzept B: Berliner Imperativ-Kräuter.** Samen sind Tütchen vom Balkon der Altmieterin,
beschriftet in Berliner Schnauze; jede Pflanze heißt wie der Satz, den man dabei hört:
Wird-schon-Kraut (Heilung), Brennt-dit-Rose (Feuer), Frierste-Kappe (Frost), Pfui-Moos (Gift),
Kiekste-nich-Kraut (Blenden), Dreh-dich-Ranke (Schwindel), Bleib-stehn-Wurz (Rüstung),
Hau-ab-Blatt (Teleport), Allet-sauber-Kraut (Reinigung), Glück-jehabt-Stern (Segen),
Mach-hinne-Distel (Tempo), Faulbeere, Fadfrucht. Samen jeweils „Samentütchen …“.

**Empfehlung: Konzept A.** Beide Konzepte sind über den Namen lernbar. A ist aber
eigenständiger und bissiger: Die Samenbombe erklärt, warum Samen geworfen werden, und
„Pflasterkraut“, „Sitzfleischwurz“ oder „Kehrwochenkraut“ treffen Effekt und Kiez-Satire mit
einem Wort. B nutzt sich ab (elf Mal derselbe Witz), liest sich in Menüs und Dartpfeil-Texten
(„auf Basis von Kiekste-nich-Kraut“) holprig und legt die Schnauze in Tooltips, was Regel 2 des
Stil-Leitfadens widerspricht. B bleibt als Vorrat für Dialogzeilen (etwa Baumscheibenpatin).
Umgesetzt in `plants_de`, `items_de` (Samen, Dartpfeile, Fadfrucht-Sorten) und `actors_de`.


### 3.2 Fallen sind Hundehaufen (2026-09-29)

Jede Falle erscheint als Hundehaufen in der Upstream-Fallenfarbe, das Upstream-Formsymbol
bleibt als kleines Zeichen darauf (Art-Agent). Alle Namen enden auf „Haufen“ (maskulin), damit
Sätze wie „Ein versteckter %s geht los!“ grammatisch passen. Auslöse-Mechanik unverändert.

| Upstream | Farbe/Form | Name |
| --- | --- | --- |
| Alarm | Rot/Punkte | kreischroter Haufen |
| Disarming | Rot/großer Punkt | roter Fundsachen-Haufen |
| Guardian | Rot/Sterne | roter Wachschutz-Haufen |
| Pitfall | Rot/Raute | bodenloser roter Haufen |
| Burning | Orange/Punkte | glimmender Haufen |
| Blazing | Orange/Sterne | lodernder Haufen |
| Explosive | Orange/Raute | knallorangener Haufen |
| Shocking | Gelb/Punkte | knisternder gelber Haufen |
| Storm | Gelb/Sterne | gewittergelber Haufen |
| Toxic | Grün/Gitter | giftgrüner Haufen |
| Ooze | Grün/Punkte | schleimgrüner Haufen |
| Weakening | Grün/Wellen | schlappgrüner Haufen |
| Poison Dart | Grün/Fadenkreuz | grüner Blasrohr-Haufen |
| Confusion | Türkis/Gitter | verwirrend türkiser Haufen |
| Teleportation | Türkis/Punkte | türkiser Sprunghaufen |
| Warping | Türkis/Sterne | türkiser Irrhaufen |
| Gateway | Türkis/Fadenkreuz | türkiser Pendlerhaufen |
| Geyser | Türkis/Raute | sprudelnder türkiser Haufen |
| Summoning | Türkis/Wellen | lockender türkiser Haufen |
| Distortion | Türkis/großer Punkt | verzerrter türkiser Haufen |
| Cursing | Violett/Wellen | verfluchter violetter Haufen |
| Disintegration | Violett/Fadenkreuz | violetter Zerfallshaufen |
| Chilling | Weiß/Punkte | kühler weißer Haufen |
| Frost | Weiß/Sterne | tiefgefrorener Haufen |
| Flock | Weiß/Wellen | wolliger weißer Haufen |
| Corrosion | Grau/Gitter | ätzend grauer Haufen |
| Flashing | Grau/Sterne | grauer Blitzhaufen |
| Grim | Grau/großer Punkt | grabesgrauer Haufen |
| Gripping | Grau/Punkte | klebriger grauer Haufen |
| Rockfall | Grau/Raute | bröckelgrauer Haufen |
| Gnoll Rockfall | wie Rockfall | staubgrauer Bautrupp-Haufen |
| Worn Dart | Grau/Fadenkreuz | verwitterter Blasrohr-Haufen |
| Tengu Dart | wie Poison Dart | (kein eigener Name; Beschreibung: versteckte Scheibenwaschdüse des Kurzparkers) |


### 3.3 Umbenennungen aus Runde 3 (2026-09-29, Texte umgesetzt, nicht spielgetestet)

Entscheidungen des Projektinhabers nach dem ersten Spieltest. Nur Werte bestehender Keys wurden
geändert; Mechanik, Keys und Platzhalter sind unverändert.

| Upstream | Bisher | Neu | Hinweis |
| --- | --- | --- | --- |
| Waterskin | Wasserschlauch | **Sternchen-Pils** | Bierflasche, Parodiemarke; keine echte Marke, kein Rausch- oder Suchtwitz |
| Dewdrop | Tautropfen | **Biertropfen** | Kronkorken-Tropfen, die man in die Flasche sammelt |
| Dewcatcher | Taufänger | Tropfenfänger | Pflanze füllt sich mit Biertropfen |
| Throwing Stone | Pflasterstein → Stadttaube | **Hoftaube** | Wird losgeschickt, pickt, wartet danach am Boden; Alteingesessene füttert sie seit 1978 im Hinterhof. Umbenannt, weil „Stadttaube“ jetzt der Oberbegriff der Runensteine ist (siehe 3.4) |
| Talent Follow-up Strike | Nachsetzen | **Erst Zettel, dann Klingeln** | Zettel im Treppenhaus (Fernkampf), dann Gespräch an der Tür (Nahkampf) |
| Trinket Catalyst | magischer Katalysator | **WG-Umzugskarton** | Niemand weiß, was drin ist |
| Scroll of Remove Curse | Widerspruchsformular | **Entfluchungsantrag** | „der einzige Antrag der Stadt, der ohne Termin bearbeitet wird“ |
| Food Ration | Späti-Proviant | **Schachtel Baklava** | Vom Konditor an der Sonnenallee; Späti-Snack (Small Ration) sind Salzstangen |
| Tengu | Schalterspringer | **Kurzparker** | SUV, Tempelhofer Feld; Maske → Duftbäumchen des Kurzparkers |
| Blacksmith | Alter Polier | **Netztechniker** | Dunkelgold-Erz → Glasfaserstück; Mine → Kabelschacht; Schmiede → Technikerwerkstatt |
| Chasm | Abgrund | **A100-Baulücke** | Nie fertig gebaute Teilabschnitte der A100, regionale Feelings r1–r5 |
| Gas Alchemist | Herr Fuß mit Apparat | **Herr Fuß mit Mief** | Käsefüße und Latschen statt Gasapparat |

Sonnenallee-Kiezgefühl (respektvoll, Läden als lebendiger Teil des Kiezes): Barbershop,
Shisha-Bar und Konditorei in `levels.level$feeling.grass_desc_r1`, `large_desc_r1` und
`secrets_desc_r1`; Baklava als Standardessen. Keine Figuren, keine Herkunfts- oder
Religionswitze.

### 3.4 Runensteine werden Stadttauben (2026-09-29, Texte umgesetzt, nicht spielgetestet)

Entscheidung des Projektinhabers. Jede Runenstein-Sorte ist eine eigene Stadttaube: Sie wird
losgeschickt, landet, löst ihre Wirkung aus und fliegt davon (verbraucht). Keine Tierquälerei,
nichts zerschellt. Mechanik, Zahlen, Keys und Platzhalter unverändert; Icons (Art-Agent)
und Java sind in dieser Runde nicht angepasst. Oberbegriff „Stadttaube“/„Stadttauben“ (Katalog, Alchemie-Guide
„Stadttauben anlocken“, Samentasche, Recycling, Alchemisieren, Versteinerter Samen, Runen-Echo
des Klerikers). Die Wurfwaffe der Alteingesessenen heißt deshalb **Hoftaube**.

| Upstream | Bisher | Neu | Wirkung (unverändert) |
| --- | --- | --- | --- |
| Runestone (Oberbegriff) | Runenstein | **Stadttaube** | – |
| Stone of Aggression | Stänker-Stein | **Stänker-Taube** | Feinde greifen das markierte Ziel an |
| Stone of Augmentation | Tuning-Stein | **Tuning-Taube** | Waffe/Rüstung umbauen |
| Stone of Blast | Böller-Stein | **Böllertaube** | Explosion wie Lachgasflasche; Taube ist vorher weg |
| Stone of Blink | Blinzelstein | **Blinzeltaube** | Teleport zum Landepunkt |
| Stone of Clairvoyance | Hellseh-Stein | **Hellseh-Taube** | Großer Bereich aufgedeckt |
| Stone of Deep Sleep | Mittagsschlaf-Stein | **Mittagsschlaf-Taube** | Magischer Tiefschlaf |
| Stone of Detect Magic | Gutachter-Stein | **Gutachter-Taube** | Fluch/Magie erkennen |
| Stone of Disarming | Entschärfungs-Stein | **Entschärfungs-Taube** | Bis zu 9 Haufen (Fallen) entschärfen |
| Stone of Enchantment | Verzauberungs-Stein | **Verzauberungs-Taube** | Verzauberung/Glyphe |
| Stone of Fear | Schreck-Stein | **Schreck-Taube** | Ziel flieht |
| Stone of Flock | Schafherden-Stein | **Schäfertaube** | Ruft magische Schafe; Name nennt Schafe, weil die Mechanik Schafe erzeugt |
| Stone of Intuition | Bauchgefühl-Stein | **Bauchgefühl-Taube** | Typ raten; hilft zweimal, dann fliegt sie davon |
| Stone of Shock | Weidezaun-Stein | **Weidezaun-Taube** | Betäubung, Zauberstab-Ladung |

---

## 4. Recherche-Fundstücke

### Methodik und Einschränkungen (bitte lesen)

- **Reddit war nicht erreichbar.** Die Websuche lehnt `reddit.com` ab, und das
  Netz dieser Umgebung sperrt die Domain (Proxy-Richtlinie). Es gibt deshalb
  **keine einzige Reddit-Quelle** in dieser Liste. Das ist die größte Lücke.
- **Volltexte waren gesperrt.** WebFetch wurde für alle Presse- und Wiki-Domains
  vom Egress-Proxy blockiert. Alle Angaben unten stammen aus
  **Suchergebnis-Auszügen (WebSearch)**, die ich im Recherchelauf tatsächlich
  erhalten habe. Die Artikel selbst wurden nicht vollständig gelesen.
  Vor dem Adaptieren einer konkreten Geschichte: Quelle öffnen und prüfen.
- Kennzeichnung: **[Presse/Amt, Suchauszug]** = veröffentlichte Berichterstattung,
  aber nur als Auszug gesehen. **[Anekdote, unverifiziert]** = Einzelerfahrung
  aus Blog oder Erfahrungsbericht.
- Keine Privatpersonen. Wo Artikel Namen von Privatleuten enthalten, werden sie
  hier weggelassen. Reale Firmen und Politiker erscheinen im Spiel nicht.

### Fundstücke

**F01 – Rixdorf wird Neukölln (1912)** [Presse/Amt, Suchauszug]
URLs: https://www.tagesspiegel.de/berlin/der-ruf-war-ruiniert-3516580.html ·
https://www.neukoellner.net/zeitreisen/wie-aus-rixdorf-neukoelln-wurde/ ·
https://schloss-gutshof-britz.de/museum-neukoelln/geschichtsspeicher/ausstellungsthemen/100-jahre-umbenennung-rixdorfs-zu-neukoelln
Inhalt: Am 27. Januar 1912 wurde Rixdorf wegen seines schlechten Rufs umbenannt;
laut Museum Neukölln war es eine Imagemaßnahme einer kleinen Elite, nicht der
Wille der Mehrheit. Der Gassenhauer „In Rixdorf ist Musike" machte den Ort vorher reichsweit bekannt.
Spielidee: Leitmotiv „Umbenennung": Der Endgegner-Dämon „Die Imagekampagne", alte Rixdorf-Schilder auf Ebene 25.

**F02 – Neukölln, Hauptstadt des illegalen Sperrmülls** [Presse/Amt, Suchauszug]
URLs: https://www.tagesspiegel.de/berlin/bezirke/neukoelln/illegaler-bauschutt-sperrmull-hausabfalle-das-sind-die-mull-hotspots-in-berlin-neukolln-15501800.html ·
https://www.berliner-kurier.de/berlin/muell-meldungen-in-berlin-explodieren-trauriger-neuer-rekord-li.2312430 ·
https://www.euwid-recycling.de/news/politik/berlin-illegaler-muell-besonders-in-friedrichshain-kreuzberg-und-neukoelln/
Inhalt: Laut Suchauszügen führt Neukölln seit Jahren die Berliner Meldestatistik
für illegalen Müll an; für 2024 werden rund 27.000 Meldungen im Bezirk genannt.
Spielidee: Sperrmüll-Deko als häufigste Hof-Kulisse; Zu-verschenken-Truhe (Mimic) versteckt sich darin.

**F03 – Rattenbekämpfung am Reuterplatz sabotiert** [Presse/Amt, Suchauszug]
URLs: https://taz.de/Rattenplage-am-Reuterplatz-in-Neukoelln/!6180527/ ·
https://berlin.t-online.de/region/berlin/id_101223736/berlin-rattenplage-in-neukoelln-tierschuetzer-sabotieren-bekaempfung.html ·
https://www.berlin.de/ba-neukoelln/aktuelles/pressemitteilungen/2026/pressemitteilung.1670152.php
Inhalt: Der Bezirk zäunte wegen massiven Rattenbefalls Teile des Reuterplatzes ab;
laut Bericht wurden Fallen ausgegraben und mit Bauschaum unbrauchbar gemacht.
Spielidee: Pfandratten-Nest hinter Bauzaun; Flavor-Text einer Rattenfalle „mit Bauschaum versiegelt. Von wem, sagt keiner."

**F04 – Feuchttuch-Zöpfe legen Pumpen lahm** [Presse/Amt, Suchauszug]
URL: https://www.berliner-zeitung.de/zukunft-technologie/dickes-problem-feuchttuecher-verstopfen-die-berliner-kanalisation-li.38168
Inhalt: In Pumpen verknoten sich Feuchttücher zu oberschenkeldicken, meterlangen
Zöpfen; die Wasserbetriebe rücken laut Auszug durchschnittlich sechsmal täglich aus.
Spielidee: Gegner Abflussschleim (Slime, Optik Feuchttuchzopf) und Pumpwerk-Raum.

**F05 – Rathaus Neukölln ohne Ratskeller** [Presse/Amt, Suchauszug]
URLs: https://www.berlin.de/ba-neukoelln/ueber-den-bezirk/historisches/artikel.94938.php ·
https://www.neukoellner.net/zeitreisen/leuchtturm-der-urbanitaet/
Inhalt: Das Rathaus (1909-1914, Architekt Reinhold Kiehl) hat einen rund 68 m hohen
Turm mit Fortuna-Figur; seit einem Kriegsschaden fehlt ihm der Ratskeller.
Spielidee: Der Ratskeller existiert im Spiel nur als türloser Raum – bis Ebene 21 enthüllt, was darin ist.

**F06 – Bürgeramt-Termine um 7 Uhr** [Anekdote, unverifiziert]
URLs: https://toppersherwood.substack.com/p/lessons-of-german-bureaucracy ·
https://eightyfour.substack.com/p/brgeramt-saga-12-10-05
Inhalt: Erfahrungsberichte beschreiben das Weckerstellen auf 6:55 Uhr, um um 7 Uhr
freie Tagestermine zu erwischen, und Skripte, die die Seite automatisch abfragen.
Spielidee: Terminal-Rätsel „Terminportal": Tür öffnet nur für einen Zug.
Gegengewicht: https://www.berlin-live.de/berlin/aktuelles/berlin-buergeraemter-termine-wartezeit-id512915.html
meldet laut Auszug eine deutliche Verbesserung 2025 (rund 81 % Termine binnen zwei Wochen). Satire bitte nicht als aktuelle Tatsache verkaufen.

**F07 – Treppe am Hermannplatz seit 2020 gesperrt** [Presse/Amt, Suchauszug]
URLs: https://www.tagesspiegel.de/berlin/seit-sechs-jahren-gesperrt-erneute-verschiebung--zugang-zum-u-bahnhof-hermannplatz-wird-und-wird-nicht-fertig-15690863.html ·
https://www.berliner-zeitung.de/mensch-metropole/berlin-verkehr-neun-jahre-warum-es-bei-der-bvg-so-lange-dauert-bis-ein-aufzug-fertig-ist-li.257851
Inhalt: Ein zentraler Zugang zum U-Bahnhof Hermannplatz ist laut Bericht seit August 2020
gesperrt, Fertigstellung mehrfach verschoben; ein anderer Artikel erklärt, warum ein BVG-Aufzug neun Jahre dauern kann.
Spielidee: Bauzaun-Wand mit Schild „Fertigstellung vsl. Herbst", deren Datum sich bei jedem Besuch ändert.

**F08 – Karl-Marx-Straße: länger gebaut als der BER** [Presse/Amt, Suchauszug]
URLs: https://taz.de/Baustellen-Rekord-in-Neukoelln-/!6097343/ ·
https://www.berlin.de/ba-neukoelln/aktuelles/pressemitteilungen/2025/pressemitteilung.1599737.php
Inhalt: Der Umbau begann 2010 und wurde im Juli 2025 abgeschlossen, auch weil darunter
der U7-Tunnel saniert wurde; die taz titelte, er habe länger gedauert als der BER-Bau.
Spielidee: Deko-Kalender „Baustellenjahr 15"; Bohrlinde (DM-300) erwähnt ihn als Vorbild.

**F09 – Ringbahn-Sperrung für das Stellwerk Neukölln** [Presse/Amt, Suchauszug]
URL: https://www.berliner-kurier.de/berlin/ringbahn-unterbrochen-am-montag-beginnen-die-chaostage-bei-der-s-bahn-li.10027461
(weitere Auszüge ohne Direktlink zu einer Einzelmeldung)
Inhalt: Laut Auszügen wurde die Ringbahn zwischen Treptower Park und Tempelhof für den
Anschluss eines neuen elektronischen Stellwerks Neukölln unterbrochen; die Ringbahn heißt wegen ihrer Form „Hundekopf".
Spielidee: Rundkurs-Raum „Hundekopf", Schriftrolle der Teleportation als „Schienenersatzverkehr".

**F10 – Baustopp am Notausgang Bildhauerweg (U7)** [Presse/Amt, Suchauszug]
URL: https://www.berlin-live.de/berlin/verkehr/bvg-baustelle-u7-neukoelln-id509987.html
Inhalt: Die Sanierung eines Notausgangs verzögerte sich nach einem offenbaren
Baustillstand; genannt werden Umplanungen und statische Neubewertungen.
Spielidee: Sackgassen-Gang mit Schild „Statik wird neu bewertet".

**F11 – Kindl-Sudhaus mit riesigen Kupferkesseln** [Presse/Amt, Suchauszug]
URLs: https://www.kms-sonne.de/projekte/kindl-areal/ ·
https://industriekultur.berlin/ort/kindl-zentrum-fuer-zeitgenoessische-kunst/
Inhalt: Die frühere Kindl-Brauerei (Expressionismus, 1926-30) ist heute Kunstzentrum;
das Sudhaus hat sechs riesige Kupferkessel, einst die größten Braupfannen Europas.
Spielidee: Setpiece-Halle der Baustelle mit Kesseln als Deckung.

**F12 – Die Schmiede am Richardplatz** [Presse/Amt, Suchauszug]
URLs: https://www.berlin.de/tourismus-neukoelln/entdecken/artikel.1152599.php ·
https://www.visitberlin.de/en/richardplatz
Inhalt: Die Schmiede wird 1624 erstmals erwähnt, eine Familie betrieb sie über 150 Jahre;
das Böhmische Dorf wurde 1737 von Glaubensflüchtlingen aus Böhmen gegründet.
Spielidee: Blacksmith-NPC „Alter Polier“ (Werkstatt-Motiv vom Richardplatz); Geschichte würdevoll behandeln.

**F13 – Karstadt am Hermannplatz: Nachbau von 1929** [Presse/Amt, Suchauszug]
URLs: https://www.tip-berlin.de/stadtleben/geschichte/hermannplatz-geschichte/ ·
https://www.neukoellner.net/zeitreisen/neukoellner-zeitreisen/ ·
https://www.bauwelt.de/das-heft/heftarchiv/Aufwertung-oder-Gentrifizierung-Dilemma-Karstadt-Hermannplatz-Berlin-Signa-Uwe-Rada-3582425.html
Inhalt: Das Kaufhaus von 1929 hatte zwei Türme und einen Dachgarten so groß wie ein
Fußballfeld; ein Investor plante später Abriss und Nachbau im Stil der 1920er, gegen Widerstand einer Anwohnerinitiative.
Spielidee: Renditequartier-Palast, der „die gute alte Zeit" als Luxusprodukt nachbaut. Investor im Spiel frei erfunden.

**F14 – Estrel: größtes Hotel Deutschlands, dazu ein 176-m-Turm** [Presse/Amt, Suchauszug]
URLs: https://www.entwicklungsstadt.de/berlins-wachsender-koloss-der-176-meter-estrel-tower-in-neukoelln/ ·
https://www.entwicklungsstadt.de/ausgerechnet-neukoelln-die-ungewoehnliche-erfolgsgeschichte-des-estrel/
Inhalt: Das Estrel an der Sonnenallee gilt mit 1.125 Zimmern als größtes Hotel
Deutschlands; daneben entsteht ein 176 m hoher Turm mit Hotel, Wohnungen und Büros.
Spielidee: Endlos-Hotelflur mit Teleportfalle „Falsches Zimmer".

**F15 – Kulturdachgarten auf dem Parkdeck** [Presse/Amt, Suchauszug]
URLs: https://klunkerkranich.org/locations/ueber-uns/ ·
https://www.neukoellner.net/konsum/klunkerkraniche-ueber-neukoelln/
Inhalt: Seit 2013 gibt es auf dem obersten Parkdeck der Neukölln Arcaden einen
Kulturdachgarten mit Urban Gardening, Bar und Tanzfläche.
Spielidee: Oasen-Raum im Renditequartier; Herkunft der Dachgarten-Bienen.

**F16 – Weserstraße: Barmeile mit steigenden Mieten** [Presse/Amt, Suchauszug]
URLs: https://derinternaut.ch/kreuzkoelln-weserstrasse/ ·
https://www.visitberlin.de/en/going-out-weserstrasse
Inhalt: Die Weserstraße gilt als Barmeile „Kreuzköllns", laut Auszug mit rasch gestiegenen
Mieten, Bäckereien, „Bier-Yoga" und dazwischen letzten alten Kneipen und Elektrobetrieben.
Spielidee: Korridor mit Schild „Beer Yoga – heute ausgebucht".

**F17 – Tempelhofer Feld, Schillerkiez und die Randbebauung** [Presse/Amt, Suchauszug]
URLs: https://www.fluter.de/tempelhofer-feld-gentrifizierung ·
http://www.neukoellner.net/politik/volksentscheid-tempelhofer-feld-ja-nein-scheissegal/ ·
https://thf100.de/Die_geplanten_Baufelder.html
Inhalt: 2014 stimmte eine Mehrheit gegen eine Bebauung; die Randbebauung wird seitdem
immer wieder diskutiert. Der Schillerkiez gilt seit der Feldöffnung als stark unter Aufwertungsdruck.
Spielidee: Baufeld-Markierungen, die sich bei jedem Besuch verschieben.

**F18 – Club an der Sonnenallee muss Bauplänen weichen** [Presse/Amt, Suchauszug]
URLs: https://groove.de/2020/01/15/griessmuehle-die-details-zum-hilferuf-des-berliner-clubs/ ·
https://mitvergnuegen.com/2020/griessmuehle-club-niederschoeneweide/
Inhalt: Ein Techno-Club an der Sonnenallee musste Anfang 2020 schließen, weil der
Eigentümer den Mietvertrag wegen Verkaufs-/Bauinteressen nicht verlängerte; der Club zog nach Niederschöneweide.
Spielidee: Leere Clubhalle als Wiedergänger-Nest; Stroboskop ohne Musik.

**F19 – Möbliert auf Zeit gegen die Mietpreisbremse** [Presse/Amt, Suchauszug]
URLs: https://taz.de/Mobliertes-Wohnen-auf-Zeit/!6125281/ ·
https://www.berliner-zeitung.de/article/wohnen-auf-zeit-in-neukoellner-milieuschutzgebieten-unzulaessig-bezirk-greift-durch-2322757
Inhalt: Laut Auszügen kosten möblierte Wohnungen im Schnitt etwa das Doppelte des
üblichen Quadratmeterpreises; Neukölln hält solche Nutzung in Milieuschutzgebieten für nicht genehmigungsfähig und klagt in Musterverfahren.
Spielidee: Raumtyp „Wohnen auf Zeit" und Gegnertext des Abschreibungshexers.

**F20 – Stadtbad Neukölln als antike Therme** [Presse/Amt, Suchauszug]
URLs: https://industriekultur.berlin/ort/stadtbad-neukoelln/ ·
https://www.neukoellner.net/zeitreisen/100-jahre-schwimmen-und-schwitzen/
Inhalt: 1914 eröffnet, von Reinhold Kiehl nach dem Vorbild antiker Thermen gebaut, mit
7 m hohen Säulen und Mosaiken; bis zu 10.000 Besucher täglich.
Spielidee: Hallen-Setpiece auf Ebene 21-25.

**F21 – Wohnungssuche: „Können Sie mehr zahlen?"** [Anekdote, unverifiziert]
URL: https://www.neukoellner.net/alltag/einmal-hoelle-und-zurueck/
Inhalt: Ein Erfahrungsbericht (2018) schildert Besichtigungen mit vielen Wartenden
und eine Hausverwaltung, die am Telefon fragte, ob man mehr als die ausgeschriebene Miete zahlen könne.
Spielidee: Dialogzeile des Besichtigungswichts; Beschreibung der Hausverwaltung in Lore-Tafeln (fiktiv).

**F22 – Hunderte Menschen bei einer Besichtigung** [Presse/Amt, Suchauszug]
URL: https://politik.watson.de/panorama/deutschland/859912582-berliner-wohnungsbesichtigung-artet-aus-hunderte-menschen-versammelt
Inhalt: Laut Auszug bildete sich bei einer Berliner Besichtigung (Charlottenburg,
nicht Neukölln) eine über 100 m lange Schlange mit über 600 Anfragen in der ersten Stunde.
Spielidee: Besichtigungswichte spawnen als Schlange im Korridor; Kampf-Flavor „Die Mappe fällt runter."

**F23 – Ferienwohnungen trotz Verbot** [Presse/Amt, Suchauszug]
URL: https://www.linksfraktion-neukoelln.de/aktuelles/nachrichten/detail/news/schluss-mit-illegalen-ferienwohnungen/
Inhalt: Eine Fraktion gibt an, dass in Neukölln etwa 1.400 ganze Wohnungen über eine
Plattform vermietet wurden und kein Bußgeld verhängt worden sei. Parteiquelle, nicht neutral.
Spielidee: Kleinanleger-Wiedergänger (Rollkoffer-Optik). Im Spiel keine Plattform und keine Partei nennen.

**F24 – Sanierung als Verdrängung** [Presse/Amt, Suchauszug]
URLs: https://www.kuk-nk.de/2015/03/06/widerstand-gegen-luxussanierung/ ·
https://taz.de/GENTRIFIZIERUNG-IN-NEUKOeLLN/!5124729/
Inhalt: Hausgemeinschaften berichteten von Kauf durch Investoren, geplanter teurer
Modernisierung und Mietsprüngen (in einem Fall von 470 auf 621 Euro), gegen die sie sich organisierten.
Spielidee: Schriftrolle der Verbesserung = „Modernisierungsankündigung", die für den Spieler gut, für NPCs bedrohlich klingt.

**F25 – Heizkosten-Nachzahlung vor Gericht gekippt** [Presse/Amt, Suchauszug]
URLs: https://www.tagesspiegel.de/berlin/formfehler-bei-heizkostenabrechnung-hunderte-berliner-vonovia-mieter-mussen-keine-nachzahlung-leisten-12008321.html ·
https://taz.de/Fragwuerdige-Nebenkostenabrechnungen/!6074831/
Inhalt: Laut Auszug sollten Berliner Mieter teils vierstellige Heizkosten nachzahlen;
wegen Formfehlern mussten Hunderte nicht zahlen. Nicht Neukölln-spezifisch.
Spielidee: Heizkosten-Feuerelementar und Heizkostenfaust; Konzern im Spiel nicht nennen.

**F26 – Englisch am Tresen** [Presse/Amt, Suchauszug]
URLs: https://www.tagesspiegel.de/berlin/debatte-um-englisch-sprechende-kellner-in-berlin-6307924.html ·
https://www.tagesspiegel.de/berlin/berliner-gastronomie-liebe-kellner-euer-englisch-nervt/19440154.html
Inhalt: 2017 löste ein Kommentar über ein Neuköllner Lokal, in dem nur Englisch
gesprochen wurde, eine bundesweite Debatte bis in die Bundespolitik aus.
Spielidee: Expat-Klasse: Zauberformeln auf Englisch, Alteingesessene antworten auf Berlinisch. Beide Seiten bekommen die Pointe.

**F27 – Laptopverbot am Wochenende** [Anekdote, unverifiziert]
URL: https://www.exberliner.com/berlin/laptop-friendly-cafes-work-wi-fi-coffee/
Inhalt: Café-Guides erwähnen, dass viele Neuköllner Cafés Laptops am Wochenende
oder zur Mittagszeit nicht wollen.
Spielidee: Expat-Flavor; Concierge-Mönch-Zeile „Bitte klappen Sie Ihr Leben zu."

**F28 – Der Späti als Therapiepraxis** [Anekdote, unverifiziert]
URL: https://spaetistories.substack.com/p/spati-stories-8-meet-mustafa-and
Inhalt: Ein Späti-Betreiber aus Kreuzkölln erzählt, man sei Hausmeister, Handwerker
und Psychologe zugleich; viele allein Zugezogene würden sich am Tresen öffnen.
Spielidee: Spätimann-Charakter: hört zu, repariert, verkauft, bleibt ungerührt. Keine reale Person nachbilden.

**F29 – Späti am Sonntag** [Presse/Amt, Suchauszug]
URLs: https://taz.de/Urteil-zur-Sonntagsoeffnung-in-Berlin/!5605298/ ·
https://www.berliner-zeitung.de/news/berlin-spaeti-oeffnungszeiten-am-sonntag-in-diesen-bezirken-gab-es-2023-am-meisten-bussgelder-li.2166456
Inhalt: Spätis dürfen nach Berliner Ladenöffnungsrecht sonntags grundsätzlich nicht öffnen;
Bezirke verhängen Bußgelder, Betreiber fordern Tankstellen-Rechte.
Spielidee: Spätimann-Dialog über „Ordnungsamt-Geister", die ihn im Untergrund in Ruhe lassen.

**F30 – BVG-Selbstironie** [Presse/Amt, Suchauszug]
URL: https://content-marketing.com/wie-die-bvg-aus-einem-missverstaendnis-ein-content-marketing-wunder-schaffte/
Inhalt: Die BVG-Kampagne „Weil wir dich lieben" startete als misslungener Aufruf und
wurde durch selbstironischen Humor erfolgreich.
Spielidee: Ton-Referenz für Baustellen-Schilder: selbstironisch, nie mit echtem Logo oder Slogan.

### Bewusst nicht verwendet

- Hasenheide als Drogenumschlagplatz: trifft Menschen in Notlagen und Herkunftsgruppen, kein Spielspaß.
- Geschichte des Flughafens Tempelhof und der Zerstörung von Karstadt 1945: NS-Kontext, nicht für Gags.
- Pfandsammler als Gegner: Armut ist keine Pointe. Die Pfandratte ist ein Tier, der Pfandgolem ein Flaschenberg.
- Tödliche E-Scooter-Unfälle aus der Presse: der Leihscooter bleibt slapstickhaft, ohne reale Unfälle zu zitieren.

---

## 5. Stil-Leitfaden für Texter

### 10 Regeln

1. **Mechanik zuerst, Witz danach.** Jede Beschreibung nennt Schaden, Reichweite,
   Dauer, Ladungen und Nebenwirkungen vollständig. Der Witz steht davor oder
   dahinter, nie an ihrer Stelle.
2. **Berliner Schnauze nur in Dialogen und Flavor.** Menüs, Tooltips,
   Statuswerte und Tutorial sind Standarddeutsch, klar und kurz.
3. **Nach oben treten.** Vermieter, Investoren, Hausverwaltungen und das Amt
   sind Ziele. Arme, Kranke und Menschen mit Behinderung sind es nie.
4. **Alle vier Gruppen kriegen ihr Fett weg, jede hat Würde.** Expat, Alteingesessene,
   Zugezogene und Tourist haben je eine Stärke und einen blinden Fleck.
5. **Herkunft, Hautfarbe, Religion, Behinderung sind nie die Pointe.**
   Der Spätimann ist witzig durch Trockenheit, Sortiment und Erfahrung.
6. **Keine realen Firmen, Parteien oder Privatleute.** Orte ja, Namen erfinden
   (Rendita GmbH, Ewiger Antragsteller). Keine echten Logos oder Slogans.
7. **Platzhalter und Formatierung heilig halten.** `%s`, `%d`, `_Hervorhebung_`,
   `\n` und Zeilenlänge der Upstream-Datei beibehalten.
8. **Monkey-Island-Prinzip:** Figuren antworten trocken und ernsthaft auf
   Absurdes. Running Gags (Wartenummer, „vsl. Herbst") kehren belohnend wieder.
9. **Goat-Simulator-Prinzip:** Absurde Folgen sind sichtbar und vorhersehbar.
   Wenn etwas explodiert, hat der Text es vorher angekündigt.
10. **Kurz.** Gegnerbeschreibung höchstens drei Sätze Flavor. Dialogzeilen passen
    in eine Sprechblase. Lieber ein guter Witz als drei mittlere.

### 10 Beispielzeilen

1. *Spätimann, Begrüßung:* „Mach die Tür zu, sonst kommt der Schimmel rein. Ach nee, der ist ja unten."
2. *Spätimann, Ankauf:* „Das kauf ick. Frag nicht, wat ick damit mach."
3. *Pfandratte, Beschreibung:* „Eine Ratte, die jeden Kronkorken im Hof für ihr Eigentum hält. Schwach, aber zahlreich."
4. *Leihscooter, Warnung (Mechanik):* „Der Leihscooter klingelt. Nächste Runde fährt er in gerader Linie auf dich zu."
5. *Mietschimmel, Bossruf:* „ICH BIN KEIN MANGEL. ICH BIN EIN MERKMAL DER WOHNUNG."
6. *Amtssecurity, beim Kettenzug:* „Nummer 347! Schalter 12! Sie sind dran, ob Sie wollen oder nicht."
7. *Schriftrolle der Verbesserung (Mechanik + Flavor):* „Verbessert einen Gegenstand um eine Stufe. Der Gegenstand wird dadurch nicht billiger."
8. *Alteingesessene, Kampfbeginn:* „Ick wohn hier seit '78. Du bist hier nur zu Besuch."
9. *Expat, Zauber:* „Let's circle back!" – *Effekt:* „Das magische Geschoss trifft das Ziel für 2-8 Schaden."
10. *Bohrlinde (DM-300), Phase 2:* „Neuer Fertigstellungstermin wird rechtzeitig bekannt gegeben."

---

## 6. Lücken und nächste Schritte

- **Keine Reddit-Quellen.** Reddit war aus dieser Umgebung gesperrt. Wer Reddit-
  Geschichten will, muss sie manuell mit Link und Datum nachtragen und als
  „Anekdote, unverifiziert" kennzeichnen.
- **Nur Suchauszüge.** Vor jeder Übernahme einer konkreten Geschichte den Artikel
  öffnen und die Zahlen prüfen, besonders F02, F09, F19 und F23.
- **Widerspruch zur Gebietstabelle** in `NEUKOELLN-DESIGN.md` (siehe oben) klären.
- **Vault-Gegner:** klären, ob die Upstream-Vault-Inhalte im Fork aktiv sind.
- **Unbekannt-Namen** (Trankfarben, Schriftrollen-Runen, Ring-Edelsteine) brauchen
  eine eigene vollständige Liste, abgestimmt mit dem Art-Agenten für Icons.
- Namen in dieser Datei sind Vorschläge; Gameplay-Agent und Lore-Agent stimmen sie
  vor dem Einbau in `actors.properties`/`items.properties` ab.
