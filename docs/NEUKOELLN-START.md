# Pixel Dungeon Neukölln lokal starten

## Einmalig: Java

JDK 17 oder neuer (ein JDK mit `javac`, eine reine Java-Laufzeit reicht nicht), getestet mit 21. Auf dem Mac am einfachsten den Installer von
adoptium.net (Temurin 21, macOS, aarch64 für Apple-Chips, x64 für Intel, Pakettyp JDK,
`.pkg`). Danach in einem neuen Terminal prüfen: `java -version`.

## Spiel bauen und starten

```
git clone https://github.com/codeausberlin/shattered-neukoelln-dungeon.git
cd shattered-neukoelln-dungeon
git checkout neukoelln/prototype
./start-neukoelln.sh --build
```

`--build` nur nach einem Update des Branches (`git pull`), sonst reicht `./start-neukoelln.sh`.
Auf dem Mac startet sich das Spiel beim Öffnen einmal selbst neu; das ist normal.

## Testmodus: direkt auf eine Ebene springen

Nur in der Entwicklerversion (Anzeige "INDEV" oben rechts):

```
NK_START_DEPTH=11 ./gradlew desktop:debug
```

Ein neues Spiel beginnt dann auf der angegebenen Ebene (1-26). Die vorherigen Ebenen werden
im Hintergrund regulär erzeugt, der Held startet aber auf Stufe 1 ohne Ausrüstung. Zum
Anschauen von Regionen und Gegnern gedacht, nicht zum fairen Durchspielen.

| Ebene | Was dort zu sehen ist |
| --- | --- |
| 1-5 | Hinterhof-Tileset, Pfandratte, Kabelschlange; ab 2 Leihscooter und Herr Fuß, ab 3 Pfandgolem; Boss auf 5: Mietschimmel |
| 6 | Späti-Ebene, Amt-Tileset, Makler |
| 11 | Späti-Ebene, Baustellen-Tileset, Presslufter |
| 16 | Späti-Ebene, Renditequartier, Luxussanierer |
| 21 | Unter dem Rathaus, Hausordnungs-Hydra |

## Spielstände

Getrennt von Shattered Pixel Dungeon, auf dem Mac unter
`~/Library/Application Support/Neukoelln Pixel Dungeon/`. Zum kompletten Neustart den
Ordner umbenennen.

## Pakete ohne Java-Installation

Spielfertige Pakete für Windows, macOS, Linux und Android baut der Workflow
`Release-Build`; Anleitung in [NEUKOELLN-RELEASE.md](NEUKOELLN-RELEASE.md).
