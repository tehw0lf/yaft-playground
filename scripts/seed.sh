#!/usr/bin/env bash
#
# Creates the feature toggles the playground renders, and writes the UUID and
# secret to src/environments/seed.json for the app to pick up.
#
# Timestamps are computed at seed time rather than hardcoded, so a window that
# is meant to be open is open whenever this runs.
set -euo pipefail

cd "$(dirname "$0")/.."

API_URL="${API_URL:-http://127.0.0.1:8080}"
OUT="src/environments/seed.json"

post() {
  curl -sf -X POST "${API_URL}/features" -H 'Content-Type: application/json' -d "$1"
}

iso() {
  # RFC 3339 with an offset, the only format the backend and the library
  # accept. GNU date; the CI runner and the dev machines are Linux.
  date -u -d "$1" +"%Y-%m-%dT%H:%M:%SZ"
}

echo "seeding ${API_URL}"

# The first toggle of a group is the only call that returns a secret, and it
# is what creates the UUID every later call has to carry.
first="$(post '{"Key":"alwaysOn","Value":"true"}')"
key="$(printf '%s' "$first" | sed -n 's/.*"key":"\([^"]*\)".*/\1/p')"
secret="$(printf '%s' "$first" | sed -n 's/.*"secret":"\([^"]*\)".*/\1/p')"
uuid="${key%%|*}"

if [ -z "$uuid" ] || [ -z "$secret" ]; then
  echo "error: could not read uuid/secret from: $first" >&2
  exit 1
fi

add() {
  local name="$1" value="$2" active="$3" disabled="$4"
  local body
  body="$(printf '{"Key":"%s|%s","Value":"%s","Secret":"%s"' "$uuid" "$name" "$value" "$secret")"
  [ -n "$active" ] && body="${body}$(printf ',"ActiveAt":"%s"' "$active")"
  [ -n "$disabled" ] && body="${body}$(printf ',"DisabledAt":"%s"' "$disabled")"
  body="${body}}"
  post "$body" >/dev/null
  echo "  $name"
}

echo "  alwaysOn"
add alwaysOff        false ""                     ""
# The cases that only a real backend can prove: the library evaluates these
# bounds itself and must agree with what the backend stored.
add notYetActive     true  "$(iso 'now + 1 year')" ""
add alreadyDisabled  true  ""                      "$(iso 'now - 1 day')"
add insideWindow     true  "$(iso 'now - 1 day')"  "$(iso 'now + 1 year')"
add outsideWindow    true  "$(iso 'now + 1 year')" "$(iso 'now + 2 years')"

mkdir -p "$(dirname "$OUT")"
cat > "$OUT" <<JSON
{
  "apiUrl": "${API_URL}",
  "uuid": "${uuid}",
  "secret": "${secret}"
}
JSON

echo "wrote ${OUT} (uuid ${uuid})"
