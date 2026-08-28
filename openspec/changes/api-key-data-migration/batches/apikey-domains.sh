#!/usr/bin/env bash
# apikey-domains.sh — Load ApiKeyDomain records into DynamoDB
#
# Reads batches/denormalized/apikey-domains.csv and issues one put-item per row.
# The CSV contains rows for all environments; all rows are loaded regardless of env column
# (target table is specified explicitly via --table).
#
# Usage:
#   ./apikey-domains.sh --table <dynamodb-table-name> [--profile <aws-profile>]
#
# Example:
#   ./apikey-domains.sh --table izgateway-dev-test --profile cdc
#   ./apikey-domains.sh --table izgw-hub --profile production

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CSV="${SCRIPT_DIR}/denormalized/apikey-domains.csv"

TABLE=""
PROFILE_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --table)   TABLE="$2";   shift 2 ;;
    --profile) PROFILE_ARGS=(--profile "$2"); shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$TABLE" ]]; then
  echo "Usage: $0 --table <dynamodb-table-name> [--profile <aws-profile>]" >&2
  exit 1
fi

echo "Loading ApiKeyDomains → table: $TABLE"

VALIDATED_AT="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
COUNT=0
FAILURES=0
SKIP=1  # skip header

# Columns: env,envId,domain,organization,sender_type,entityId,entityName,status,authExpiresAt
while IFS=, read -r env envId domain organization sender_type entityId entityName status authExpiresAt; do
  if [[ $SKIP -eq 1 ]]; then SKIP=0; continue; fi

  SORT_KEY="${envId}#${entityId}#${domain}"

  if aws dynamodb put-item "${PROFILE_ARGS[@]}" \
    --table-name "$TABLE" \
    --item "{
      \"entityType\":   {\"S\": \"ApiKeyDomain\"},
      \"sortKey\":      {\"S\": \"${SORT_KEY}\"},
      \"domain\":       {\"S\": \"${domain}\"},
      \"entityId\":     {\"N\": \"${entityId}\"},
      \"environment\":  {\"N\": \"${envId}\"},
      \"status\":       {\"S\": \"${status}\"},
      \"validatedAt\":  {\"S\": \"${VALIDATED_AT}\"},
      \"authExpiresAt\":{\"S\": \"${authExpiresAt}\"},
      \"requestedBy\":  {\"S\": \"migration\"}
    }"; then
    echo "  OK:     PUT ApiKeyDomain/${SORT_KEY}"
    COUNT=$((COUNT + 1))
  else
    echo "  FAILED: PUT ApiKeyDomain/${SORT_KEY} (rc=$?)" >&2
    FAILURES=$((FAILURES + 1))
  fi
done < "$CSV"

echo "Done. $COUNT ApiKeyDomain records written to $TABLE. Failures: $FAILURES."
