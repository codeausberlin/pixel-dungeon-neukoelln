#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

if [[ -z "${JAVA_HOME:-}" ]]; then
    for kiez_jdk in "$PWD"/.local-tools/jdk-*; do
        if [[ -x "$kiez_jdk/bin/javac" ]]; then
            export JAVA_HOME="$kiez_jdk"
            break
        fi
    done
fi

# Gradle needs a full JDK (with javac), a plain Java runtime is not enough.
if [[ -z "${JAVA_HOME:-}" ]] && ! command -v javac >/dev/null 2>&1; then
    for kiez_jdk in /usr/lib/jvm/*/ /Library/Java/JavaVirtualMachines/*/Contents/Home/; do
        if [[ -x "${kiez_jdk}bin/javac" ]]; then
            export JAVA_HOME="${kiez_jdk%/}"
        fi
    done
fi
if [[ -n "${JAVA_HOME:-}" && ! -x "$JAVA_HOME/bin/javac" ]] || { [[ -z "${JAVA_HOME:-}" ]] && ! command -v javac >/dev/null 2>&1; }; then
    cat >&2 <<'MSG'
Es fehlt ein Java-Entwicklungspaket (JDK mit javac). Installiert ist nur eine Java-Laufzeit.
Bitte ein JDK 17 oder neuer installieren, zum Beispiel:
  Arch/Manjaro:   sudo pacman -S jdk21-openjdk
  Debian/Ubuntu:  sudo apt install openjdk-21-jdk
  Fedora:         sudo dnf install java-25-openjdk-devel  (Version wie die installierte Java-Laufzeit)
  macOS:          Temurin 21 (Pakettyp JDK) von adoptium.net
Danach dieses Skript erneut starten.
MSG
    exit 1
fi

if [[ "${1:-}" == "--build" || ! -f desktop/build/libs/desktop-0.1.0.jar ]]; then
    ./gradlew desktop:release --console=plain
fi

exec "${JAVA_HOME:+$JAVA_HOME/bin/}java" -jar desktop/build/libs/desktop-0.1.0.jar
