#!/usr/bin/env bash
# Packt das Desktop-JAR als eigenstaendige App mit gebuendelter Java-Laufzeit (jlink + jpackage).
# Spielerinnen und Spieler brauchen danach weder Java noch ein Terminal.
#
# Voraussetzung: ein JDK 21 (mit jlink, jdeps, jpackage) und ein fertiges Release-JAR:
#   ./gradlew desktop:release
#   tools/package-desktop.sh                 # Linux: .tar.gz; Windows: .zip; macOS: .zip
#   tools/package-desktop.sh --installer     # zusaetzlich .deb (Linux), .msi (Windows, braucht WiX 3), .dmg (macOS)
#
# Optionen:
#   --jar PFAD        Release-JAR (Standard: desktop/build/libs/desktop-<Version>.jar)
#   --out ORDNER      Ausgabeordner (Standard: desktop/build/package)
#   --installer       zusaetzlich das Installationspaket der Plattform bauen
#   --skip-archive    nur das App-Image erzeugen, nicht packen
#
# Umgebungsvariablen:
#   JAVA_HOME         JDK fuer jlink/jdeps/jpackage (sonst aus PATH)
#   NK_APP_NAME       angezeigter App-Name (Standard: "Neukölln Pixel Dungeon")
#   NK_REPO_URL       Repository fuer das Quellcode-Angebot (Standard: GitHub-Repo des Laufs bzw.
#                     https://github.com/codeausberlin/shattered-neukoelln-dungeon)
#   NK_SOURCE_REF     Git-Tag oder Commit, der in LIESMICH.txt verlinkt wird (Standard: auf GitHub
#                     der Tag bzw. GITHUB_SHA, lokal `git describe --tags --always`)
#   NK_SOURCE_COMMIT  vollstaendiger Commit-Hash dazu (Standard: GITHUB_SHA bzw. `git rev-parse HEAD`)
#
# Jedes Paket enthaelt LICENSE.txt (GPLv3), NOTICE (Aenderungsvermerk), THIRD-PARTY-NOTICES.txt,
# licenses/ (Drittlizenzen und licenses/java-runtime/ mit den Hinweisen der eingebauten Java-Laufzeit)
# und LIESMICH.txt mit dem Link auf den Quellcode genau dieses Stands.
#
# Laeuft unter Linux, macOS und Windows (Git Bash, wie auf den GitHub-Runnern).
# Veroeffentlicht nichts; alle Ergebnisse landen im Ausgabeordner.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

APP_NAME="${NK_APP_NAME:-Neukölln Pixel Dungeon}"
FILE_BASE="neukoelln-pixel-dungeon"
BUNDLE_ID="com.codeausberlin.neukoelln"
VENDOR="Code aus Berlin"
# Feste UUID, damit spaetere .msi-Versionen die alte Installation ersetzen statt daneben zu landen.
WIN_UPGRADE_UUID="5b0f4d7e-9c1a-4e2b-8f3d-6a7c9e1b2d40"
MAIN_CLASS="com.shatteredpixel.shatteredpixeldungeon.desktop.DesktopLauncher"
# Die Module, die Upstream (desktop/build.gradle, runtime-Block) ausliefert; jdeps ergaenzt, was fehlt.
BASE_MODULES="java.base,java.desktop,jdk.unsupported,jdk.crypto.cryptoki,jdk.management"

JAR=""
OUT="desktop/build/package"
INSTALLER=0
ARCHIVE=1
while [[ $# -gt 0 ]]; do
    case "$1" in
        --jar) JAR="$2"; shift 2 ;;
        --out) OUT="$2"; shift 2 ;;
        --installer) INSTALLER=1; shift ;;
        --skip-archive) ARCHIVE=0; shift ;;
        -h|--help) sed -n '2,32p' "$0"; exit 0 ;;
        *) echo "Unbekannte Option: $1" >&2; exit 2 ;;
    esac
done

VERSION_NAME="$(sed -n "s/^[[:space:]]*appVersionName[[:space:]]*=[[:space:]]*'\([^']*\)'.*/\1/p" build.gradle | head -n1)"
VERSION_CODE="$(sed -n 's/^[[:space:]]*appVersionCode[[:space:]]*=[[:space:]]*\([0-9]*\).*/\1/p' build.gradle | head -n1)"
if [[ -z "$VERSION_NAME" || -z "$VERSION_CODE" ]]; then
    echo "appVersionName/appVersionCode nicht in build.gradle gefunden." >&2
    exit 1
fi
JAR="${JAR:-desktop/build/libs/desktop-${VERSION_NAME}.jar}"
if [[ ! -f "$JAR" ]]; then
    echo "Release-JAR fehlt: $JAR  (zuerst ./gradlew desktop:release)" >&2
    exit 1
fi

case "$(uname -s)" in
    Linux*) OS=linux ;;
    Darwin*) OS=mac ;;
    MINGW*|MSYS*|CYGWIN*) OS=windows ;;
    *) echo "Nicht unterstuetztes System: $(uname -s)" >&2; exit 1 ;;
esac
# Auf Linux startet ein Paket mit Umlaut im Ordnernamen ohne UTF-8-Locale nicht
# ("Error loading java.security file"). Deshalb dort ein ASCII-Name fuer Ordner und Starter.
if [[ "$OS" == linux && -z "${NK_APP_NAME:-}" ]]; then
    APP_NAME="Neukoelln-Pixel-Dungeon"
fi
# Der Umlaut im App-Namen braucht auf Linux eine UTF-8-Locale, sonst lehnt jpackage den Namen ab.
if [[ "$OS" == linux ]] && ! locale 2>/dev/null | grep -qi 'utf-\?8'; then
    export LC_ALL=C.UTF-8
fi
case "$(uname -m)" in
    x86_64|amd64) ARCH=x64 ;;
    arm64|aarch64) ARCH=arm64 ;;
    *) ARCH="$(uname -m)" ;;
esac

tool() {
    local t="$1"
    if [[ -n "${JAVA_HOME:-}" ]]; then
        if [[ -x "$JAVA_HOME/bin/$t" ]]; then echo "$JAVA_HOME/bin/$t"; return; fi
        if [[ -x "$JAVA_HOME/bin/$t.exe" ]]; then echo "$JAVA_HOME/bin/$t.exe"; return; fi
    fi
    command -v "$t" || { echo "$t nicht gefunden (JDK 21 mit jpackage noetig, JAVA_HOME setzen)." >&2; exit 1; }
}
JLINK="$(tool jlink)"; JDEPS="$(tool jdeps)"; JPACKAGE="$(tool jpackage)"

# jpackage will numerische Versionen; macOS verlangt eine erste Stelle >= 1.
APP_VERSION="$(printf '%s' "$VERSION_NAME" | grep -oE '^[0-9]+(\.[0-9]+){0,2}')"
if [[ "$OS" == mac && "${APP_VERSION%%.*}" == 0 ]]; then
    APP_VERSION="1.0.${VERSION_CODE}"
fi

# Quellcode-Angebot (GPLv3 §6): genau den gebauten Stand verlinken, nicht nur die Repo-Startseite.
REPO_URL="${NK_REPO_URL:-}"
if [[ -z "$REPO_URL" && -n "${GITHUB_SERVER_URL:-}" && -n "${GITHUB_REPOSITORY:-}" ]]; then
    REPO_URL="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY"
fi
REPO_URL="${REPO_URL:-https://github.com/codeausberlin/shattered-neukoelln-dungeon}"
SRC_REF="${NK_SOURCE_REF:-}"
SRC_COMMIT="${NK_SOURCE_COMMIT:-}"
SRC_TAG=""
SRC_DIRTY=0
if [[ -n "$SRC_REF" ]]; then
    :
elif [[ -n "${GITHUB_SHA:-}" ]]; then
    SRC_COMMIT="$GITHUB_SHA"
    if [[ "${GITHUB_REF_TYPE:-}" == tag ]]; then
        SRC_REF="$GITHUB_REF_NAME"; SRC_TAG="$GITHUB_REF_NAME"
    else
        SRC_REF="$GITHUB_SHA"
    fi
elif git rev-parse --git-dir >/dev/null 2>&1; then
    SRC_REF="$(git describe --tags --always)"
    SRC_COMMIT="$(git rev-parse HEAD)"
    SRC_TAG="$(git describe --tags --exact-match 2>/dev/null || true)"
    git diff --quiet HEAD -- 2>/dev/null || SRC_DIRTY=1
fi
# Ein von aussen gesetzter Tag (NK_SOURCE_REF=v0.1.0) gilt als Tag; `git describe`-Ausgaben wie
# v0.1.0-3-gabc1234 sind keine gueltige Adresse und werden ueber den Commit verlinkt.
if [[ -z "$SRC_TAG" && -n "$SRC_REF" && "$SRC_REF" =~ ^v[0-9] && ! "$SRC_REF" =~ -g[0-9a-f]+$ ]]; then
    SRC_TAG="$SRC_REF"
fi
if [[ -n "$SRC_TAG" ]]; then
    SRC_URL="$REPO_URL/tree/$SRC_TAG"
elif [[ -n "$SRC_COMMIT" ]]; then
    SRC_URL="$REPO_URL/tree/$SRC_COMMIT"
elif [[ -n "$SRC_REF" ]]; then
    SRC_URL="$REPO_URL/tree/$SRC_REF"
else
    SRC_URL="$REPO_URL"
    echo "WARNUNG: Git-Stand unbekannt (kein Git, kein GITHUB_SHA, kein NK_SOURCE_REF)." >&2
    echo "         LIESMICH.txt verlinkt nur das Repository. Dieses Paket nicht veroeffentlichen." >&2
fi
if [[ "$SRC_DIRTY" == 1 ]]; then
    echo "WARNUNG: Arbeitsverzeichnis hat nicht eingecheckte Aenderungen; der verlinkte Commit" >&2
    echo "         entspricht nicht genau diesem Paket. Nicht veroeffentlichen." >&2
fi
echo "== Quellcode-Link: $SRC_URL"

# Lizenz- und Hinweisdateien, die in jedes Paket gehoeren.
LEGAL_FILES=(LICENSE.txt NOTICE THIRD-PARTY-NOTICES.txt)
for f in "${LEGAL_FILES[@]}" licenses; do
    [[ -e "$f" ]] || { echo "Lizenzdatei fehlt im Repo: $f" >&2; exit 1; }
done

WORK="$OUT/work"
rm -rf "$WORK"
mkdir -p "$WORK/input" "$WORK/legal" "$OUT"
cp "$JAR" "$WORK/input/$FILE_BASE.jar"
cp "${LEGAL_FILES[@]}" "$WORK/legal/"
cp -R licenses "$WORK/legal/licenses"

echo "== Module ermitteln (jdeps)"
DEPS="$("$JDEPS" --ignore-missing-deps --print-module-deps --multi-release 21 "$JAR" 2>/dev/null | tail -n1)"
MODULES="$(printf '%s,%s' "$BASE_MODULES" "$DEPS" | tr ',' '\n' | sed '/^$/d' | sort -u | paste -sd, -)"
echo "   $MODULES"

echo "== Laufzeit bauen (jlink)"
"$JLINK" --add-modules "$MODULES" \
    --strip-debug --no-header-files --no-man-pages --strip-native-commands \
    --compress=zip-6 --output "$WORK/runtime"

# Hinweise der eingebauten Java-Laufzeit (GPLv2 mit Classpath Exception, Drittkomponenten je Modul)
# zusaetzlich sichtbar unter licenses/java-runtime/ ablegen; Symlinks aufloesen (Windows-ZIP).
if [[ ! -d "$WORK/runtime/legal" ]]; then
    echo "jlink-Laufzeit ohne legal/-Ordner; Lizenzhinweise der Java-Laufzeit fehlen." >&2
    exit 1
fi
mkdir -p "$WORK/legal/licenses/java-runtime"
cp -RL "$WORK/runtime/legal" "$WORK/legal/licenses/java-runtime/legal"
cp "$WORK/runtime/release" "$WORK/legal/licenses/java-runtime/release"
# Die Lizenzdateien liegen auch im App-Image neben dem JAR (und damit in .deb/.msi/.dmg).
cp -R "$WORK/legal/." "$WORK/input/"

ICON=desktop/src/main/assets/icons/icon_256.png
JAVA_OPTS=(--java-options "-XX:+IgnoreUnrecognizedVMOptions")
PLATFORM_OPTS=()
case "$OS" in
    windows) ICON=desktop/src/main/assets/icons/windows.ico ;;
    mac)
        ICON=desktop/src/main/assets/icons/mac.icns
        JAVA_OPTS+=(--java-options "-XstartOnFirstThread")
        PLATFORM_OPTS+=(--mac-package-identifier "$BUNDLE_ID" --mac-package-name "Neukölln PD")
        ;;
esac

COMMON=(
    --name "$APP_NAME"
    --app-version "$APP_VERSION"
    --vendor "$VENDOR"
    --copyright "GPLv3. Basiert auf Shattered Pixel Dungeon (c) Evan Debenham und Pixel Dungeon (c) Oleg Dolya."
    --description "Deutschsprachiger Fan-Fork von Shattered Pixel Dungeon"
    --icon "$ICON"
    --runtime-image "$WORK/runtime"
    "${JAVA_OPTS[@]}"
    "${PLATFORM_OPTS[@]}"
)

echo "== App-Image bauen (jpackage)"
rm -rf "$WORK/image"
"$JPACKAGE" --type app-image --dest "$WORK/image" \
    --input "$WORK/input" --main-jar "$FILE_BASE.jar" --main-class "$MAIN_CLASS" \
    "${COMMON[@]}"

if [[ "$OS" == mac ]]; then
    IMAGE="$WORK/image/$APP_NAME.app"
    # Ohne Apple-Zertifikat: ad-hoc signieren, sonst starten arm64-Programme gar nicht.
    # Gatekeeper warnt trotzdem (nicht notariell beglaubigt), siehe LIESMICH.txt.
    codesign --force --deep --sign - "$IMAGE"
else
    IMAGE="$WORK/image/$APP_NAME"
fi

cat > "$WORK/LIESMICH.txt" <<EOF
$APP_NAME $VERSION_NAME

Inoffizieller deutschsprachiger Fan-Fork von Shattered Pixel Dungeon (GPLv3).
Java muss nicht installiert sein, die Laufzeit ist enthalten.

Quellcode genau dieser Version:
  $SRC_URL
  (Git-Stand ${SRC_REF:-unbekannt}${SRC_COMMIT:+, Commit $SRC_COMMIT})
Repository: $REPO_URL

Linux:   Ordner entpacken, darin bin/$APP_NAME starten.
Windows: Ordner entpacken, darin "$APP_NAME.exe" starten.
         Meldet Windows "Der Computer wurde durch Windows geschuetzt":
         "Weitere Informationen" > "Trotzdem ausfuehren". Die App ist nicht signiert.
macOS:   App in "Programme" ziehen und einmal per Doppelklick starten; die Warnung schliessen.
         Dann Systemeinstellungen > Datenschutz & Sicherheit > ganz unten "Dennoch oeffnen".
         (Bis macOS 14 geht auch: Rechtsklick auf die App > "Oeffnen" > "Oeffnen".)
         Meldet macOS "ist beschaedigt": im Terminal einmal
           xattr -dr com.apple.quarantine "/Applications/$APP_NAME.app"
         Die App ist nicht notariell beglaubigt, daher diese Warnungen.

Spielstaende liegen getrennt von Shattered Pixel Dungeon.

Lizenz: GNU General Public License v3 oder spaeter, siehe LICENSE.txt. Ohne jede Gewaehrleistung.
Aenderungsvermerk gegenueber Shattered Pixel Dungeon: NOTICE.
Mitgelieferte Bibliotheken, Schriften, Soundsamples und die Java-Laufzeit: THIRD-PARTY-NOTICES.txt
und Ordner licenses/ (Hinweise der Java-Laufzeit unter licenses/java-runtime/).
EOF
if [[ "$SRC_DIRTY" == 1 ]]; then
    printf '\nACHTUNG: Testbau aus einem Stand mit nicht eingecheckten Aenderungen. Nicht verteilen.\n' >> "$WORK/LIESMICH.txt"
fi

PKG_BASE="$FILE_BASE-$VERSION_NAME-$OS-$ARCH"
if [[ "$ARCHIVE" == 1 ]]; then
    echo "== Archiv packen"
    STAGE="$WORK/stage"
    rm -rf "$STAGE"; mkdir -p "$STAGE"
    case "$OS" in
        linux)
            cp -a "$IMAGE" "$STAGE/"
            cp "$WORK/LIESMICH.txt" "$STAGE/$APP_NAME/"
            cp -R "$WORK/legal/." "$STAGE/$APP_NAME/"
            tar -C "$STAGE" -czf "$OUT/$PKG_BASE.tar.gz" "$APP_NAME"
            ;;
        windows)
            cp -r "$IMAGE" "$STAGE/"
            cp "$WORK/LIESMICH.txt" "$STAGE/$APP_NAME/"
            cp -R "$WORK/legal/." "$STAGE/$APP_NAME/"
            rm -f "$OUT/$PKG_BASE.zip"
            ( cd "$STAGE" && powershell.exe -NoProfile -Command \
                "Compress-Archive -Path '$APP_NAME' -DestinationPath '$PKG_BASE.zip'" )
            mv "$STAGE/$PKG_BASE.zip" "$OUT/"
            ;;
        mac)
            mkdir -p "$STAGE/$APP_NAME"
            cp -R "$IMAGE" "$STAGE/$APP_NAME/"
            cp "$WORK/LIESMICH.txt" "$STAGE/$APP_NAME/"
            cp -R "$WORK/legal/." "$STAGE/$APP_NAME/"
            ditto -c -k --sequesterRsrc --keepParent "$STAGE/$APP_NAME" "$OUT/$PKG_BASE.zip"
            ;;
    esac
    echo "== Lizenzdateien im Archiv pruefen"
    case "$OS" in
        linux) LISTING="$(tar -tzf "$OUT/$PKG_BASE.tar.gz")" ;;
        *) LISTING="$(unzip -Z1 "$OUT/$PKG_BASE.zip" 2>/dev/null || true)" ;;
    esac
    # Pfade relativ zum obersten Ordner (Windows-ZIPs koennen Backslashes enthalten).
    LISTING="$(printf '%s\n' "$LISTING" | tr '\\' '/' | sed 's#^[^/]*/##')"
    if [[ -n "$LISTING" ]]; then
        for f in LIESMICH.txt LICENSE.txt NOTICE THIRD-PARTY-NOTICES.txt licenses/Apache-2.0.txt \
                 licenses/java-runtime/release licenses/java-runtime/legal/java.base/LICENSE; do
            grep -qxF "$f" <<<"$LISTING" || { echo "Fehlt im Archiv: $f" >&2; exit 4; }
        done
        echo "   ok"
    else
        echo "   (unzip nicht verfuegbar, Pruefung uebersprungen)"
    fi
fi

if [[ "$INSTALLER" == 1 ]]; then
    echo "== Installationspaket bauen"
    INST_OPTS=()
    case "$OS" in
        linux) TYPE=deb; INST_OPTS=(--linux-package-name "$FILE_BASE" --linux-shortcut
                                    --linux-menu-group "Game" --linux-app-category games) ;;
        windows) TYPE=msi; INST_OPTS=(--win-menu --win-shortcut --win-dir-chooser
                                      --win-menu-group "$APP_NAME" --win-upgrade-uuid "$WIN_UPGRADE_UUID"
                                      --license-file LICENSE.txt) ;;
        mac) TYPE=dmg; INST_OPTS=(--license-file LICENSE.txt) ;;
    esac
    rm -rf "$WORK/installer"
    "$JPACKAGE" --type "$TYPE" --dest "$WORK/installer" --app-image "$IMAGE" \
        --name "$APP_NAME" --app-version "$APP_VERSION" --vendor "$VENDOR" \
        --copyright "GPLv3. Basiert auf Shattered Pixel Dungeon (c) Evan Debenham." \
        --description "Deutschsprachiger Fan-Fork von Shattered Pixel Dungeon" \
        "${PLATFORM_OPTS[@]}" "${INST_OPTS[@]}"
    shopt -s nullglob
    BUILT=("$WORK/installer"/*)
    shopt -u nullglob
    if [[ ${#BUILT[@]} -eq 0 ]]; then
        echo "Installationspaket ($TYPE) wurde nicht erzeugt, siehe jpackage-Meldung oben." >&2
        exit 3
    fi
    for f in "${BUILT[@]}"; do
        mv "$f" "$OUT/$PKG_BASE.${f##*.}"
    done
fi

echo "== Fertig"
echo "App-Image: $IMAGE"
ls -l "$OUT"/"$FILE_BASE"-*
