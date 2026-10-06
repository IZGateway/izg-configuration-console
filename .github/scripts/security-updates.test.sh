#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
TEST_ROOT=$(mktemp -d)
trap 'rm -rf "$TEST_ROOT"' EXIT

# Execute the actual cleanup block with real jq and mocked GitHub API calls.
CLEANUP=$(awk '
  /^          BRANCH_REFS=/ { capture = 1 }
  capture && /^        env:/ { exit }
  capture { sub(/^          /, ""); print }
' "$SCRIPT_DIR/../workflows/security-updates.yml")
test -n "$CLEANUP"

export GITHUB_REPOSITORY=IZGateway/izg-configuration-console
export EXPECTED_BRANCH=automated-security-updates-test
export EXPECTED_HEAD_SHA=expected-sha
export API_CALLS="$TEST_ROOT/calls"

gh() {
  printf '%s\n' "$*" >> "$API_CALLS"
  case "$*" in
    "api repos/$GITHUB_REPOSITORY/git/matching-refs/heads/$EXPECTED_BRANCH")
      if [ "$(wc -l < "$API_CALLS")" -eq 1 ]; then
        printf '%s\n' "$INITIAL_REFS"
        return "$LOOKUP_STATUS"
      fi
      printf '%s\n' "$REMAINING_REFS_RESPONSE"
      return "$VERIFY_STATUS"
      ;;
    "api --method DELETE repos/$GITHUB_REPOSITORY/git/refs/heads/$EXPECTED_BRANCH")
      return "$DELETE_STATUS"
      ;;
    *)
      echo "Unexpected GitHub API call: $*" >&2
      return 99
      ;;
  esac
}
export -f gh

run_case() {
  local name="$1"
  export INITIAL_REFS="$2" REMAINING_REFS_RESPONSE="$3"
  export DELETE_STATUS="$4" LOOKUP_STATUS="$5" VERIFY_STATUS="$6"
  local expected_status="$7" expected_message="$8" expected_calls="$9"
  local status=0

  : > "$API_CALLS"
  bash --noprofile --norc -euo pipefail -c "$CLEANUP" \
    > "$TEST_ROOT/output" 2>&1 || status=$?
  if [ "$status" -ne "$expected_status" ] ||
    { [ -n "$expected_message" ] && ! grep -Fq "$expected_message" "$TEST_ROOT/output"; } ||
    [ "$(wc -l < "$API_CALLS")" -ne "$expected_calls" ]; then
    echo "FAIL: $name (exit $status)" >&2
    cat "$TEST_ROOT/output" "$API_CALLS" >&2
    exit 1
  fi
  echo "PASS: $name"
}

MATCHING='[{"ref":"refs/heads/automated-security-updates-test","object":{"sha":"expected-sha"}}]'
CHANGED='[{"ref":"refs/heads/automated-security-updates-test","object":{"sha":"changed-sha"}}]'
PREFIX='[{"ref":"refs/heads/automated-security-updates-test-other","object":{"sha":"expected-sha"}}]'

run_case "successful deletion" "$MATCHING" '[]' 0 0 0 0 \
  "Deleted merged branch: $EXPECTED_BRANCH" 2
run_case "already deleted before lookup" '[]' '[]' 0 0 0 0 \
  "Merged branch is already deleted." 1
run_case "automatic deletion races with DELETE" "$MATCHING" '[]' 1 0 0 0 \
  "Merged branch is already deleted." 3
run_case "failed DELETE leaves branch present" "$MATCHING" "$MATCHING" 1 0 0 1 \
  "::error::Branch cleanup failed; the branch still exists." 3
run_case "branch changed before deletion" "$CHANGED" '[]' 0 0 0 0 \
  "::warning::The branch changed after merging; leaving it intact." 1
run_case "branch changed after failed deletion" "$MATCHING" "$CHANGED" 1 0 0 1 \
  "::error::Branch cleanup failed; the branch still exists." 3
run_case "verification API failure remains fatal" "$MATCHING" '[]' 1 0 42 42 '' 3
run_case "initial lookup API failure remains fatal" '[]' '[]' 0 42 0 42 '' 1
run_case "prefix match is not the deleted branch" "$MATCHING" "$PREFIX" 1 0 0 0 \
  "Merged branch is already deleted." 3
