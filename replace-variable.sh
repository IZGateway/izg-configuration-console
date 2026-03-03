#!/bin/bash
# replace-variable.sh

# Define required and optional environment variables to replace
REQUIRED_VARIABLES=("NEXT_PUBLIC_OKTA_ISSUER" "NEXT_PUBLIC_GA_ID" "NEXT_PUBLIC_APP_ENV")
OPTIONAL_VARIABLES=("NEXT_PUBLIC_ELASTIC_INDEX" "NEXT_PUBLIC_ELASTIC_ENV_TAG" "NEXT_PUBLIC_OPERATIONS_CONSOLE_ELASTIC_INDEX")

# Check if each variable is set
for VAR in "${REQUIRED_VARIABLES[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo "$VAR is not set. Please set it and rerun the script."
        exit 1
    fi
done

# Find and replace BAKED values with real values
find /app/public /app/.next -type f -name "*.js" |
while read file; do
    for VAR in "${REQUIRED_VARIABLES[@]}"; do
        sed -i "s|BAKED_$VAR|${!VAR}|g" "$file"
    done

    for VAR in "${OPTIONAL_VARIABLES[@]}"; do
        if [ -n "${!VAR}" ]; then
            sed -i "s|BAKED_$VAR|${!VAR}|g" "$file"
        fi
    done
done