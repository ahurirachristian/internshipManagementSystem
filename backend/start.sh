#!/usr/bin/env bash
# Start the backend. Java is not on PATH on this machine, so this sets JAVA_HOME
# to the installed JDK before invoking the Maven wrapper.
#
# Usage (from anywhere):
#   backend/start.sh spring-boot:run                          # dev profile (H2, default)
#   backend/start.sh spring-boot:run -Dspring-boot.run.profiles=mysql
#   backend/start.sh test
set -e

export JAVA_HOME="${JAVA_HOME:-$HOME/.local/jdks/jdk-17.0.13+11}"

cd "$(dirname "$0")"
exec ./mvnw "$@"
