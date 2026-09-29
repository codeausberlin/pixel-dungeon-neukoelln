# Club-Labyrinth "Ilse" (ehemals Tresor-Quest, Ebene 16-19)

Stand 2026-09-29, Gameplay-Agent (Runde 3, Brief Punkt 13). Parodienamen: "Ilse", "Ilsenbrücke",
"Bärghain". Keine echten Clubs. Humor auf Türsteher, Gästeliste, Garderobe, Afterhour, nie auf Drogen.

## So funktioniert die Quest (Upstream-Mechanik, unverändert)

- **Auslöser:** Der Ehrgeizige Filialist (`Imp`, neue Quest-Variante) erscheint zufällig auf Ebene 17-19
  (`Imp.Quest.spawn`, Raum `AmbitiousImpRoom`). Nach dem Gespräch ist die Kellertreppe
  (`BRANCH_EXIT` der `CityLevel`) aktiv.
- **Betreten:** `CityLevel.activateTransition` fragt nach, heilt voll, packt **alle Gegenstände, Gold und
  Energie** in das Notausgangs-Bändchen (`EscapeCrystal.storeHeroBelongings`) und gibt nur einen
  Hoodie (`ClothArmor`). Ziel ist `Dungeon.branch = 1`, dieselbe Tiefe (`Dungeon.newLevel` -> `VaultLevel`).
- **Im Club:** Eingangsbereich mit zwei Wiedereinlass-Stempeln (`VaultBeacon`, Rückteleport zum Eingang),
  normale Räume mit Schleich-Gegnern und Beute, **7 gesicherte Nebenräume** (`VaultTreasureRoom`, je
  T1/T2/T3), die Garderobe (`VaultTokensRoom` mit `VaultTokenDoor`, dahinter `VaultMirror` mit dem
  Klassen-Gegenstand und T3-Beute) und der VIP-Bereich (`VaultFinalRoom`).
- **Gegner:** geben keine Erfahrung. Jeder besiegte Gegner treibt nur die Ring-Identifikation voran.
- **Ende:** Das Notausgangs-Bändchen funktioniert jederzeit. Die Wertung (0-4000) ergibt sich aus
  Erkundung (max. 1000), Garderobenmarken bzw. geöffneter Garderobe (max. 1250), Schaden an der Anlage
  (max. 750) oder 4000 mit der Statuette. Beim Verlassen kommt die gesamte alte Ausrüstung zurück.
- **Belohnung:** je nach Wertung ein Verbrauchsgegenstand, ein Gegenstand bis +0 oder +1, oder mit Statuette
  ein beliebiger Gegenstand aus dem Club. Über 2000 Punkte eröffnet der Filialist weiter unten seinen Laden.
  Der VIP-Bereich bietet außerdem die Belohnungsauswahl des Filialisten (Artefakt, Ringe, Waffen, Rüstung,
  Zauberstab), die erst nach dem Sieg über die Anlage (Boss `VaultBossElemental`) erreichbar ist.

## Was geändert wurde

| Thema | Umsetzung |
| --- | --- |
| Garderobenmarke | Das bestehende Item `DwarfToken` ist die Garderobenmarke (Klasse bleibt für Spielstände). Neues Icon: Zelle `ItemSpriteSheet.VIAL` (vom Art-Agenten gezeichnet). |
| Genau 7 Marken | Jeder der 7 Nebenräume enthält genau eine Marke (liegt dort oder wird vom Wächter getragen). Umherlaufende Gäste aus `VaultLevel.createMob()` tragen keine Marke mehr (`maxLvl = NO_TOKEN_LVL`, wird mitgespeichert). |
| Garderobe öffnet bei 7 | `VaultTokenDoor` verlangt `DwarfToken.VAULT_REQUIRED` (7, vorher 10) und zeigt immer "Garderobenmarken: x/7". |
| Fortschritt sichtbar | Beim Aufheben im Club: "Garderobenmarken: x/7", bei 7: positive Meldung. Die Item-Beschreibung zeigt den Stand ebenfalls. Der Stand ist die Stapelgröße im Inventar, also Save/Load-fest. |
| Wertung | `EscapeCrystal`: 1000 Punkte verteilt auf 7 Marken statt 100 je Marke. |
| Vorgeschichte | `VaultLevel` zeigt beim ersten Betreten einmal ein `WndStory` (Flag `intro_shown` im Level-Bundle). |
| Ausgang | Das Notausgangs-Bändchen bleibt jederzeit nutzbar (Fairness, kein Softlock). Ziel "7 Marken" steht im Einstiegsdialog, in der Vorgeschichte und in der Markenbeschreibung. |

Texte liegen als Overlay vor (nicht in `*_de.properties` geschrieben):
`scratchpad/r3/J2_changed.properties` (bestehende Keys) und `scratchpad/r3/J2_new.properties` (neue Keys de/en).

## Offen

- Nicht im Spiel durchgespielt, nur Build und Smoke-Test (`checkGarderobenmarken`). Die Garderobe verlangt jetzt
  alle 7 Nebenräume inklusive der schweren T3-Räume; Balance im Spieltest prüfen.
- Grafik: Tiles des Tresors (`Assets.Environment.CITY_QUEST`), Sprites von Garderobe (`VaultTokenDoorSprite`),
  Spiegel und Anlage sind noch Upstream-Motive.
- Englische Basistexte der bestehenden Vault-Keys sind unverändert (Upstream-Englisch).
