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

if [[ "${1:-}" == "--build" || ! -f desktop/build/libs/desktop-0.1.0.jar ]]; then
    ./gradlew desktop:release --console=plain
fi

exec "${JAVA_HOME:+$JAVA_HOME/bin/}java" -jar desktop/build/libs/desktop-0.1.0.jar
