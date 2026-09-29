# Neukölln Pixel Dungeon – Writers' Room

Stand: 2026-09-29. Leitfaden des Head Writers für die Text-Überarbeitung („Punch-up“).
Dieses Dokument ist eine **Arbeitsgrundlage, keine Implementierung**. Es ändert keinen
Spieltext. Alles, was neue Keys, neue Gegner, neue Deko oder klassenabhängige Siegtexte
braucht, ist erst verfügbar, wenn der Gameplay-Agent es in Java eingebaut und getestet hat.

Gelesen wurden: `AGENTS.md`, `docs/NEUKOELLN-WELT.md`, `docs/NEUKOELLN-DESIGN.md`,
`docs/NEUKOELLN-REFERENZ.md`, `docs/NEUKOELLN-AUDIT.md` und alle
`core/src/main/assets/messages/*/*_de.properties` im Stand der Arbeitskopie vom
2026-09-29. `actors_de`, `items_de` und `plants_de` hatten dabei ungesicherte Änderungen
anderer Agents (Beispiel: `plants.sorrowmoss.name` ist jetzt „Neidmoos“, die Weltbibel sagt
noch „Hundewiesenmoos“). **Jede Autorin liest vor dem Umschreiben den aktuellen Text des
Keys neu.** Die Zitate in Abschnitt 5 können schon veraltet sein.

Verbindlich bleiben `AGENTS.md` und der Stil-Leitfaden in `NEUKOELLN-WELT.md` §5. Dieses
Dokument schärft sie und ersetzt sie nicht.

Tonreferenzen: **South Park** (Satire, Eskalationslogik, alle kriegen ihr Fett weg, moralischer
Kern hinter dem Chaos), **Monkey Island** (trockene Dialogpointen, Beleidigungsfechten,
wiederkehrende Figuren, Running Gags), **Goat Simulator** (absurde, sichtbare physikalische
Folgen). Das sind Referenzen für Haltung und Handwerk. Figuren, Zitate, Namen und
Formate daraus werden nicht übernommen.

Auftrag des Projektinhabers: „Neukölln ist schmutzig, shady, viel Gentrifizierung, laut,
multikulti, Döner, Hundescheiße.“ Dazu zwei Zusätze vom 2026-09-29: eine Politiker-Parodie
(fiktiver Kanzler „März“) und Berliner Techno- und Clubkultur (Türsteher, Gästeliste,
Stempel, Afterhour, Parodie-Clubs).

---

## 0. Logline

> Du wolltest nur dein Fahrrad aus dem Keller holen. Jetzt steigst du durch Hinterhof,
> Amt, Baustelle und Luxusquartier hinab zum letzten unbefristeten Mietvertrag Berlins,
> und ganz unten wartet kein Vermieter, sondern eine Tabelle, die alle zwei Jahre wächst.

---

## 1. Ton-Bibel

### 1.1 Die zwölf Regeln

1. **Kurz.** Flavor in Beschreibungen: höchstens zwei Sätze vor dem Mechanikteil. Eine
   Sprechblase: höchstens 25 Wörter. Wer die Pointe erklärt, streicht sie.
   *Falsch:* „…und das ist ja genau wie bei der Hausverwaltung, die auch nie erreichbar ist.“
   *Richtig:* „Die Hausverwaltung nennt sie standorttypische Fauna.“

2. **Die Pointe steht am Satzende.** Das Wort, über das man lacht, kommt zuletzt. Keine
   Nachsätze, kein „oder so“, kein Smiley danach.
   *Falsch:* „Kein Parkplatz, den hat er nie gefunden, der Scooter.“
   *Richtig:* „Einen Parkplatz hat er noch nie gefunden. Gesucht hat er auch nicht.“

3. **Konkret schlägt allgemein.** Jahreszahl, Uhrzeit, Preis, Stockwerk, Wartenummer statt
   „Bürokratie“, „Gentrifizierung“, „Behörde“. Das Wort „Gentrifizierung“ kommt im Spieltext
   höchstens einmal pro Region vor; zeigen, nicht benennen.
   *Falsch:* „Die Bürokratie ist hier sehr langsam.“
   *Richtig:* „Wasserschaden, dritter Stock, gemeldet 2009.“

4. **Ein Witz pro Text.** Drei mittlere Gags pro Sprechblase töten einander. Den stärksten
   behalten, die anderen in die Gag-Bank (Abschnitt 4) oder in einen anderen Key.

5. **Eskalation mit Logik (South Park).** Eine Prämisse wird ernst genommen und Schritt für
   Schritt weitergedacht, bis sie absurd ist. Jede Stufe folgt aus der vorigen. Dreierregel:
   normal, schräg, absurd.
   *Beispiel:* Der Keller ist feucht. Die Hausverwaltung sagt „falsch gelüftet“. Der Schimmel
   sagt es inzwischen selbst.

6. **Trockener Konter (Monkey Island).** Figuren nehmen das Absurde ernst und antworten
   kürzer, als gefragt wurde. Understatement statt Ausrufezeichen. Die beste Antwort auf
   Weltuntergang ist ein Satz über Öffnungszeiten.
   *Beispiel:* „Unten droht die Apokalypse, oben steigt die Gewerbemiete. Irgendwo musste ick ja hin.“

7. **Sichtbare Folgen (Goat Simulator).** Absurde Dinge hinterlassen Spuren: Scherben,
   ein quer liegender Leihscooter, Bauzäune. Text beschreibt nur Folgen, die die Mechanik
   wirklich erzeugt, und kündigt sie vorher an.

8. **Mechaniksätze sind glasklar und getrennt.** Zahlen, Reichweite, Dauer, Ladungen und
   Gegenmittel stehen in eigenen Sätzen, in Standarddeutsch, mit der Upstream-Markierung
   `_…_`. Im Mechaniksatz steht kein Witz, im Witzsatz keine Zahl, die man zum Spielen
   braucht. Reihenfolge: Flavor, Leerzeile, Mechanik (Vorbild: `actors.mobs.escooter.desc`).

9. **Berliner Schnauze nur in Dialogen.** Erzähler, Tooltips, Menüs, Status und Tutorial sind
   Hochdeutsch. Wer berlinert, berlinert immer, nicht mal „ich“ und mal „ick“ in derselben
   Sprechblase. Es gibt nur Berlinisch als Mundart (einzige, vom Projektinhaber gewollte
   Ausnahme: das leichte Schwäbisch des Dagebliebenen Schwaben, §3). Keine anderen Dialekte, **keine
   Ethnolekte, kein nachgemachter Akzent**, kein „Kiezdeutsch“ als Pointe.

10. **Vergleichs-Diät.** „Wie eine Nebenkostenabrechnung“ ist kein Witz, sondern eine
    Ausrede für einen. Jeder Standardvergleich (Nebenkosten, Staffelmiete, Bürgeramt,
    Hausverwaltung) darf pro Region höchstens einmal vorkommen. Besser: das Ding selbst
    auftreten lassen (Abschnitt 4, Gag 10).

11. **Running Gags folgen der Callback-Regel.** Einführen, variieren, auszahlen. Früh
    pflanzen (Ebene 1–5), in jeder Region einmal abwandeln, spät belohnen (Boss, Siegszene,
    Badge). Nie zweimal wörtlich gleich. Neue Gags zuerst in Abschnitt 4 eintragen.

12. **Alle kriegen ihr Fett weg, und die Geschichte hat ein Herz.** Jede Kiezgruppe hat eine
    Stärke und einen blinden Fleck. Gebissen wird am **Verhalten**, nie an der Herkunft. Die
    Satire zielt nach oben und endet menschlich: Der Kiez hilft sich, und der Späti hat offen.

### 1.2 Leitplanke (verbindlich, geht jeder Pointe vor)

- **Liebevolle Kulisse:** Multikulti, Döner, Imbiss, Späti, Kneipe, Wochenmarkt sind das
  Zuhause der Geschichte. Sie werden nie zum Ziel. Beim Döner geht es um Hunger, Soße und
  Preis, nie um die Menschen hinter dem Tresen.
- **Nie die Pointe:** Herkunft, Religion, Hautfarbe, Sprache oder Akzent als Merkmal einer
  Gruppe, Behinderung, Krankheit, **Sucht**, Armut. Keine Pfandsammler-, Obdachlosen-,
  Drogen- oder Trinker-Witze. Die Pfandratte ist ein Tier, der Pfandgolem ein Flaschenberg.
  Alkohol darf Kulisse sein (Wegbier, Kneipe), aber Rausch, Absturz und Abhängigkeit sind
  nie die Pointe. Clubkultur ohne Drogen-Gags.
- **Nach oben beißen:** Vermieter, Hausverwaltungen, Investoren, Immobilienmakler, das Amt
  als Apparat, Politik als Stil (Sonntagsrede, Wahlplakat, Law-and-Order-Rhetorik),
  Plattformen (Lieferdienst-Apps, Ferienwohnungsportale, Bewertungsportale), Stadtmarketing.
- **Quer beißen, gleichmäßig, am Verhalten:** Hipster, Expats, Alteingesessene,
  Zugezogene, Touristen, Hundebesitzer, WG-Caster, Club-Türsteher, Technojünger,
  Wutbürger. Jede Gruppe bekommt ungefähr gleich viele Treffer, und keine ist der
  Standard-Bösewicht.
- **Keine realen Namen:** keine realen Privatpersonen, keine echten Firmennamen, Marken,
  Plattformen, Parteien, Initiativen, Slogans oder Clubs. Reale Orte und Straßen dürfen
  Kulisse sein. Erfundene Stellvertreter: „Rendita GmbH“, „die App“, „das Portal“,
  „Bärghain“, „Tresen“. Offene Verstöße stehen in Abschnitt 5 (Google, Berghain,
  „Be Berlin“).
- **Kanzler „März“:** frei erfundene Parodiefigur. Satire über Politikstil, nicht über
  Aussehen, Alter, Familie oder Privatleben. Keine echten Zitate, auch nicht leicht
  abgewandelt, keine Parteinamen, keine realen Personen namentlich. Die Pointe trifft immer
  die Rhetorik, nie die Menschen, über die sie redet. Wenn „Stadtbild“ vorkommt, zeigt der
  Witz, wer das Stadtbild wirklich verändert: Mieten, Glasfassaden, seine eigenen Plakate.
- **Herr Fuß:** Seine Gefahr kommt nur von der undichten Apparatur. Der Rollstuhl wird im Text
  nie erwähnt und ist nie Teil einer Pointe. Keine identifizierenden Merkmale einer realen
  Person (`NEUKOELLN-DESIGN.md`).
- **Reddit und Presse** sind Anregung, keine Tatsachenbehauptung über reale Menschen.

### 1.3 Register (wer wie spricht)

| Register | Wer | Kennzeichen | Nie |
| --- | --- | --- | --- |
| Erzähler | Beschreibungen, Journal-Rahmen, Tutorial | Hochdeutsch, trocken, Präsens, Pointe am Ende | Berlinisch, Ausrufezeichen-Ketten |
| Berlinisch | Spätimann, Alter Polier, Alteingesessene | „ick, dit, wat, nich, jut, keen“, kurze Sätze | Mischformen in einer Sprechblase |
| Amtsdeutsch | Schalterspringer, Amtssecurity, Wiedervorlagebeamte | Passiv, Substantivketten, „zuständig“, „Vorgang“ | echte Paragraphen |
| Maklerlyrik | Luxussanierer, Exposé-Zitate, Feelings | „großzügiger Schnitt“, „Souterrain mit Galerie“ | reale Portale |
| Leichtes Schwäbisch (einzige Ausnahme von Regel 9, Auftrag des Projektinhabers) | Dagebliebener Schwabe | feste Marker „i, net, isch, des, scho, no, au, gell, a bissle, nix, Grüß Gott, ade“, -le-Endungen; Mechanik-Hinweise in `_…_` bleiben Hochdeutsch | Herkunft als Pointe, schwer lesbare Lautschrift, Mischung mit Berlinisch |
| Startup-Sprech | Expat, Ehrgeiziger Filialist | Englische Buzzwords, danach deutsche Effektzeile | Akzent, Grammatikfehler als Gag |
| Investorensprech | König der Eigentumswohnungen, Abschreibungshexer | „Potenzial“, „Rendite“, „systemrelevant“ | echte Firmen |
| Tabellenstimme | Ewiger Mietspiegel | GROSS. PUNKT. ZWISCHEN. JEDEM. WORT. | Emotion |
| Sonntagsrede | Kanzler März (nur Plakat, Graffiti, Tonband, Journal) | Leistungsparolen, „Ordnung“, Versprechen im Futur | echte Zitate, Parteien |
| Türsteher | Türsteher, Concierge-Mönch, Amtssecurity in Varianten | „Heute nicht.“ Zwei Wörter, kein Grund | Beleidigung nach Aussehen oder Herkunft |

---

## 2. Story-Bogen in fünf Akten

Die Geschichte ist eine South-Park-Kette: Jede Lösung erzeugt das nächste, größere Problem,
und jeder Akt entlarvt, dass der vorige Gegner nur ein Symptom war. Leitmotiv aus der
Weltbibel: Jede Ebene tiefer ist eine weitere „Umbenennung“, bis ganz unten das alte
Rixdorf durchschimmert.

### Akt 1 – Neuköllner Hinterhöfe (Ebene 1–5): „Falsch gelüftet“

- **Ausgangslage:** Du willst nur dein Fahrrad aus dem Keller holen. Die Brandschutztür fällt
  hinter dir zu, der Schlüssel liegt drinnen. Hundehaufen auf der ersten Stufe (Gag 1).
- **Kern-Satire:** Mängel, die niemand behebt, und eine Verwaltung, die dem Mieter die Schuld
  gibt. Der Wasserschaden von 2009 tropft (Gag 4), die Kaution ist weg (Gag 9).
- **Eskalation:** Die Pfandratten haben die Hausverwaltung übernommen, und niemand merkt einen
  Unterschied. Im Keller steht der Dagebliebene Schwabe, über Weihnachten so allein, dass man
  durch ihn durchsieht (bis 2026-09-29: Trauriger Altmieter, ersetzt).
- **Boss:** Mietschimmel. Er wirft dir vor, du hättest falsch gelüftet. Wenn er fällt,
  schickt die Hausverwaltung (Flavor) ein Schreiben: „Mangel durch Mieter behoben. Kosten
  werden umgelegt.“
- **Übergangspointe:** Beschweren kann man sich nur beim Amt. Das Amt liegt eine Etage tiefer.

### Akt 2 – Das Amt ohne Termin (Ebene 6–10): „Nicht zuständig“

- **Ausgangslage:** Eine Bürgeramt-Außenstelle in einem alten Gefängnis. Die Anzeige zeigt seit
  Jahren „0815“ (Gag 5). Der Spätimann hat in der ehemaligen Kantine eröffnet und ist der
  Einzige hier, der zuständig ist.
- **Kern-Satire:** Warten als Lebensform, ein Apparat, der sich selbst verwaltet, und
  Terminhändler, die Termine per Skript horten. Die Wahlplakate von Kanzler März versprechen
  „Termine für alle, ab der nächsten Legislatur“ (Gag 13).
- **Eskalation:** Wer lange genug wartet, wird zum ewig Wartenden, und die
  Wiedervorlagebeamten legen ihn wieder vor. Der Ewige Antragsteller hält Nummer 0816 und ist
  „als Nächstes dran“.
- **Boss:** Schalterspringer. Er ist an keinem Schalter zuständig und leitet dich an sich selbst
  weiter. Besiegt, bekommst du endlich einen Bescheid: „Ihr Anliegen wurde nach unten
  weitergeleitet.“
- **Übergangspointe:** Nach unten heißt: in den U-Bahn-Schacht. „Gute Anbindung“ kommt bald.

### Akt 3 – Die ewige Baustelle (Ebene 11–15): „Fertigstellung vsl. Herbst“

- **Ausgangslage:** Die U7/U8-Verlängerung, wegen der alle hergezogen sind. Seit 1998
  Frühstückspause beim Alten Polier. Auf jeder Wand ein Bauschild mit neuem Datum (Gag 12).
- **Kern-Satire:** Infrastruktur als Versprechen, das Mieten hebt, bevor es fertig ist. Im
  Tunnel läuft seit Freitag die Afterhour (Gag 14), weil das der einzige Ort ist, den noch
  kein Investor gekauft hat.
- **Eskalation:** Die Baustelle baut nicht die U-Bahn. Sie baut die Zufahrt zum
  Renditequartier. Die Technojünger tanzen auf dem Gleis, das nie befahren wird.
- **Boss:** DM-300 Bohrlinde, die Tunnelbohrmaschine mit Sekt-Taufe. Sterbend verkündet sie
  einen neuen Eröffnungstermin und schafft ihn nicht ganz.
- **Übergangspointe:** Hinter dem letzten Bauzaun glänzt Glas. Die U-Bahn fährt noch nicht.
  Die Mieten sind schon da.

### Akt 4 – Das Renditequartier (Ebene 16–20): „Systemrelevant“

- **Ausgangslage:** Die Zwergenstadt wurde zum Anlageobjekt der Eigentümerzwerge. Kneipen
  sind Showrooms, der Club ist ein Bioladen (`items.wands.wandofprismaticlight.desc`),
  Concierge-Mönche stehen als Türsteher vor der Lobby: „Heute nicht.“ Der letzte Späti klemmt
  zwischen Concept Store und Musterwohnung.
- **Kern-Satire:** Wohnen als Anlageklasse, Clubsterben, Stadtmarketing. Kanzler März lässt sich
  vor der Glasfassade fotografieren, das Plakat verspricht ein aufgeräumtes Stadtbild. Die
  Bewohner sind aufgeräumt worden.
- **Eskalation:** Der König der Eigentumswohnungen hortet den unbefristeten Mietvertrag, nicht
  um darin zu wohnen, sondern um ihn zu **besitzen**. Er ist „systemrelevant“ und hat Angst
  vor etwas, das noch tiefer liegt.
- **Boss:** König der Eigentumswohnungen. Sein wahrer Name ist Rodney, ein kleiner
  Hausverwalter, der zu groß geworden ist (Badge „Nicht mehr so bedrohlich“). Sterbend
  warnt er: „Der Markt wird sich rächen.“
- **Übergangspointe:** Der König war auch nur Mieter. Sein Vermieter wohnt unter dem Rathaus.

### Akt 5 – Unter dem Rathaus (Ebene 21–25): „Ortsüblich“

- **Ausgangslage:** Das Fundament unter dem Rathaus, der Ratskeller ohne Tür, Paternoster
  ohne Ankunft, Akten, die zu Fels werden, ganz unten alte Ortsschilder „Rixdorf“.
- **Kern-Satire:** Das System selbst. Der Ewige Mietspiegel ist kein Mensch, sondern eine
  Tabelle, die aus jedem neuen, höheren Vertrag wächst und alle zwei Jahre neu erhoben wird.
- **Eskalation:** Du erkennst, wer ihn gefüttert hat: der Investor mit der Möblierungspauschale,
  die Zugezogene mit „ich zahl einfach mehr“, der Expat mit Firmenzuschuss, der Tourist mit
  der Ferienwohnung, die Alteingesessene mit dem untervermieteten Zimmer für 900 Euro. Die
  Mieterhöhungslarven sind 15-Prozent-Schritte. Das Stadtmarketing flüstert Märzens Parolen.
  Alle waren beteiligt, und am meisten hat verdient, wer ganz oben kassiert hat.
- **Boss:** Ewiger Mietspiegel. Er lässt sich nicht verletzen, solange seine Fäuste leben
  (Heizkosten, Nebenkosten, Instandhaltungsstau, Ratenzahlung, Hochglanzprospekt,
  Fassadenbegrünung). Besiegt, sagt er nur: „ICH. WERDE. IN. ZWEI. JAHREN. NEU. ERHOBEN.“
  Man kann ein System nicht erschlagen. Man kann aufhören, es zu füttern.
- **Übergangspointe:** Früher war hier alles Rixdorf. Und da wollte auch keiner wohnen.

### Finale und Siegszene (Ziel für `scenes.amuletscene.text`, `badges`, `wndvictorycongrats`)

Du hältst den Mietvertrag: Altbau, Kaltmiete von 1987, keine Staffel, kein Index, kein
Eigenbedarf. Im Feld „Mieter“ steht nichts. Darunter, klein gedruckt: **„Übertragbar nur an die
Hausgemeinschaft.“** Er gehört nicht dir. Er gehört allen, die im Haus wohnen, und gilt erst,
wenn alle unterschreiben: die Alteingesessene, die Zugezogene, der Expat und der Tourist, der
„nur übers Wochenende“ da ist, seit 2014.

**Die Pointe:** Oben im Hausflur, neben dem Zettel „Wem gehört der Hund?“, hängt jetzt der
unbefristete Mietvertrag am Schwarzen Brett. Der Spätimann hält dir einen Kuli hin: „Macht
fuffzig Cent. Karte erst ab zehn.“ Auf dem Weg nach draußen trittst du in einen Hundehaufen.
Manche Dinge ändern sich nie. Gut so.

**Moralischer Kern („Weißte, ick hab heute wat jelernt“):** Der Kiez gehört keinem, deshalb
muss man ihn teilen. Wer nur für sich allein einen unbefristeten Vertrag will, füttert den
Mietspiegel mit. Diese Rede hält der Held nicht zu Ende. South-Park-Regel: Der moralische Satz
kommt ehrlich, kurz, und wird trocken unterbrochen, hier vom Spätimann mit dem Preis für den Kuli.

Umsetzungshinweise:
- `scenes.amuletscene.text` muss die Wahl zwischen `exit` und `stay` weiterhin klar erklären
  („Spiel beenden“ oder „mit dem Mietvertrag den Weg nach oben antreten“). Die Pointe steht vor
  dieser Erklärung oder als letzter Satz, nicht an ihrer Stelle.
- Klassenabhängige Varianten der Siegszene (jede Klasse lernt „wat anderes“) brauchen neue Keys
  und Java. Vorschlag an den Gameplay-Agenten, bis dahin nicht als vorhanden behandeln.
- Kanonisches Zitat für alle Stellen, die den Vertrag beschreiben: „Altbau, Kaltmiete von 1987,
  keine Staffel, kein Index, kein Eigenbedarf.“ Nicht variieren, es ist die Formel des Spiels.

---

## 3. Figurenstimmen

Beispielzeilen sind Stilproben. Ob sie in bestehende Keys passen, prüft das zuständige Paket
(Abschnitt 6). Zeilen für Figuren ohne Dialog-Keys (Herr Fuß, Technojünger, Türsteher,
Kanzler März) brauchen neue Keys und Java.

### Spätimann (Händler, Ebene 6, 11, 16)
Er ist die letzte funktionierende Infrastruktur unter Neukölln und der Einzige, der zuständig
ist. Er spricht leichtes, konsequentes Berlinisch, in kurzen Sätzen, ohne Ausrufezeichen und
ohne Smileys. Die Apokalypse ist für ihn ein Lieferengpass, und er kommentiert sie über Preise,
Pfand, Öffnungszeiten und Kartenzahlung. Er sieht alles, sagt wenig und erklärt nie, warum er
hier unten ist. Sein Humor kommt aus Trockenheit, Sortiment und Erfahrung, nie aus Herkunft,
Akzent oder Sprache.
- „Karte erst ab zehn Euro. Du hast neun fuffzig. Ick seh dit von hier.“
- „Der März war hier. Hat vorm Laden 'n Foto gemacht, Stadtbild und so. Gekauft hat er nix.“
- „Dämonen zahlen wenigstens bar. Und sie wollen keene Quittung.“

### Die vier Klassen (wie andere sie ansprechen)

**Expat (Magier)**
Der Expat zaubert mit Startup-Englisch, und die deutsche Effektzeile darunter sagt ehrlich,
was passiert. Die Welt reagiert auf sein Verhalten: Pitch statt Gruß, Firmenzuschuss statt
Kaution, „ich lerne Deutsch, nächstes Quartal“. Gespottet wird über den Jargon und die
möblierte Wohnung auf Firmenkosten, nie über Akzent, Herkunft oder Aufenthaltsstatus. Das Amt
ist sein Endgegner so wie für alle anderen, nur mit mehr Formularen. Stärke: Er probiert Dinge,
die sonst niemand wagt. Blinder Fleck: Er hält „disruptiv“ für ein Kompliment.
- Alter Polier: „Du hast ‚Let's align‘ jesagt. Ick hab ‚Nee‘ jesagt. Jetzt sind wa aligned.“
- Ewiger Antragsteller: „Sie warten auch auf die Ausländerbehörde? Dann sind Sie jetzt wirklich integriert.“
- Spätimann: „Firmenkreditkarte? Nee, Kollege. Pitch ooch nich. Münzen.“

**Alteingesessene (Kriegerin/Tank)**
Sie wohnt hier seit '78 und weicht keinen Zentimeter; ihr Satz ist „Ick wohn hier“. Sie kennt
jeden Hausmeister, jeden Hinterausgang und jede Mängelanzeige seit der Wende. Andere sprechen sie
mit Respekt und leichter Angst an. Stärke: Sturheit als Überlebenstechnik. Blinder Fleck:
„Früher war hier alles besser“, der Bauzaun, an dem sie jeden Morgen meckert, und das
Kinderzimmer, das sie für 900 Euro an Touristen vermietet.
- Alter Polier: „Du bist die, die jeden Morgen am Bauzaun steht und meckert. Bleib. Du bist hier die Einzige mit Erfahrung.“
- Spätimann: „Wie immer? Schrippe, Wegbier und dit Gefühl, dass früher allet besser war. Dit Letzte is gratis.“
- Ewiger Mietspiegel: „ALTVERTRAG. ERKANNT. DU. BIST. EIN. KOSTENFAKTOR.“

**Zugezogene (Fernkampf)**
Sie kam wegen der „guten Anbindung“ und wartet seit sechs Jahren darauf, anzukommen. Sie hält
Abstand, hat einen Jutebeutel, ein Hochbeet und Plenumserfahrung. Andere begegnen ihr mit
freundlichem Misstrauen, sie selbst ist beleidigt, wenn man sie für neu hält. Stärke: Distanz,
Organisation, Upcycling. Blinder Fleck: Sie hält sich nicht für Teil des Problems, weil die
Neuen nach ihr noch mehr zahlen.
- Ewiger Antragsteller: „Wohnen Sie nicht in meiner alten Wohnung? Für das Dreifache? Grüßen Sie die Dielen.“
- Spätimann: „Sechs Jahre hier? Dann biste nich mehr neu. Dann biste Inventar mit Jutebeutel.“
- Mietschimmel: „ZUGEZOGEN? DANN HAST DU FALSCH GELÜFTET. ICH WAR ZUERST HIER.“

**Tourist (Schurke/Schleicher)**
Er sucht das authentische Neukölln, und Neukölln sucht inzwischen zurück. Er ist „nur übers
Wochenende hier“, zieht den Rollkoffer um fünf Uhr übers Kopfsteinpflaster und fotografiert
alles, außer den Stellen mit „Fotos verboten“. Andere behandeln ihn wie Wetter: kommt, geht,
macht Lärm. Stärke: Niemand beachtet ihn, bis es zu spät ist. Blinder Fleck: Die Ferienwohnung,
in der er schläft, war einmal jemandes Wohnung.
- Dagebliebener Schwabe: „Du bisch au über die Feiertage da? Dann sind wir scho zu zweit. Des isch ja fast a Hausgemeinschaft.“
- Schalterspringer: „Ein Touristenschalter ist nicht vorgesehen. Die Wartenummer gibt es als Souvenir. Mit Stempel: vier Euro.“
- Türsteher: „Du nich. Und dein Rollkoffer ooch nich.“

### Bosse

**Mietschimmel (Ebene 5)**
Er spricht ausschließlich in GROSSBUCHSTABEN und in Hausverwaltungs-Sätzen. Er ist kein Mangel,
sagt er, sondern Ausstattung. Er gibt immer dem Mieter die Schuld und ist beleidigt, wenn man
ihn Schimmel nennt. Er kommt jeden November wieder, das ist seine Drohung und sein
Running Gag.
- „FALSCH GELÜFTET!“ (bestehend)
- „ICH BIN KEIN MANGEL. ICH BIN AUSSTATTUNG.“
- „...ICH... KOMME... IM... NOVEMBER... WIEDER...“

**Schalterspringer (Ebene 10)**
Ein Sachbearbeiter in Amtsdeutsch, höflich, passiv und völlig unzuständig. Jede Teleportation
ist eine Weiterleitung, und jede Falle ist ein Formfehler, den du gemacht hast. Er ist nicht
böse, sondern müde, und will nur Feierabend. Sein Beleidigungsfechten besteht aus Zuständigkeiten.
- „Da sind Sie hier falsch. Schalter 7.“
- „Ihr Anliegen wurde weitergeleitet. An mich. Ich bin jetzt da drüben.“
- „Endlich... Feierabend...“ (bestehend)

**DM-300 Bohrlinde (Ebene 15)**
Eine Maschine, die in Bauschild-Durchsagen spricht: GROSS, im Nominalstil, mit Sicherheitshinweisen.
Sie wurde mit Sekt getauft und bohrt seitdem, wohin, weiß niemand. Jede Phase verschiebt den
Eröffnungstermin. Ihr Tod ist ein abgebrochener Satz.
- „UNBEFUGTES PERSONAL FESTGESTELLT! ELTERN HAFTEN FÜR IHRE KINDER!“ (bestehend)
- „FERTIGSTELLUNG: HERBST. JAHR: WIRD NACHGEREICHT.“
- „KRITISCHER SCHADEN! NEUER ERÖFFNUNGSTERMIN: UNBEKA-“ (bestehend)

**König der Eigentumswohnungen (Ebene 20)**
Investorensprech mit Größenwahn: Potenzial, Rendite, Werte schaffen. Er ist eitel, wehleidig und
im Kern ein kleiner Hausverwalter namens Rodney. Er droht nicht mit Gewalt, sondern mit
Räumung und Nachschusspflicht. Wenn er verliert, jammert er über den Markt und die Angst vor dem,
was darunter liegt.
- „Das ist Privatgelände! Ab morgen auch dein Flur.“
- „ICH. BIN. SYSTEMRELEVANT!“ (bestehend)
- „Ich habe doch nur verwaltet!“

**Ewiger Mietspiegel (Ebene 25)**
Eine Tabelle als alter Gott: GROSS. PUNKT. ZWISCHEN. JEDEM. WORT. Er spricht in Spannen,
Merkmalen und Zu- und Abschlägen, nie in Gefühlen. Er sieht deine Nettokaltmiete und hält deine
Hoffnung für nicht ortsüblich. Er stirbt nicht, er wird neu erhoben.
- „ICH. SEHE. DEINE. NETTOKALTMIETE.“ (bestehend)
- „BALKON. PLUS. ZWEI. EURO. ANGST. PLUS. DREI.“
- „ICH. WERDE. IN. ZWEI. JAHREN. NEU. ERHOBEN.“

### NPCs

**Dagebliebener Schwabe (Quest-NPC Ebene 2–4 und Begleiter aus dem Nadelnden Christbaum)**
Ersetzt seit 2026-09-29 den Traurigen Altmieter (Auftrag des Projektinhabers). Quest-NPC und
Begleiter sind im Code dieselbe Figur, beide Textstränge sind er. Ein Schwabe, der an
Weihnachten ausnahmsweise nicht zur Familie fährt und in Berlin bleibt. Alle Berliner Freunde
sind zu ihren Eltern gefahren, im Treppenhaus grüßt keiner zurück, und er ist so allein, dass er
schon halb durchsichtig ist. Er ist nicht tot. Sympathisch, warmherzig, sparsam, ordentlich: Er
macht die Kehrwoche, auch wenn es niemand merkt, trennt den Müll, kocht Maultaschen für acht,
spart auf den Bausparvertrag, und seine Mutter ruft dreimal am Tag an. Seinen nadelnden
Christbaum gießt er trotzdem jeden Tag; irgendwer hat ihn im Januar aus dem Fenster geworfen.
Die Tannenzweige, die man unten findet, machen den Baum und ihn wieder stärker.
Sprache: leichtes, konsequentes Schwäbisch mit festen Markern (Register-Tabelle 1.3), sonst
Hochdeutsch; Quest-Hinweise zur Mechanik in `_…_` bleiben Standarddeutsch.
**Leitplanke:** Die Satire zielt auf Berliner Grantigkeit, die leere Stadt, Hausverwaltung und
Rendite, nie auf ihn oder seine Herkunft. Keine „Schwaben raus“-Witze, keine Spätzle-Beleidigung,
keine realen Personen. Er ist die liebevolle Figur, mit der man lacht; seine Pointen sind
Understatement über Einsamkeit und Ordnungsliebe.
Callbacks: Kehrwoche (Hausordnungs-Hydra, Kehrwochenkraut), Pfand (Pfandratte), Abstand
(Abstandswicht), 0815 (Amt), „Schaffe, schaffe, Häusle baue“ (Renditequartier).
- „Du siehst mich? Des isch schön.“
- „Mama, i bin durchsichtig.“
- „I hab für acht vorgekocht. Es kam ja keiner.“

~~**Trauriger Altmieter (Geist, Ebene 1–5)**~~ **Ersetzt** durch den Dagebliebenen Schwaben
(2026-09-29). Entmietung, Vertrag von 1974, Nebenkostenabrechnung von 1996 und Kaution sind
als Motive frei und können an anderer Stelle verwendet werden.

**Ewiger Antragsteller (Ebene 6–10)**
Altmodisches, sehr höfliches Hochdeutsch mit „Sie“ und langen Einschüben. Er hält Wartenummer
0816, die Anzeige zeigt seit Jahrzehnten 0815, und er ist unerschütterlich optimistisch. Er
wollte nur seinen Personalausweis verlängern. Er belohnt „ganz ohne Antrag“ und empfindet das
als Revolution.
- „Die 0815 ist gleich durch. Dann bin ich dran. Das sage ich seit 1994.“
- „Einen Zauberstab? Gern. Ohne Antrag. Sagen Sie es bitte niemandem.“
- „Falls Sie oben einen bezahlbaren Werkstattraum sehen: Ich stehe auf der Liste. Platz 4.000.“

**Alter Polier (Ebene 11–15)**
Derbes Berlinisch, grummelig, faul mit Würde. Er hat drei Bauherren und zwei Insolvenzen
überlebt und macht seit 1998 Frühstückspause. Er ist der letzte echte Handwerker und arbeitet
„ohne Rechnung, versteht sich“. Bei ihm lohnt jede Frage mit einer Abfuhr.
- „Ick hab Frühstückspause. Seit 1998. Zisch ab.“ (bestehend)
- „Die Spitzhacke war noch aus Volkseigentum. Wehe.“
- „Fertig werden? Junge, dafür wird man hier rausjeschmissen.“

**Ehrgeiziger Filialist (Ebene 16–21)**
Ein kleiner Dämon im Franchise-Sprech: Filiale zwei, bald drei, „Next Level“. Freundlich, schnell,
immer am Verkaufen, und ehrlicher, als er klingt. Er verkörpert Plattformlogik im Kleinen:
Bewertungen, Provision, Learning. Keine Emoticons im Text, sein Zwinkern steckt in der Wortwahl.
- „Filiale zwei! Bald drei. Also sobald Filiale eins schwarze Zahlen schreibt.“
- „Ich bin kein Konzern. Ich bin ein Konzern in der Seed-Phase.“
- „Bewerte uns gern! Fünf Sterne, sonst Fluch.“

**Herr Fuß (Gasalchemist, Ebene 1–5)**
Ein stolzer Kiezalchemist, der Gestank beschreibt wie ein Sommelier Wein: Kopfnote, Abgang,
Jahrgang. Er lädt jeden zur Vorführung ein, niemand hat gefragt. Seine Gefahr ist allein die
undichte Apparatur, und sie kündigt sich hörbar an. Der Rollstuhl kommt in keinem Text vor.
- „Riechen Sie das? Kopfnote Kellerassel, Abgang Biotonne, August.“
- „Das Ventil pfeift. Das heißt: Premiere.“
- „Frischluft ist was für Leute ohne Vision.“

### Neue Figuren aus dem Zusatzauftrag (nur mit Gameplay-Freigabe)

**Kanzler März (nie auf dem Bildschirm, nur Plakat, Graffiti, Tonband, Journal)**
Eine erfundene Parodie auf Politikstil: Sonntagsreden, Leistungsparolen, Law-and-Order-Rhetorik
über „Ordnung“ und „Stadtbild“, Versprechen im Futur. Er redet über den Kiez als Problemzone und
war nie länger als einen Fototermin dort. Die Pointe ist immer der Abstand zwischen Plakat und
Wirklichkeit. Keine echten Zitate, keine Partei, kein Aussehen.
- Plakat, Ebene 1–5: „Mehr Ordnung im Hinterhof. Kanzler März.“ Darunter übersprüht: „Erst mal Licht im Keller.“
- Plakat, Ebene 16–20: „Unser Stadtbild: aufgeräumt.“ Dahinter die Glasfassade. Aufgeräumt wurden die Mieter.
- Tonband, Ebene 21–25: „Leistung muss sich wieder lohnen.“ Die Mieterhöhungslarven applaudieren.

**Türsteher (Stimme für Concierge-Mönch-Varianten, Amtssecurity-Varianten oder neue Figur)**
Zwei Wörter, kein Grund, keine Diskussion. Er mustert Verhalten, nicht Menschen: Rollkoffer,
Gruppengröße, Handy in der Hand. Er ist die Monkey-Island-Mauer des Spiels, jeder Versuch
scheitert anders. Nie Absagen wegen Aussehen, Herkunft oder Behinderung.
- „Heute nicht.“
- „Nee. Ihr seid zu viele und ihr seid zu wach.“
- „Gästeliste? Steht da. Du nich.“

**Technojünger (Gegner „Afterhour“, Ebene 11–15, Mechanik offen)**
Seit Freitag wach, Sonnenbrille im Tunnel, schwarz, ernst, beleidigt über Tageslicht. Sie
tanzen auf dem Gleis, das nie befahren wird, und halten die Baustelle für den letzten ehrlichen
Club der Stadt. Humor über Clubrituale, Kater und Zeitgefühl, nie über Drogen. Seine
Beschreibung nennt die Mechanik so klar wie beim Leihscooter.
- „Wie spät? Sonntag.“
- „Keine Fotos. Auch nicht im Kopf.“
- „Das war früher alles Afterhour hier. Jetzt ist es Baustelle. Also immer noch.“

---

## 4. Running Gags und Callbacks

Jeder Gag hat einen **Anker** (bestehender Key), eine **Eskalationsregel**, einen **Payoff**
und eine **Leitplanke**. Autorinnen tragen neue Fundstellen hier ein, bevor sie sie verwenden.

| # | Gag | Anker heute | Eskalation (je Region einmal) | Payoff | Leitplanke |
| --- | --- | --- | --- | --- | --- |
| 1 | **Hundehaufen** („Tretmine“) | `actors.buffs.levitation.desc` („hoch über Hundehaufen“) | Ebene 1: erste Stufe; Amt: Hundehaufen mit Wartenummer; Baustelle: im Beton verewigt; Renditequartier: Hundehaufen-Sensor am Designerbrunnen, der Besitzer sagt „Der macht nix“; Rathaus: Akte „Hundekot, ungeklärt, seit 1987“ | Siegszene: letzter Schritt nach draußen. „Manche Dinge ändern sich nie. Gut so.“ | Gebissen werden Hundebesitzer, die nichts wegmachen. Nie Menschen, die auf der Straße leben. |
| 2 | **Pfand** | Pfandratte, Pfandgolem, Pfandkönig, `shopkeeper.buyback` („Ohne Pfand“), Pfandflasche als Wurfwaffe | Automat defekt („Leergut wird nicht angenommen“); der Golem wartet auf den Automaten; Glühweinbecher sind Pfand; im Renditequartier gibt es Pfand auf Ideen | Der Pfandgolem war nie böse, nur nicht abgegeben. Im Ziel: 8 Cent Pfand auf den Kuli. | Pfand ist ein Ding- und Automaten-Witz. Keine Pfandsammler, keine Armut (siehe Punch-up 24, 60). |
| 3 | **Kartenzahlung erst ab 10 Euro** | `items.gold.desc` (Kartenlesegeräte verschlungen), `terminhaendler.desc` („Kartenzahlung auch nicht“) | Spätimann jedes Mal eine Stufe trockener; Filialist nimmt Karte, aber nur ab 100; Renditequartier nimmt nur Karte; Mietspiegel nimmt nur Lastschrift | Finale: „Macht fuffzig Cent. Karte erst ab zehn.“ | Witz auf Geschäftslogik, nie auf den Händler als Person. |
| 4 | **Wasserschaden seit 2009** | `levels.level$feeling.water_desc_r1`, `levels.sewerlevel.bookshelf_desc` (Steuerratgeber 2009) | Das Jahr bleibt 2009, alles andere ändert sich: Amt legt die Meldung wieder vor, Baustelle pumpt ihn ab, Renditequartier nennt ihn „Wasserspiel“ | Rathaus: Akte „Wasserschaden 3. OG, gemeldet 2009, in Bearbeitung“ | Konstante Jahreszahl 2009, nie variieren. |
| 5 | **Termin beim Amt / Wartenummer 0815** | `tengu.*`, `wandmaker.desc`, `skeleton.explo_kill`, `dm100.zap_kill`, Splash „NR 0815“, `wndvictorycongrats.start_text` („ganz ohne Termin“) | Anzeige zeigt immer 0815; der Antragsteller hält 0816; Terminhändler verkaufen 0815 weiter; Mietspiegel führt dich als „0815, ortsüblich“ | Siegtext: „ganz ohne Termin“ (bestehend) plus einmal: 0815 wird aufgerufen, als niemand mehr da ist | Ziel ist der Apparat, nie die Menschen am Schalter oder in der Schlange. |
| 6 | **„Früher war hier alles …“** | Badge `games_played_3` („Früher war hier alles besser“), Alteingesessene | Der Satz wird nie gleich beendet: „…Keller“, „…Amt“, „…Afterhour“, „…Kiez“; die Zugezogene sagt ihn nach sechs Jahren auch schon | Ebene 25: „Früher war hier alles Rixdorf. Und da wollte auch keiner wohnen.“ (Umbenennung 1912, F01) | Trifft Nostalgie als Verhalten aller Gruppen. |
| 7 | **Döner als Heilnahrung** | `actors.buffs.hunger.desc_intro_hungry` („Ein Döner wäre jetzt trotzdem was“), `items.food.meatpie.*` („Döner mit alles“) | Döner-Preis-Index: in jeder Region teurer und umbenannter, Ebene 1 ehrlicher Preis, Renditequartier „Kebab Bowl“ zu 16,90; der Mietspiegel führt Döner als wohnwerterhöhendes Merkmal | Der Döner ist das Einzige, das in allen fünf Akten zuverlässig heilt | Liebevoll. Gag auf Preis, Soße, Hunger um drei Uhr nachts. Nie auf Personal, Herkunft, Sprache. |
| 8 | **Lieferfahrer (generisch)** | `shopkeeper.talk_prison_intro` („niemand einen Lieferdienst gegründet“), `escooter.hit` („Die App bedankt sich“) | Ein Fahrer mit Würfelrucksack ist in jeder Region schon vor dir da; die App bewertet dich, nicht ihn | Er liefert unter dem Rathaus: „Bestellung für Mietspiegel, Hinterhaus. Kein Trinkgeld.“ | Die Plattform ist das Ziel, der Fahrer ist der kompetenteste Mensch im Dungeon. Keine echte App. |
| 9 | **Kaution** | `goo.desc`, `challenges.no_armor_desc` (`ghost.rat_1` entfällt seit dem Schwaben) | Die Kaution kommt nie zurück, jede Region hat einen neuen Grund: Dübellöcher, Schimmel, Zeitablauf, Marktlage | Finale: „Die Kaution? Wird mit der Nebenkostenabrechnung verrechnet.“ | Nach oben: Vermieter und Verwaltung. |
| 10 | **Nebenkostenabrechnung** | 6 Vergleiche („undurchsichtig wie…“); der Altmieter-Anker entfällt (Figur ersetzt) | **Vergleich abschaffen, Objekt einführen:** Die Abrechnung ist ein Brief, der den Helden verfolgt und in jeder Region ankommt, dicker als vorher | Nebenkostenfaust (bestehend); Altmieter-Payoff entfällt, neuer Empfänger offen | Max. ein Nebenkosten-Vergleich pro Region (Ton-Bibel 10). |
| 11 | **Eigenbedarf** | `goo.defeated` („... Eigenbedarf ...“), Mietvertrag „kein Eigenbedarf“ | Jeder will Eigenbedarf: der Schimmel an der Wand, der König an deiner Wohnung, der Mietspiegel an der Stadt | Siegszene: der Vertrag, der als einziger keinen Eigenbedarf kennt | Nach oben. |
| 12 | **„Fertigstellung vsl. Herbst“** | `dm300.*`, `presslufter.ondeath`, `intros.caves.body`, Splash „BAUENDE 20??“ | Das Datum verschiebt sich in jedem Text; die Jahreszahl steht nie da | Bohrlinde stirbt mitten im neuen Termin („UNBEKA-“, bestehend) | Selbstironie ohne echte Betreiber-Logos oder Slogans. |
| 13 | **Kanzler März** (Plakate, Graffiti, Sonntagsrede) | noch keiner; Wirte: `levels.sewerlevel.region_deco_desc` (Parolen), `levels.citylevel.statue_desc`, `succubus.desc`, Journal | Ebene 1–5 „Mehr Ordnung im Hinterhof“, übersprüht; Amt „Termine für alle, ab der nächsten Legislatur“; Baustelle „Wir bauen!“ an der Baustelle, die nie fertig wird; Renditequartier „Unser Stadtbild: aufgeräumt“; Rathaus: Sonntagsrede vom Tonband | Spätimann: „Hat 'n Foto vorm Laden gemacht. Gekauft hat er nix.“ Badge-Serie „Leistung“ (Punch-up 58) | Politikstil, keine echten Zitate, keine Partei, kein Aussehen. Die Pointe trifft die Rhetorik, nie die Menschen, über die sie redet. |
| 14 | **Club und Afterhour** (Türsteher, Gästeliste, Stempel, Kater) | `actors.blobs.confusiongas.desc` („Club am Sonntagmittag“), `actors.buffs.daze.desc` („Montag nach dem Club“), `items.armor.platearmor` (Türsteherweste), `items.armor.clotharmor.desc`, `items.wands.wandofprismaticlight.desc` (Club ist jetzt Bioladen) | „Heute nicht.“ als universelle Absage: Türsteher, Amtssecurity, Concierge, Mietspiegel. Stempel: Club-Stempel und Amts-Stempel sehen gleich aus (Stempelfalle). Parodie-Clubs „Bärghain“, „Tresen“. Afterhour im Tunnel seit Freitag. Clubsterben durch Investoren (F18) im Renditequartier | Siegszene: Du stehst endlich auf der Gästeliste, sie heißt Hausgemeinschaft | Keine echten Clubs, keine Drogen-Gags; Kater und Schlafmangel sind die Grenze. Türsteher beurteilen Verhalten, nie Herkunft oder Aussehen. |
| 15 | **Maklerlyrik** | Feelings r1 („Souterrain mit Galerie“, „großzügiger Schnitt“, „begrünter Innenbereich“), `intros.sewers.body` („Atelier“) | Jede Region übersetzt ein Loch, einen Mangel, eine Gefahr in Exposé-Sprache | Rathaus: „Lage, Lage, Lage“ als Todesursache in der Rangliste | Makler und Portale als Ziel, nie Wohnungssuchende. |

Callback-Karte nach Ort (Kurzform für Autorinnen):
- **Items:** Döner (7), Kuli/Gold (3), Pfandflasche (2), Türsteherweste und Club-Hoodie (14), Mietvertrag (Finale).
- **Gegner:** Pfandratte/Golem (2), Terminhändler (3, 5), Leihscooter (8), Luxussanierer (15), Technojünger (14), Mieterhöhungslarve (Akt 5).
- **Journal:** Hofwächterin-Briefe (4, 9), Amtsleiterin (5), Bautagebuch (12), Hexer (13, 14), Rodney (11).
- **Badges:** `games_played_3` (6), `boss_slain_2` „Termin erhalten“ (5), `death_from_hunger` „Späti hatte zu“ (7), `gold_collected_*` (3), `high_score_*` (13), `victory`/`happy_end` (Finale).

---

## 5. Punch-up-Liste: die 60 schwächsten Stellen

Priorisiert nach Sichtbarkeit: Einstieg, Klassen, Spätimann, Ebene 1–5, Mitte, Bosse,
Siegszene. „Paket“ verweist auf Abschnitt 6. Zitate gekürzt, Stand 2026-09-29.

**Muss sofort (Leitplanke verletzt):** 22, 24, 29, 33, 43, 46, 60. **Muss (Kanon/Konsistenz):**
16, 20, 44, 47, 48.

### A. Einstieg und Tutorial

| # | Key | Aktuell (gekürzt) | Warum schwach | Richtung | Paket |
| --- | --- | --- | --- | --- | --- |
| 1 | `journal.document.intros.dungeon.body` | „…Ein Dokument, das jeden Wunsch erfüllen kann… Der Spätimann hat vielleicht noch offen.“ | Fantasy-Floskel („jeden Wunsch“) verwässert die Formel; die moralische Frage fehlt | Vertrag nur mit der kanonischen Formel beschreiben; Hundehaufen und zugefallene Tür pflanzen; letzter Satz bleibt Spätimann | P1 |
| 2 | `actors.hero.hero.leave` | „Du kannst jetzt noch nicht gehen, der Rest des Dungeons wartet da unten.“ | Erster Blocker des Spiels, Upstream-Ton, „Dungeon“ | Die Brandschutztür ist zu, der Schlüssel liegt im Keller; Mechanik (Aufstieg erst später) bleibt klar | P4 |
| 3 | `journal.document.adventurers_guide.surprise_attacks.body` | „Frag jeden Taschendieb am Hermannplatz.“ | Stigmatisiert einen realen Platz über Kriminalität | Pointe auf Verhalten: Tourist mit Stadtplan oder Türsteher, der dich nie kommen sieht | P1 |
| 4 | `journal.document.adventurers_guide.dieing.body` | „Oder ziehen nach Leipzig, was manche für dasselbe halten.“ | Abgegriffener Städtewitz | Wegzug als Verdrängung („Oder ziehen nach Brandenburg. Die Miete ist tot, du lebst.“), keine Stadt als Pointe | P1 |
| 5 | `journal.document.adventurers_guide.food.body` | „Der Döner läuft dir nicht weg, jedenfalls meistens nicht.“ | Döner-Gag angetippt, aber ohne Setup für den Preis-Index | Erster Anker für Gag 7, Mechanik-Tipp unverändert klar | P1 |
| 6 | `journal.document.adventurers_guide.searching.body` | „…unsichtbar sind, wie Nebenkosten.“ | Nebenkosten-Vergleich Nr. 1 von vielen | Konkretes Kellerdetail (Verschlag, der niemandem gehört) | P1 |

### B. Klassen

| # | Key | Aktuell (gekürzt) | Warum schwach | Richtung | Paket |
| --- | --- | --- | --- | --- | --- |
| 7 | `actors.hero.heroclass.warrior_desc_short` | reine Mechanik, keine Pointe | Die anderen drei haben eine Schlusszeile, sie nicht | Schlusssatz „Ick wohn hier.“-Variante nach der Mechanik | P4 |
| 8 | `actors.hero.heroclass.rogue_desc_short` | „Ein echter Geheimtipp.“ | Generisch, kein Tourist-Verhalten | Rollkoffer, „nur übers Wochenende“, Fotoverbot | P4 |
| 9 | `actors.hero.heroclass.huntress_desc_short` | „Urban Gardening mit Fernkampfschwerpunkt.“ | Erklärt statt pointiert | „Gute Anbindung“ oder Abstand-halten-Pointe, kurz | P4 |
| 10 | `actors.hero.heroclass.rogue_desc` | „…_drei Kartoffelschälern_…“ | Wurfmesser als Kartoffelschäler ist unklar und nicht Tourist | Souvenir-Wurfwaffe (z. B. Magnet-Brandenburger-Tor ohne Marke), Mechanik unverändert | P4 |
| 11 | `actors.mobs.npcs.wandmaker.intro_mage` | „…Ärger zwischen dir und der Ausländerbehörde?…“ | Pointe liegt auf dem Status des Expats statt auf dem Amt | Gemeinsames Warten auf die Behörde, der Apparat ist das Ziel | P2 |
| 12 | `actors.mobs.npcs.wandmaker.intro_rogue` | „…unter ‚Echtes Berlin erleben‘…“ | Lang, Pointe in der Mitte | Kürzen, Pointe ans Ende (Wartenummer als Souvenir) | P2 |
| 13 | `actors.mobs.npcs.shopkeeper.talk_prison_warrior` | „Gleicher Aufnäher, gleiche Jacke. Früher war hier nur ein Wasserschaden. Heute heißt dit Erlebnisquartier.“ | Drei Gags, keiner landet | Einer: „Früher war hier alles …“ (Gag 6) oder Wasserschaden 2009 (Gag 4) | P2 |
| 14 | `actors.mobs.npcs.shopkeeper.talk_prison_huntress` | „Bogen schön auf Abstand halten, die Flaschen sind sortiert… nicht der Fahrradkeller.“ | Diffus, drei Richtungen | Sechs-Jahre-noch-nicht-angekommen oder Jutebeutel, ein Satz | P2 |
| 15 | `actors.mobs.npcs.shopkeeper.talk_prison_mage` | „…Feuerball auch nicht als Exposure bezahlen.“ | Der Expat startet mit Konfetti-Werfer, nicht Feuerball | Pitch/Firmenkarte/Karte erst ab zehn (Gag 3) | P2 |

### C. Spätimann und Handel

| # | Key | Aktuell (gekürzt) | Warum schwach | Richtung | Paket |
| --- | --- | --- | --- | --- | --- |
| 16 | `actors.mobs.npcs.shopkeeper.talk_prison_intro` | „Na. Auch Kellerbesichtigung? Ich kaufe und verkaufe.…“ | Wird mit dem Klassensatz verkettet (`Shopkeeper.java`): erst „ich“, dann „ick“ in einer Blase | Durchgehend Berlinisch; ein Satz Funktion, ein Satz Pointe | P2 |
| 17 | `actors.mobs.npcs.shopkeeper.desc` | „…Er weiß auch, dass du noch Geld hast.“ | Solide, aber ohne Running Gag | Kartenzahlung ab zehn oder „der Einzige, der zuständig ist“ | P2 |
| 18 | `actors.mobs.npcs.shopkeeper.thief` | „Dieb, Dieb! Und dit bei meinen Preisen!“ | Ausruf, kein Konter; Selbstabwertung verpufft | Trockener Konter, Understatement (Rollladen-Logik) | P2 |
| 19 | `actors.mobs.npcs.shopkeeper.warn` | „Pass uff! Ick warne dich nich' nochmal.“ | Generische Drohung | Späti-Detail (Kamera-Attrappe, Hausverbot seit 2009) | P2 |
| 20 | `actors.mobs.npcs.shopkeeper.talk_halls` | „Na, Dämonenjäger?… ;)… Ich bin nur ein kleiner Filialist…“ | Wird vom Filialisten gesprochen (ImpShopkeeper erbt den Key), ist zu lang, hat Smiley | Als Filialisten-Stimme kürzen, Smiley raus, Warnung vor dem Mietspiegel klar | P2 |
| 21 | `actors.mobs.npcs.shopkeeper.talk_ascent` | „…Unbefristet? Da drehen alle durch.…“ | Pointe fehlt, erklärt die Lage | Ein trockener Satz über Öffnungszeiten angesichts des Weltendes | P2 |
| 22 | `actors.mobs.npcs.impshopkeeper.thief` | „…Das geht in die Google-Bewertung!“ | Echte Marke | „Das gibt einen Stern. Einen!“ ohne Plattformnamen | P2 |
| 23 | `items.gold.desc` | „…Kartenlesegeräte… im ersten Zeitalter des Wartungsstaus verschlungen.“ | Der beste Running Gag ist versteckt und umständlich | Mechanik (An- und Verkauf) zuerst, dann „Karte erst ab zehn“ | P5 |

### D. Ebene 1–5

| # | Key | Aktuell (gekürzt) | Warum schwach | Richtung | Paket |
| --- | --- | --- | --- | --- | --- |
| 24 | `actors.mobs.rat.desc` | „Die Flaschensammlung im Nest ist vermutlich ihre Altersvorsorge.“ | Spielt auf Altersarmut und Flaschensammeln an (Leitplanke) | Besitzanspruch: Jeder Kronkorken im Hof gehört ihr | P3 |
| 25 | `actors.mobs.gnoll.desc` | „…bewacht feuchte Durchgangszimmer, die es selbst nie bewohnen würde.“ | Passt nicht zum Namen Besichtigungswicht (Wohnungsinteressent mit Mappe) | Schlange stehen, Bewerbungsmappe, „Können Sie mehr zahlen?“ (F21) | P3 |
| 26 | `actors.mobs.albino.desc` | „…aus einer Kunstinstallation in Kreuzberg entlaufen.“ | Falscher Bezirk, Standardgag | Neukölln-Detail (Galerie im ehemaligen Kiosk) | P3 |
| 27 | `actors.mobs.piranha.desc` | „…als der Aquarium-Hype vorbei war.“ | Schwache Begründung | Landwehrkanal-Detail, Pointe „Einfach nicht reinspringen.“ (Weltbibel) | P3 |
| 28 | `actors.mobs.gasalchemist.desc` / `.warning` | „…Raumduft für Fortgeschrittene. Niemand hat nach einer Vorführung gefragt.“ | Herr Fuß hat keine Stimme, nur eine Warnung | Sommelier-Stimme (Abschnitt 3); neue Sprechzeilen brauchen Java | P3 |
| 29 | `actors.mobs.npcs.ratking.crown_clothes` | „…So kommst du nicht mal ins Berghain…“ | Echter Clubname | „Bärghain“, Türsteher-Gag (Gag 14) | P2 |
| 30 | `actors.mobs.npcs.ratking.what_is_it` | „Was ist? Ich habe keine Zeit für deinen Unsinn.…“ | Upstream-Floskel | Pfandimperium-Detail, Leergut-Sortierung als Staatsgeschäft | P2 |
| 31 | `actors.mobs.pfandgolem.shatter` | „Der Pfandgolem zerspringt! Überall Scherben.“ | Flach; der Goat-Moment verpufft | Mechanik bleibt, dazu eine trockene Folge (8 Cent pro Scherbe, nicht rückgabefähig) | P3 |
| 32 | `actors.mobs.goo.defeated` | „... Eigenbedarf ...“ | Unlogisch: Schimmel hat keinen Eigenbedarf | „...ICH... KOMME... IM... NOVEMBER... WIEDER...“ | P3 |
| 33 | `items.food.chargrilledmeat.desc` | „Riecht nach Sommer im Görli und nach einer Ordnungswidrigkeit.“ | Anderer Bezirk, Park mit Drogen-Assoziation | Grillen auf dem Feld, Ordnungsamt-Pointe | P5 |
| 34 | `items.food.meatpie.desc` | „…Nur der Preis ist umstritten.“ | Döner-Gag ohne Konkretes | Döner-Preis-Index Start (Gag 7), Mechanik „sättigt stärker“ klar | P5 |
| 35 | `items.food.food.desc` / `.eat_msg` | „Nicht bio. Aber gerettet.“ | Standardration ohne Kiez-Pointe | Späti-Tüte als Grundnahrung, trockener Spätimann-Satz | P5 |
| 36 | `items.food.berry.desc` | „Diese kleine Beere hat die Zugezogene… gepflückt.“ | Nennt eine Klasse, egal wer spielt | Neutral: „zwischen Mülltonnen gepflückt“ | P5 |
| 37 | ~~`windows.wndsadghost.farewell`~~ (erledigt durch Schwaben-Umbau) | „Auf Wiedersehen, Abenteurer! Grüß den Hinterhof von mir...“ | Kitschig, kein Konter | „Sag der Hausverwaltung... ach, lass. Die hört eh nich'.“ | P2 |
| 38 | ~~`windows.wndsadghost.rat`~~ (erledigt durch Schwaben-Umbau) | „…Ick frag mich, welche verdrehte Magie…“ | Upstream-Satzbau, zu lang | Kürzen, Kaution oder 1996 als Schluss | P2 |
| 39 | ~~`actors.mobs.npcs.ghost.crab_1`~~ (erledigt durch Schwaben-Umbau) | „Einst war ick wie du... Doch dann hat mich 'n uraltes Viech…“ | Als einzige Variante ohne Kiez-Detail | Wohnt länger hier als er, Mietvertrag älter als der Panzer | P2 |
| 40 | `levels.level$feeling.traps_desc_r1` | „…Wie ein Nebenkostenbescheid.“ | Vergleichs-Diät | Konkrete Kellerfalle (lose Stufe, Hausmeister kommt Donnerstag) | P3 |
| 41 | `levels.level$feeling.traps_desc` + `…traps_desc_r4` | beide „Wie ein/der Mietvertrag mit Staffelmiete.“ | Doppelt, derselbe Vergleich | Allgemeine Fassung ohne Miet-Vergleich; r4 behält ihn | P3 |
| 42 | `journal.document.sewers_guard.new_position.body` | „…Sogar mit Zulage für Schimmel.“ | Upstream-Brief mit angeklebtem Gag | Sonjas Stimme: naiver Diensteifer, ein Hof-Detail pro Brief | P1 |
| 43 | `items.potions.potionofliquidflame.name` (und Nennung in `heroclass.mage_desc`) | „Brennspiritus-Pulle“ | „Pulle“ macht Brennspiritus zum Getränk, Sucht-Nähe | Grillanzünder-Motiv („Grillanzünder vom Feld“, Weltbibel), kein Trinkwort | P5 |
| 44 | `actors.hero.hero.revive` + `windows.wndresurrect.message` | „Das Anch explodiert…“ | Upstream-Name, kein Kiezbezug | Ersatzschlüssel bei der Nachbarin („Du hattest einen Zweitschlüssel hinterlegt“), Item-Name im selben Paket | P4 (revive), P5 (Item, Fenster) |

### E. Mitte (Ebene 6–20) und NPCs

| # | Key | Aktuell (gekürzt) | Warum schwach | Richtung | Paket |
| --- | --- | --- | --- | --- | --- |
| 45 | `actors.mobs.npcs.blacksmith.intro_quest_start` | „…seit 26 Jahren auf dieser Baustelle…“ | Widerspricht „Frühstückspause seit 1998“ (2026 = 28 Jahre) | 1998 als Konstante, Zahl angleichen | P2 |
| 46 | `actors.mobs.succubus.desc` | „…flüstert ‚Be Berlin‘…“ | Realer Stadtmarketing-Slogan | Erfundene Imagekampagne oder Parolen von Kanzler März (Gag 13) | P3 |
| 47 | `journal.notes$landmark.demon_spawner` + `badges$badge.boss_challenge_5.desc` | „Dämonenschleuder“ | Spieltext heißt „Kündigungsschleuder“ | Namen angleichen | P1 |
| 48 | `actors.mobs.npcs.imp.old_intro`, `.quest_intro_1`, `.old_monks_2`, `.quest_completed_good/great` | „…;)“ | Emoticons im Spieltext | Zwinkern in die Wortwahl verlegen (Filialisten-Stimme) | P2 |
| 49 | `levels.sewerlevel.region_deco_desc` | „…Parolen, die andere Parolen überkleben…“ | Guter Wirt ohne Inhalt | Erstes März-Plakat, übersprüht (Gag 13), Mechanik „fest verschraubt“ bleibt | P3 |
| 50 | `levels.citylevel.statue_desc` | „…‚Er hat hier Werte geschaffen.‘ Welche, steht nicht dabei.“ | Gut, aber ohne Callback | Fotostelle für Kanzler März oder Investor, Pointe bleibt am Ende | P3 |

### F. Bosse

| # | Key | Aktuell (gekürzt) | Warum schwach | Richtung | Paket |
| --- | --- | --- | --- | --- | --- |
| 51 | `actors.mobs.dwarfking.notice` | „…Das ist Privatgelände! Du hast keine Ahnung, in was du dich hier einmischst!“ | Zweiter Satz ist Upstream-Floskel | „Privatgelände. Ab morgen auch dein Flur.“ | P3 |
| 52 | `actors.mobs.dwarfking.wave_3` | „Das ist nutzlos! RÄUMT SIE! JETZT!“ | Erster Satz ohne Figur | Investorensprech („Unrentabel!“) vor dem Räumungsbefehl | P3 |
| 53 | `actors.mobs.dwarfking.desc` | endet mit Mechanik, Flavor ohne Pointe | Kein Rodney-Setup | Kleiner Hausverwalter, der zu groß wurde; Pointe vor dem Mechaniksatz | P3 |
| 54 | `actors.mobs.yogdzewa.defeated` | „…“ | Größter verschenkter Payoff | „ICH. WERDE. IN. ZWEI. JAHREN. NEU. ERHOBEN.“ | P3 |
| 55 | `actors.mobs.yogdzewa.desc` | Upstream-Länge, „Alle zwei Jahre neu erhoben“ in der Mitte | Pointe versteckt, Lore-Brei | Kürzen; Tabelle als Gott, Pointe ans Ende des Flavor-Absatzes, Mechanik getrennt | P3 |
| 56 | `actors.mobs.yogdzewa.darkness` | „…wie die nächste Erhöhung.“ | Vergleich statt Tabellenstimme | GROSS. PUNKT. Merkmal-Sprache („DUNKELHEIT. WOHNWERTMINDERND. NICHT. BERÜCKSICHTIGT.“) | P3 |
| 57 | `actors.mobs.yogfist$darkfist.desc` + `…$burningfist.desc` | „so undurchsichtig wie eine Nebenkostenabrechnung“ / „genau wie deine letzte Heizkostenabrechnung“ | Vergleichs-Diät, zweimal in derselben Arena | Faust als Absender des Briefs (Gag 10), Mechanik unverändert | P3 |

### G. Siegszene und Badges

| # | Key | Aktuell (gekürzt) | Warum schwach | Richtung | Paket |
| --- | --- | --- | --- | --- | --- |
| 58 | `badges$badge.high_score_1..5.title` | „Punktejäger-Neuling“ … „Punktejäger-Großmeister“ | Fünf generische Titel | Leistungsparolen-Leiter von Kanzler März („Leistungsbereit“ bis „Leistung hat sich gelohnt, für wen?“), Beschreibungen bleiben rein mechanisch | P1 |
| 59 | `scenes.amuletscene.text` + `.exit`/`.stay` | „…nicht einmal eine Eigenbedarfskündigung… Wie ein echter Berliner, weil der Aufzug kaputt ist…“ | Generischer Triumph, schwache Schlusspointe, Moral fehlt | Finale aus Abschnitt 2: „Übertragbar nur an die Hausgemeinschaft“, Kuli, Hundehaufen; Wahl `exit`/`stay` bleibt klar erklärt | P1 |
| 60 | `badges$badge.gold_collected_1.title` (auch `badges$badge.victory.title`, `happy_end.title`, `windows.wndvictorycongrats.title`) | „Pfandsammler“; „Sieg!“, „Happy End“ | „Pfandsammler“ macht Armut zum Titel (Leitplanke); Siegtitel generisch | „Wechselgeld-Held“ o. ä.; Sieg-Titel mit Vertrags-Pointe („Unbefristet!“, „Eingezogen“) | P1 (Badges, Fenster-Titel) |

---

## 6. Arbeitspakete für die parallele Autoren-Runde

Regeln für alle Pakete:
- **Kein Key gehört zwei Paketen.** Die Zuordnung erfolgt über Key-Präfixe. Was keinem
  Paket zugeordnet ist, gehört P1.
- Nur bestehende Keys ändern. Keine Keys löschen, keine neuen anlegen. Neue Zeilen (Herr Fuß,
  Türsteher, Technojünger, März-Plakate, klassenabhängige Siegtexte) als Vorschlag an den
  Gameplay-Agenten melden.
- Platzhalter (`%s`, `%d`, `%1$s`, `%%`), `\n`, `_Hervorhebung_` und Keynamen bleiben exakt.
  Vor dem Abgeben prüfen, dass die Zahl der Keys und die Platzhalter je Key unverändert sind.
- Mechanikangaben (Zahlen, Reichweiten, Dauer) werden nicht verändert, auch nicht „zur Pointe“.
- Vor dem Umschreiben den aktuellen Text des Keys lesen (andere Agents arbeiten parallel).
- Nichts als spielbar melden, was nicht im Spiel getestet ist. Offene Punkte am Ende jeder
  Runde notieren.
- Stil: Ton-Bibel (1), Stimmen (3), Gags (4). Neue Running Gags zuerst in Abschnitt 4 eintragen.

### P1 – Rahmen, Journal und Finale (Showrunner-Paket)

- **Umfang:** `journal_de` komplett (`journal.*`); `scenes_de` komplett (`scenes.*`);
  `misc_de` komplett (`badges*`, `challenges.*`, `rankings*`); `ui_de` komplett (`ui.*`);
  `items.amulet.*`; in `windows_de` alle Keys, die nicht P2, P4 oder P5 gehören, insbesondere
  `windows.wndvictorycongrats.*`, `wndjournal`, `wndranking`, `wndscorebreakdown`,
  `wndgame`, `wndgameinprogress`, `wndsettings`, `wndkeybindings`, `wnddocument`,
  `wndchallenges`, `wnddailies`, `wndsupportprompt`, `wndinfotrap`, `wndinfocell`,
  `wnderror`, `wndquickbag`.
- **Schwerpunkte:** Region-Intros als Akt-Eröffnungen (Abschnitt 2), Siegszene und Badges,
  Lore-Briefe mit klarer Figurenstimme (Hofwächterin Sonja, Amtsleiterin, Forscher, Hexer,
  Rodney), Kanzler-März-Journalnotizen, Leistungs-Badges. Bedien-UI nur anfassen, wenn es
  unklar ist.
- **Punch-up:** 1, 3, 4, 5, 6, 42, 47, 58, 59, 60.
- **Callbacks:** alle Payoffs (1, 3, 4, 5, 6, 9, 11), 13 (März), 14 (Gästeliste im Finale),
  15 (Maklerlyrik in Todesursachen der Rangliste).

### P2 – Spätimann, NPCs und Quests

- **Umfang:** `actors.mobs.npcs.*` (Spätimann, Filialist, Dagebliebener Schwabe, Antragsteller, Polier,
  Pfandkönig, Schaf, Spiegelbilder und alle weiteren NPCs); `items.quest.*`;
  `items.merchantsbeacon.*`; `items.artifacts.driedrose*` (Artefakt und alle
  `driedrose$ghosthero`-Dialoge, die Stimme des Schwaben); `windows.wndsadghost.*`,
  `windows.wndblacksmith.*`, `windows.wndwandmaker.*`, `windows.wndimpold.*`,
  `windows.wndtradeitem.*`.
- **Schwerpunkte:** Spätimann einheitlich berlinernd und trocken, Filialist ohne Emoticons,
  Schwabe liebevoll und lesbar, Antragsteller mit 0816, Polier mit 1998, Club- und März-Sprüche beim
  Spätimann (je höchstens einer pro Standort).
- **Punch-up:** 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 29, 30, 37, 38, 39, 45, 48.
- **Callbacks:** 2 (Pfand, Pfandkönig), 3 (Karte ab zehn), 4, 5 (0815/0816), 8 (Lieferdienst),
  9 (Kaution), 13 (März-Foto vorm Laden), 14 (Bärghain, „Heute nicht“), 12 (Polier).

### P3 – Gegner, Bosse und Ebenen

- **Umfang:** `actors.mobs.*` **ohne** `actors.mobs.npcs.*` (alle Gegner, Bosse, Fäuste,
  Larven, eigene Gegner Leihscooter bis Hausordnungs-Hydra, künftig Technojünger);
  `actors.blobs.*`; `actors.char.*`; `levels_de` komplett (`levels.*`, `tiles.*`:
  Feelings, Fallen, Räume, Deko, Terrain).
- **Schwerpunkte:** Bossstimmen nach Abschnitt 3, Vergleichs-Diät in Feelings und Fäusten,
  Rodney-Setup, Mietspiegel-Payoff, März-Plakate in Deko-Beschreibungen (nur bestehende
  Deko-Keys), Club-Motive in Blobs und im Renditequartier, Herr-Fuß-Beschreibung. Mechaniksätze
  der eigenen Gegner nicht anfassen, außer sie sind unklar.
- **Punch-up:** 24, 25, 26, 27, 28, 31, 32, 40, 41, 46, 49, 50, 51, 52, 53, 54, 55, 56, 57.
- **Callbacks:** 1 (Hundehaufen in Feelings), 2 (Pfandratte, Golem), 4 (Wasserschaden),
  10 (Nebenkosten als Objekt), 11 (Eigenbedarf), 12 (Bohrlinde, Presslufter), 13, 14 (Afterhour,
  Clubsterben), 15 (Maklerlyrik in Feelings).

### P4 – Heldinnen und Helden

- **Umfang:** `actors.hero.*` (Klassen, Subklassen, Talente, Fähigkeiten, Kleriker-Sprüche,
  Expat-Zauberformeln, `actors.hero.hero.*`); `actors.buffs.*` (inklusive Hunger, Wut, Kombo,
  Schwebe, Benommenheit); `windows.wndhero.*`, `wndheroinfo.*`, `wndclass.*`,
  `wndchoosesubclass.*`, `wndchooseability.*`, `wndcombo.*`, `wndmonkabilities.*`,
  `wndclericspells.*`, `wndinfotalent.*`.
- **Schwerpunkte:** Die vier Klassen mit Stärke und blindem Fleck (Abschnitt 3); 326 von 346
  Talenten und 157 von 159 Fähigkeiten sind laut Audit noch Upstream-Text, hier liegt die
  größte Menge. Klassenbegriffe („Krieger“, „Magier“, „Schurke“, „Jägerin“) in Talenten
  ersetzen. Buff-Beschreibungen tragen Mechanik, Flavor höchstens ein Satz.
- **Punch-up:** 2, 7, 8, 9, 10, 44 (nur `actors.hero.hero.revive`).
- **Callbacks:** 1 (Schwebe-Buff), 6 („Früher war hier alles“ bei der Alteingesessenen),
  7 (Hunger und Döner), 14 (Benommenheit, Kater), Expat-Formeln mit deutscher Effektzeile.

### P5 – Items und Pflanzen

- **Umfang:** `items_de` **ohne** `items.amulet.*`, `items.quest.*`,
  `items.merchantsbeacon.*` und `items.artifacts.driedrose*` (also Waffen, Rüstungen,
  Tränke, Schriftrollen, Ringe, Zauberstäbe, übrige Artefakte, Kleinode, Nahrung, Bomben,
  Steine, Zauber, Taschen, Schlüssel, Gold, Anch und übrige Wurzel-Keys); `plants_de`
  komplett (`plants.*`); `windows.wndresurrect.*`, `windows.wndupgrade.*`,
  `windows.wndenergizeitem.*`.
- **Schwerpunkte:** Döner-Preis-Index in der Nahrung, Kartenzahlung beim Gold, Anch als
  Zweitschlüssel, Sucht-Nähe bei Getränkenamen prüfen (Brennspiritus, Wegbier nur als Kulisse),
  28 Items mit neuem Namen und alter Beschreibung (Audit 2.2), Trinket-Namen, Pflanzennamen
  mit der Weltbibel abgleichen (Neidmoos vs. Hundewiesenmoos: Entscheidung dokumentieren).
- **Punch-up:** 23, 33, 34, 35, 36, 43, 44 (Item-Name, `wndresurrect`).
- **Callbacks:** 2 (Pfandflasche), 3 (Gold), 7 (Döner), 14 (Türsteherweste, Club-Hoodie,
  Discokugel-Stab, Stempel auf Artefakten), 1 (Hundewiesen-/Neidmoos, falls passend).

Punch-up 44 ist bewusst auf zwei Pakete verteilt, aber nach Keys getrennt:
`actors.hero.hero.revive` gehört P4, `items.ankh.*` und `windows.wndresurrect.*` gehören P5.
Beide stimmen den neuen Namen vor dem Schreiben miteinander ab.

---

## 7. Offene Punkte für Integration und andere Agents

- **Neue Keys und Java (Gameplay):** Sprechzeilen für Herr Fuß, Türsteher und Technojünger;
  Gegner „Afterhour“ (Mechanik offen, muss wie alle eigenen Gegner eine Runde vorher
  ankündigen und Zahlen nennen); Wanddeko mit Beschreibung für Plakate und Graffiti in
  Ebene 1–5 und 16–20 (heute gibt es nur `levels.caveslevel.wall_deco_desc`);
  klassenabhängige Siegtexte.
- **Art:** Plakat- und Graffiti-Deko ohne lesbare reale Namen, Logos oder Parteifarben-Codes;
  Parodie-Club-Schilder „Bärghain“/„Tresen“ ohne Nachbildung echter Fassaden.
- **Weltbibel:** Namen weichen vom Spieltext ab (Mimic „Zu-verschenken-Truhe“ vs. „Sperrmüllmonster“,
  „Hundewiesenmoos“ vs. „Neidmoos“, Heiltrank-Vorschlag). Der Eigentümer der Weltbibel gleicht ab.
- **Leitplanken-Verstöße im Spieltext** (Punch-up 22, 24, 29, 33, 43, 46, 60) sollten in der
  ersten Runde behoben werden, unabhängig von allem anderen.
- **Politische Parodie:** Kanzler März ist als erkennbare Parodie gedacht. Vor einer
  Veröffentlichung klärt der Projektinhaber, ob der Name so bleiben soll; die Texte bleiben
  in jedem Fall bei Politikstil statt Person.

## 8. Entscheidungen des Projektinhabers

- 2026-09-29: „Kraft-Wegbier“ bleibt als Name (Beschreibung ohne Trink-Pointe).
- 2026-09-29: Der Zustand „verkrüppelt“ behält den Upstream-Namen.
- 2026-09-29: Der Name „Kanzler März“ bleibt (Politikstil-Parodie, keine echten Zitate oder Parteibezüge).
