# Release-Pakete bauen

Ziel: Spielerinnen und Spieler laden eine Datei herunter und spielen, ohne Java und ohne Terminal.
Die Pipeline baut dafür Pakete mit eingebauter Java-Laufzeit (Desktop) und eine APK (Android).

**Sie veröffentlicht nichts.** Es gibt keinen itch.io-Upload und keinen Store-Upload. Von Hand
gestartet liegen alle Ergebnisse nur als Artefakte am Workflow-Lauf und werden nach 14 Tagen
gelöscht. Bei einem Tag `v*` legt der Workflow zusätzlich einen GitHub-Release als **Entwurf** an.
Den sehen nur Personen mit Schreibrecht; öffentlich wird er erst per Klick (siehe
„Release veröffentlichen“).

## Was gebaut wird

| Plattform | Datei | Inhalt |
| --- | --- | --- |
| Linux x64 | `pixel-dungeon-neukoelln-<Version>-linux-x64.tar.gz` | Ordner entpacken, `bin/Pixel-Dungeon-Neukoelln` starten |
| Linux x64 | `…-linux-x64.deb` | Installationspaket für aktuelle Ubuntu/Debian-Versionen (auf dem Runner gebaut, daher Ubuntu-24.04-Paketnamen) |
| Linux x64 | `…-linux-x64.rpm` | Installationspaket für Fedora, openSUSE und andere RPM-Systeme; installiert nach `/opt/pixel-dungeon-neukoelln/`, einzige Abhängigkeit `xdg-utils` |
| Windows x64 | `…-windows-x64.zip` | Ordner entpacken, `Pixel Dungeon Neukölln.exe` starten |
| Windows x64 | `…-windows-x64.msi` | Installer mit Startmenü-Eintrag; nur wenn WiX 3 auf dem Runner installiert werden konnte |
| macOS Apple-Chip | `…-mac-arm64.zip` / `…-mac-arm64.dmg` | App in „Programme“ ziehen |
| macOS Intel | `…-mac-x64.zip` / `.dmg` | nur mit Option „mac_intel“ |
| Android | `…-android.apk` oder `…-android-debugsigniert.apk` | Installation per Datei (Sideloading) |

Jedes Desktop-Paket enthält im obersten Ordner (und zusätzlich im App-Image neben dem JAR, damit
auch in `.deb`/`.rpm`/`.msi`/`.dmg`):

- `LIESMICH.txt` mit Startanleitung und dem Link auf den Quellcode **genau dieses Stands**
  (auf GitHub: Tag bei Tag-Builds, sonst `GITHUB_SHA`; lokal `git describe --tags --always` und
  `git rev-parse HEAD`; überschreibbar mit `NK_SOURCE_REF`/`NK_SOURCE_COMMIT`),
- `LICENSE.txt` (GPLv3), `NOTICE` (Änderungsvermerk nach GPLv3 §5 a),
- `THIRD-PARTY-NOTICES.txt` und `licenses/` (Drittlizenzen, Herkunft in `licenses/QUELLEN.txt`),
- `licenses/java-runtime/` mit `release` und `legal/` der eingebauten Java-Laufzeit.

Das Skript bricht ab, wenn eine dieser Dateien im Archiv fehlt. Baut man aus einem Stand mit nicht
eingecheckten Änderungen, warnt es und schreibt „Nicht verteilen“ in die `LIESMICH.txt`.
Die APK enthält dieselben Dateien (ohne Java-Laufzeit) unter `assets/legal/`; der Workflow prüft das.
Ein Linux-Paket ist rund 90 MB groß (Spiel-JAR mit Musik und nativen Bibliotheken aller Systeme,
dazu eine mit jlink verkleinerte Java-21-Laufzeit von etwa 55 MB).

Technische Kennung: App-Name „Pixel Dungeon Neukölln“, macOS-Bundle-ID `com.codeausberlin.neukoelln`,
Android-`applicationId` `de.neukoellnpixeldungeon.game`, Version aus `build.gradle`
(`appVersionName`, `appVersionCode`). macOS verlangt eine Versionsnummer ab 1, daher trägt das
Mac-Bundle intern `1.0.<appVersionCode>`, solange die Spielversion mit 0 beginnt.

Spielstände liegen getrennt von Shattered Pixel Dungeon:

| System | Ordner |
| --- | --- |
| Linux | `~/.local/share/.neukoellnpixeldungeon/neukoelln-pixel-dungeon/` |
| Windows | `%APPDATA%\.neukoellnpixeldungeon\Neukoelln Pixel Dungeon\` |
| macOS | `~/Library/Application Support/Neukoelln Pixel Dungeon/` |
| Android | App-eigener Speicher von `de.neukoellnpixeldungeon.game` |

Der Ordnername kommt aus `appName` und `appPackageName` in `build.gradle`. Wer sie ändert, verliert
den Zugriff auf alte Spielstände. Der angezeigte Name mit Umlaut steht deshalb separat in
`appDisplayName`.

## Workflow auslösen

Workflow-Datei: `.github/workflows/release-build.yml`. Er läuft **nicht** bei normalen Pushes,
nur in zwei Fällen:

1. **Von Hand:** GitHub → Repository → Reiter *Actions* → links *Release-Build (ohne
   Veroeffentlichung)* → rechts *Run workflow* → Branch wählen → Optionen setzen → *Run workflow*.
   - *installers*: zusätzlich `.deb`, `.rpm`, `.msi`, `.dmg` (Standard: an)
   - *mac_intel*: zusätzlich ein Intel-Mac-Paket (Standard: aus; macOS-Minuten zählen zehnfach)
   - *android*: APK bauen (Standard: an)
2. **Per Tag:** `git tag v0.1.0 && git push origin v0.1.0`. Baut alles mit Standardoptionen.
   Passt der Tag nicht zu `appVersionName`, gibt es eine Warnung, aber keinen Abbruch.

Ein Lauf dauert etwa 10 bis 20 Minuten. Laufen zwei Builds auf demselben Branch, bricht der ältere ab.

## Wo die Ergebnisse liegen

*Actions* → den Lauf anklicken → ganz unten *Artifacts*:
`neukoelln-desktop-Linux-X64`, `neukoelln-desktop-Windows-X64`, `neukoelln-desktop-macOS-ARM64`,
ggf. `neukoelln-desktop-macOS-X64`, `neukoelln-android`. GitHub liefert jedes Artefakt als ZIP;
darin liegen die eigentlichen Dateien. Das Android-Artefakt enthält zusätzlich
`r8-mapping-<Version>.txt`, mit dem sich Absturzberichte des verkleinerten Codes lesen lassen.
Artefakte sind nur für Personen mit Zugriff auf das Repository sichtbar.

## Release veröffentlichen

1. `appVersionName` und `appVersionCode` in `build.gradle` hochzählen (für 0.1.0 schon erledigt),
   auf `main` bringen.
2. Tag setzen und pushen: `git tag v0.1.0 && git push origin v0.1.0`. Alternativ auf GitHub:
   *Releases* → *Draft a new release* → *Choose a tag* → `v0.1.0` eintippen → *Create new tag* →
   Fenster **schließen, ohne zu speichern** (der Tag entsteht erst beim Speichern; dann lieber den
   Befehl nehmen).
3. Der Workflow baut alles und legt danach im Job *Release-Entwurf* unter *Releases* einen Entwurf
   „Pixel Dungeon Neukölln 0.1.0“ an, mit allen Paketen, `SHA256SUMS.txt` und einem deutschen
   Release-Text (Downloads, Warnungen beim ersten Start, Link auf den Quellcode genau dieses Tags).
4. Entwurf öffnen, Text anpassen, Pakete herunterladen und testen, dann *Publish release*.

Der Entwurf entsteht nur, wenn alle Desktop-Jobs und Android grün sind, der Tag zu
`appVersionName` passt und die APK mit dem eigenen Schlüssel signiert ist (nicht `-debugsigniert`).
Die R8-Mapping-Datei kommt nicht in den Release, sie bleibt im Artefakt `neukoelln-android`.
Läuft der Tag-Build erneut, ersetzt er die Dateien eines noch unveröffentlichten Entwurfs; einen
veröffentlichten Release fasst er nicht an. Veröffentlichen setzt ein öffentliches Repository voraus,
sonst sehen nur Mitglieder den Release.

## Android-Signatur einrichten

Ohne Secrets wird die APK mit einem Debug-Schlüssel signiert, den der Runner bei jedem Lauf neu
erzeugt. Folge: Eine neue APK lässt sich **nicht über eine alte installieren**, man muss erst
deinstallieren und verliert dabei den Spielstand. Für Testrunden reicht das, für Spieler nicht.

Einmalig einen eigenen Schlüssel anlegen (lokal, mit JDK):

```
keytool -genkeypair -v -keystore neukoelln-release.keystore -alias neukoelln \
  -keyalg RSA -keysize 4096 -validity 10000
base64 -w0 neukoelln-release.keystore > keystore.b64      # macOS: base64 -i neukoelln-release.keystore -o keystore.b64
```

Dann in GitHub: Repository → *Settings* → *Secrets and variables* → *Actions* →
*New repository secret*, vier Einträge:

| Name | Wert |
| --- | --- |
| `NK_ANDROID_KEYSTORE_BASE64` | Inhalt von `keystore.b64` |
| `NK_ANDROID_KEYSTORE_PASSWORD` | Keystore-Passwort |
| `NK_ANDROID_KEY_ALIAS` | `neukoelln` (bzw. der gewählte Alias) |
| `NK_ANDROID_KEY_PASSWORD` | Schlüssel-Passwort |

Sind alle vier gesetzt, signiert der nächste Lauf mit diesem Schlüssel (Dateiname ohne
`-debugsigniert`). Keystore und Passwörter sicher aufbewahren und nicht einchecken: Geht der
Schlüssel verloren, kann keine spätere Version mehr als Update installiert werden.

Lokal funktioniert dieselbe Signatur über Umgebungsvariablen:
`NK_ANDROID_KEYSTORE_FILE`, `NK_ANDROID_KEYSTORE_PASSWORD`, `NK_ANDROID_KEY_ALIAS`,
`NK_ANDROID_KEY_PASSWORD`, dann `./gradlew android:assembleRelease`.

## Desktop-Paket lokal bauen

Mit einem JDK 21 (enthält `jlink`, `jdeps`, `jpackage`):

```
./gradlew desktop:release
tools/package-desktop.sh               # App-Image + Archiv
tools/package-desktop.sh --installer   # zusätzlich .deb / .rpm / .msi / .dmg
```

Ergebnis in `desktop/build/package/`. Das Skript bestimmt die nötigen Java-Module mit `jdeps`,
baut mit `jlink` eine kleine Laufzeit und packt sie mit `jpackage` zur App. Ein Paket entsteht
immer nur für das System, auf dem das Skript läuft; Windows- und Mac-Pakete baut deshalb der
Workflow. Für `.deb` braucht Linux `fakeroot`, für `.rpm` `rpmbuild` (Paket `rpm` unter Ubuntu, `rpm-build` unter Fedora; fehlt es, wird nur das `.rpm` übersprungen), für `.msi` braucht Windows das WiX Toolset 3.

## Bekannte Warnungen beim Start

Die Pakete sind nicht mit einem kostenpflichtigen Entwicklerzertifikat signiert.

- **Windows:** SmartScreen meldet „Der Computer wurde durch Windows geschützt“. Auf
  *Weitere Informationen* → *Trotzdem ausführen* klicken. Manche Virenscanner schlagen bei
  unbekannten `.exe`-Dateien zusätzlich an.
- **macOS:** „kann nicht geöffnet werden, da Apple es nicht auf Schadsoftware überprüfen kann“.
  App einmal starten, Meldung schließen, dann *Systemeinstellungen* → *Datenschutz & Sicherheit* →
  ganz unten *Dennoch öffnen*. Bis macOS 14 geht auch Rechtsklick auf die App → *Öffnen*.
  Meldet macOS „ist beschädigt“, hilft einmal im Terminal:
  `xattr -dr com.apple.quarantine "/Applications/Pixel Dungeon Neukoelln.app"` (Ordnername auf macOS ohne Umlaut, weil codesign daran scheitert).
  Die App ist nur ad-hoc signiert, nicht notariell beglaubigt.
- **Android:** Installation aus unbekannten Quellen muss für Browser bzw. Dateimanager erlaubt
  werden. Play Protect kann warnen, weil die App nicht aus dem Play Store kommt.

## Was manuell bleibt

- **Veröffentlichen:** Der GitHub-Release bleibt Entwurf, bis der Projektinhaber *Publish release*
  klickt. Andere Plattformen wie itch.io (Browser-Upload oder `butler push`) bleiben Handarbeit; die
  Pipeline enthält dafür keinen Upload-Schritt und keine Zugangsdaten.
- **Testen auf echten Geräten:** Windows, macOS und Android werden im Workflow nur gebaut, nicht
  gestartet. Vor einer Veröffentlichung auf jedem System einmal starten und ein Spiel beginnen.
- **Signaturen mit Zertifikat:** Apple-Notarisierung (Apple-Developer-Konto) und
  Windows-Codesigning (Zertifikat) sind nicht eingerichtet.
- **Quelltext-Hinweis:** Die GPLv3 verlangt, dass der Quelltext zur verteilten Version erreichbar
  ist. Die `LIESMICH.txt` im Paket verlinkt Tag bzw. Commit; das Repository muss öffentlich sein und
  der Tag darf nicht gelöscht werden. Im Release-Text ebenfalls den Tag verlinken. Nur Pakete aus
  Tag-Builds verteilen (dann steht der Tag im Link, nicht nur der Commit).

## Offene Punkte

- Android-Release-Builds binden `services/updates/githubUpdates` und `services/news/shatteredNews`
  noch ein, `AndroidLauncher` setzt beide Dienste aber auf `null` (toter Code, wie auf dem Desktop).
- Die Android-Launcher-Icons (`android/src/{main,debug}/res/mipmap-*`) zeigen das Ortsschild (`tools/generate-kiez-appicon.cjs`), adaptiv mit Hintergrund-, Vordergrund- und Monochrom-Ebene.
- Das Spiel-JAR enthält native Bibliotheken für alle Systeme (rund 23 MB unkomprimiert, die für
  das jeweilige Paket nicht gebraucht werden). Ausdünnen pro Plattform würde die Pakete verkleinern.
