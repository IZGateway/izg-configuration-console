#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
VALIDATOR="${SCRIPT_DIR}/validate-release.sh"
TEST_ROOT=$(mktemp -d)
trap 'rm -rf "$TEST_ROOT"' EXIT

REMOTE="${TEST_ROOT}/remote.git"
WORK="${TEST_ROOT}/work"
OUTPUT="${TEST_ROOT}/github-output"
MARKER="${TEST_ROOT}/injection-marker"

git init --quiet --bare "$REMOTE"
git init --quiet --initial-branch=main "$WORK"
cd "$WORK"
git config user.name "Release Validation Test"
git config user.email "release-validation@example.invalid"
git commit --quiet --allow-empty -m "Initial main"
git remote add origin "$REMOTE"
git push --quiet --set-upstream origin main
git tag v1.18.0
git push --quiet origin v1.18.0

git checkout --quiet -b develop
git commit --quiet --allow-empty -m "Develop"
git push --quiet --set-upstream origin develop

git checkout --quiet -b release/1.18.2
git push --quiet --set-upstream origin release/1.18.2

git checkout --quiet main
git checkout --quiet -b hotfix/1.18.3
git commit --quiet --allow-empty -m "Valid hotfix"
git push --quiet --set-upstream origin hotfix/1.18.3

git checkout --quiet --orphan hotfix/1.18.4
git commit --quiet --allow-empty -m "Unrelated hotfix"
git push --quiet --set-upstream origin hotfix/1.18.4

remote_state() {
  git ls-remote --heads --tags origin | sort
}

run_validation() {
  : > "$OUTPUT"
  env REMOTE_NAME=origin GITHUB_OUTPUT="$OUTPUT" "$@" bash "$VALIDATOR"
}

expect_success() {
  local name="$1"
  local expected_branch="$2"
  shift 2

  if ! run_validation "$@" >"${TEST_ROOT}/stdout" 2>"${TEST_ROOT}/stderr"; then
    echo "FAIL: $name should succeed" >&2
    cat "${TEST_ROOT}/stderr" >&2
    exit 1
  fi
  grep -qx "release_branch=${expected_branch}" "$OUTPUT"
  echo "PASS: $name"
}

expect_failure() {
  local name="$1"
  local expected_message="$2"
  shift 2
  local before
  local after

  before=$(remote_state)
  if run_validation "$@" >"${TEST_ROOT}/stdout" 2>"${TEST_ROOT}/stderr"; then
    echo "FAIL: $name should fail" >&2
    exit 1
  fi
  grep -Fq "$expected_message" "${TEST_ROOT}/stderr"
  after=$(remote_state)
  if [[ "$before" != "$after" ]]; then
    echo "FAIL: $name changed remote refs" >&2
    exit 1
  fi
  echo "PASS: $name"
}

git checkout --quiet develop
expect_success "valid standard release" "release/1.18.1" \
  RELEASE_TYPE=standard RELEASE_VERSION=1.18.1 APP_VERSION=1.19.0 \
  CURRENT_BRANCH=develop DEVELOP_BRANCH=develop MAIN_BRANCH=main
expect_failure "unknown release type" "must be 'standard' or 'hotfix'" \
  RELEASE_TYPE=preview RELEASE_VERSION=1.18.1 APP_VERSION= \
  CURRENT_BRANCH=develop DEVELOP_BRANCH=develop MAIN_BRANCH=main
expect_failure "malformed release version" "must be in X.Y.Z format" \
  RELEASE_TYPE=standard RELEASE_VERSION=1.18 APP_VERSION= \
  CURRENT_BRANCH=develop DEVELOP_BRANCH=develop MAIN_BRANCH=main
expect_failure "leading-zero release version" "must be in X.Y.Z format" \
  RELEASE_TYPE=standard RELEASE_VERSION=01.18.1 APP_VERSION= \
  CURRENT_BRANCH=develop DEVELOP_BRANCH=develop MAIN_BRANCH=main
expect_failure "malformed app version" "must be in X.Y.Z format" \
  RELEASE_TYPE=standard RELEASE_VERSION=1.18.1 APP_VERSION=1.19 \
  CURRENT_BRANCH=develop DEVELOP_BRANCH=develop MAIN_BRANCH=main
expect_failure "existing tag" "Tag 'v1.18.0' already exists" \
  RELEASE_TYPE=standard RELEASE_VERSION=1.18.0 APP_VERSION= \
  CURRENT_BRANCH=develop DEVELOP_BRANCH=develop MAIN_BRANCH=main
expect_failure "release not newer than latest tag" "must be newer than latest tag" \
  RELEASE_TYPE=standard RELEASE_VERSION=1.17.9 APP_VERSION= \
  CURRENT_BRANCH=develop DEVELOP_BRANCH=develop MAIN_BRANCH=main
expect_failure "app version not newer than release" "must be newer than release-version" \
  RELEASE_TYPE=standard RELEASE_VERSION=1.18.1 APP_VERSION=1.18.1 \
  CURRENT_BRANCH=develop DEVELOP_BRANCH=develop MAIN_BRANCH=main
expect_failure "standard release from wrong branch" "must be triggered from 'develop'" \
  RELEASE_TYPE=standard RELEASE_VERSION=1.18.1 APP_VERSION= \
  CURRENT_BRANCH=feature/test DEVELOP_BRANCH=develop MAIN_BRANCH=main
expect_failure "existing release branch" "Release branch 'release/1.18.2' already exists" \
  RELEASE_TYPE=standard RELEASE_VERSION=1.18.2 APP_VERSION= \
  CURRENT_BRANCH=develop DEVELOP_BRANCH=develop MAIN_BRANCH=main
expect_failure "invalid configured branch" "is not a valid branch name" \
  RELEASE_TYPE=standard RELEASE_VERSION=1.18.1 APP_VERSION= \
  CURRENT_BRANCH=develop DEVELOP_BRANCH="\$(touch $MARKER)" MAIN_BRANCH=main
expect_failure "invalid configured main branch" "main-branch" \
  RELEASE_TYPE=standard RELEASE_VERSION=1.18.1 APP_VERSION= \
  CURRENT_BRANCH=develop DEVELOP_BRANCH=develop MAIN_BRANCH='invalid branch'
test ! -e "$MARKER"

git checkout --quiet hotfix/1.18.3
expect_success "valid hotfix release" "hotfix/1.18.3" \
  RELEASE_TYPE=hotfix RELEASE_VERSION=1.18.3 APP_VERSION= \
  CURRENT_BRANCH=hotfix/1.18.3 DEVELOP_BRANCH=develop MAIN_BRANCH=main
expect_failure "hotfix from non-hotfix branch" "must be triggered from 'hotfix/1.18.3'" \
  RELEASE_TYPE=hotfix RELEASE_VERSION=1.18.3 APP_VERSION= \
  CURRENT_BRANCH=develop DEVELOP_BRANCH=develop MAIN_BRANCH=main
expect_failure "hotfix branch/version mismatch" "must be triggered from 'hotfix/1.18.2'" \
  RELEASE_TYPE=hotfix RELEASE_VERSION=1.18.2 APP_VERSION= \
  CURRENT_BRANCH=hotfix/1.18.3 DEVELOP_BRANCH=develop MAIN_BRANCH=main
expect_failure "hotfix main branch does not exist" "Main branch 'missing-main' does not exist" \
  RELEASE_TYPE=hotfix RELEASE_VERSION=1.18.3 APP_VERSION= \
  CURRENT_BRANCH=hotfix/1.18.3 DEVELOP_BRANCH=develop MAIN_BRANCH=missing-main

git checkout --quiet hotfix/1.18.4
expect_failure "hotfix not descended from main" "must descend from 'main'" \
  RELEASE_TYPE=hotfix RELEASE_VERSION=1.18.4 APP_VERSION= \
  CURRENT_BRANCH=hotfix/1.18.4 DEVELOP_BRANCH=develop MAIN_BRANCH=main

expect_failure "release-version shell syntax is inert" "must be in X.Y.Z format" \
  RELEASE_TYPE=standard RELEASE_VERSION="\$(touch $MARKER)" APP_VERSION= \
  CURRENT_BRANCH=develop DEVELOP_BRANCH=develop MAIN_BRANCH=main
test ! -e "$MARKER"

echo "All release validation tests passed"
