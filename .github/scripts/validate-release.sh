#!/usr/bin/env bash

set -euo pipefail

: "${RELEASE_TYPE:?RELEASE_TYPE is required}"
: "${RELEASE_VERSION:?RELEASE_VERSION is required}"
: "${CURRENT_BRANCH:?CURRENT_BRANCH is required}"
: "${DEVELOP_BRANCH:?DEVELOP_BRANCH is required}"
: "${MAIN_BRANCH:?MAIN_BRANCH is required}"

APP_VERSION="${APP_VERSION:-}"
REMOTE_NAME="${REMOTE_NAME:-origin}"
SEMVER_PATTERN='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'

fail() {
  echo "::error::$1" >&2
  exit 1
}

version_is_greater() {
  local candidate="$1"
  local baseline="$2"

  [[ "$candidate" != "$baseline" ]] &&
    [[ "$(printf '%s\n%s\n' "$baseline" "$candidate" | sort -V | tail -n 1)" == "$candidate" ]]
}

case "$RELEASE_TYPE" in
  standard | hotfix) ;;
  *) fail "release-type '$RELEASE_TYPE' must be 'standard' or 'hotfix'" ;;
esac

if [[ ! "$RELEASE_VERSION" =~ $SEMVER_PATTERN ]]; then
  fail "release-version '$RELEASE_VERSION' must be in X.Y.Z format"
fi

if [[ -n "$APP_VERSION" && ! "$APP_VERSION" =~ $SEMVER_PATTERN ]]; then
  fail "app-version '$APP_VERSION' must be in X.Y.Z format"
fi

if ! git check-ref-format --branch "$DEVELOP_BRANCH" >/dev/null 2>&1; then
  fail "develop-branch '$DEVELOP_BRANCH' is not a valid branch name"
fi

if ! git check-ref-format --branch "$MAIN_BRANCH" >/dev/null 2>&1; then
  fail "main-branch '$MAIN_BRANCH' is not a valid branch name"
fi

git fetch --force --tags "$REMOTE_NAME"

if git ls-remote --exit-code --tags "$REMOTE_NAME" \
  "refs/tags/v${RELEASE_VERSION}" >/dev/null 2>&1; then
  fail "Tag 'v${RELEASE_VERSION}' already exists"
fi

LATEST_TAG=$(git tag -l 'v*' --sort=-v:refname |
  grep -E '^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$' |
  head -n 1 || true)
if [[ -n "$LATEST_TAG" ]]; then
  LATEST_VERSION="${LATEST_TAG#v}"
  if ! version_is_greater "$RELEASE_VERSION" "$LATEST_VERSION"; then
    fail "release-version '$RELEASE_VERSION' must be newer than latest tag '$LATEST_TAG'"
  fi
fi

if [[ "$RELEASE_TYPE" == "standard" ]]; then
  if [[ "$CURRENT_BRANCH" != "$DEVELOP_BRANCH" ]]; then
    fail "Standard release must be triggered from '$DEVELOP_BRANCH', not '$CURRENT_BRANCH'"
  fi

  if [[ -n "$APP_VERSION" ]] &&
    ! version_is_greater "$APP_VERSION" "$RELEASE_VERSION"; then
    fail "app-version '$APP_VERSION' must be newer than release-version '$RELEASE_VERSION'"
  fi

  RELEASE_BRANCH="release/${RELEASE_VERSION}"
  if git ls-remote --exit-code --heads "$REMOTE_NAME" \
    "refs/heads/${RELEASE_BRANCH}" >/dev/null 2>&1; then
    fail "Release branch '$RELEASE_BRANCH' already exists"
  fi
else
  RELEASE_BRANCH="hotfix/${RELEASE_VERSION}"
  if [[ "$CURRENT_BRANCH" != "$RELEASE_BRANCH" ]]; then
    fail "Hotfix release '$RELEASE_VERSION' must be triggered from '$RELEASE_BRANCH', not '$CURRENT_BRANCH'"
  fi

  if ! git ls-remote --exit-code --heads "$REMOTE_NAME" \
    "refs/heads/${MAIN_BRANCH}" >/dev/null 2>&1; then
    fail "Main branch '$MAIN_BRANCH' does not exist"
  fi

  git fetch "$REMOTE_NAME" "$MAIN_BRANCH"
  if ! git merge-base --is-ancestor \
    "refs/remotes/${REMOTE_NAME}/${MAIN_BRANCH}" HEAD; then
    fail "Hotfix branch '$CURRENT_BRANCH' must descend from '$MAIN_BRANCH'"
  fi
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "release_branch=$RELEASE_BRANCH" >> "$GITHUB_OUTPUT"
fi
echo "Validation passed for $RELEASE_TYPE release $RELEASE_VERSION"
