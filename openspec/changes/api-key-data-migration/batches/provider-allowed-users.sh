#!/usr/bin/env bash
# provider-allowed-users.sh — Load Provider AllowedUser records into DynamoDB
#
# Reads batches/denormalized/allowed-users-provider.csv and issues one put-item per row.
# The CSV contains rows for all environments; all rows are loaded regardless of env column
# (target table is specified explicitly via --table).
#
# Usage:
#   ./provider-allowed-users.sh --table <dynamodb-table-name> [--profile <aws-profile>]
#
# Example:
#   ./provider-allowed-users.sh --table izgateway-dev-test --profile cdc
#   ./provider-allowed-users.sh --table izgw-hub --profile production

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CSV="${SCRIPT_DIR}/denormalized/allowed-users-provider.csv"

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

echo "Loading Provider AllowedUsers → table: $TABLE"

VALIDATED_ON="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
COUNT=0
FAILURES=0
SKIP=1  # skip header

# Columns: env,envId,sender_name,sender_id,cert_domain,receiver_destid,receiver_name,use_type,validUntil
# Note: use_type and validUntil are retained in the CSV for audit/review purposes only;
# the AllowedUser entity does not store those fields.
while IFS=, read -r env envId sender_name sender_id cert_domain receiver_destid receiver_name use_type validUntil; do
  if [[ $SKIP -eq 1 ]]; then SKIP=0; continue; fi

  SORT_KEY="${envId}#${receiver_destid}#${cert_domain}"

  if aws dynamodb put-item "${PROFILE_ARGS[@]}" \
    --table-name "$TABLE" \
    --item "{
      \"entityType\":    {\"S\": \"AllowedUser\"},
      \"sortKey\":       {\"S\": \"${SORT_KEY}\"},
      \"principal\":     {\"S\": \"${cert_domain}\"},
      \"organization\":  {\"S\": \"${sender_name}\"},
      \"destinationId\": {\"S\": \"${receiver_destid}\"},
      \"environment\":   {\"N\": \"${envId}\"},
      \"validatedOn\":   {\"S\": \"${VALIDATED_ON}\"},
      \"enabled\":       {\"BOOL\": true}
    }"; then
    echo "  OK:     PUT AllowedUser/${SORT_KEY}"
    COUNT=$((COUNT + 1))
  else
    echo "  FAILED: PUT AllowedUser/${SORT_KEY} (rc=$?)" >&2
    FAILURES=$((FAILURES + 1))
  fi
done < "$CSV"

echo "Done. $COUNT Provider AllowedUser records written to $TABLE. Failures: $FAILURES."