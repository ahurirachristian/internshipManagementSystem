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

# Export backend/.env into the environment as a convenience for shell runs.
# Since springboot4-dotenv (pom.xml) was added, the spring.config.import line also
# loads .env natively on every OS/IDE; where both apply, real env vars (exported here)
# simply outrank the file — standard Spring precedence, no conflict.
# Line-by-line parse: safe for values containing '&', skips comments/blanks, strips CR,
# never evaluates values as shell code.
if [ -f .env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line=${line%$'\r'}
    case "$line" in ''|\#*) continue ;; esac
    key=${line%%=*}
    val=${line#*=}
    case "$val" in \"*\") val=${val#\"}; val=${val%\"} ;; \'*\') val=${val#\'}; val=${val%\'} ;; esac
    [ -n "$key" ] && export "$key=$val"
  done < .env
fi

exec ./mvnw "$@"
