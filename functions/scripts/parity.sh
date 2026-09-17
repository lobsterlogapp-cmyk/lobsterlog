#!/bin/bash
# S170 Phase 3 — parity runner.
#
# Makes a THROWAWAY RSA keypair in a temp folder, runs the parity test with it,
# then deletes the folder — whatever the outcome.
#
# ⚠ The real keys in ~/Documents/LobsterLog_KEYS are NEVER read by this script.
# ⚠ The throwaway key is never printed and never leaves the temp folder.

set -u
cd "$(dirname "$0")/.." || exit 1

TMP="$(mktemp -d "${TMPDIR:-/tmp}/s170-throwaway-XXXXXX")"
cleanup() {
  rm -rf "$TMP"
  echo
  echo "throwaway key folder deleted: $TMP"
  if [ -e "$TMP" ]; then echo "⚠⚠ DELETION FAILED"; else echo "confirmed gone ✓"; fi
}
trap cleanup EXIT

echo "== generating a THROWAWAY 2048-bit RSA key in $TMP =="
openssl genrsa -out "$TMP/throwaway.pem" 2048 2>/dev/null
if [ ! -s "$TMP/throwaway.pem" ]; then echo "key generation failed"; exit 1; fi
echo "generated (contents never printed)"

echo
echo "== proving it is NOT one of the real keys =="
for real in "$HOME/Documents/LobsterLog_KEYS/"*.pem; do
  [ -e "$real" ] || continue
  if cmp -s "$TMP/throwaway.pem" "$real"; then
    echo "⚠⚠ ABORT: throwaway matches $real"; exit 1
  fi
done
echo "differs from every file in ~/Documents/LobsterLog_KEYS ✓ (compared, never read out)"

echo
echo "== running the FULL suite (entitlement + signer parity) =="
S170_THROWAWAY_KEY="$(cat "$TMP/throwaway.pem")" \
S170_THROWAWAY_KEY_PATH="$TMP/throwaway.pem" \
  node --test test/*.test.js
STATUS=$?

exit $STATUS
