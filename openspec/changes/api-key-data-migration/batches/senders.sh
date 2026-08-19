#!/usr/bin/env bash
# senders.sh — Load Sender (Jurisdiction) records into DynamoDB
#
# Reads batches/denormalized/senders.csv and issues one put-item per sender org.
# Senders are environment-agnostic; run once against each target table.
#
# Usage:
#   ./senders.sh --table <dynamodb-table-name> [--profile <aws-profile>]
#
# Example:
#   ./senders.sh --table izgateway-dev-test --profile cdc
#   ./senders.sh --table izgw-hub --profile production

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CSV="${SCRIPT_DIR}/denormalized/senders.csv"

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

echo "Loading senders → table: $TABLE"

COUNT=0
SKIP=1  # skip header

while IFS=, read -r sender_id prefix canonical_name use_types; do
  if [[ $SKIP -eq 1 ]]; then SKIP=0; continue; fi

  # Build StringSet for use_types (pipe-separated in CSV)
  IFS='|' read -ra UT_ARRAY <<< "$use_types"
  USE_TYPES_JSON=$(printf '"%s",' "${UT_ARRAY[@]}")
  USE_TYPES_JSON="[${USE_TYPES_JSON%,}]"

  aws dynamodb put-item "${PROFILE_ARGS[@]}" \
    --table-name "$TABLE" \
    --item "{
      \"entityType\":       {\"S\": \"Jurisdiction\"},
      \"sortKey\":          {\"S\": \"${sender_id}\"},
      \"jurisdictionId\":   {\"N\": \"${sender_id}\"},
      \"jurisdictionName\": {\"S\": \"${canonical_name}\"},
      \"prefix\":           {\"S\": \"${prefix}\"},
      \"useTypes\":         {\"SS\": ${USE_TYPES_JSON}}
    }"

  echo "  PUT Jurisdiction/${sender_id} — ${canonical_name} (${prefix})"
  COUNT=$((COUNT + 1))
done < "$CSV"

echo "Done. $COUNT sender records written to $TABLE."
