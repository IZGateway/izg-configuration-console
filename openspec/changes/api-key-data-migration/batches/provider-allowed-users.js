#!/usr/bin/env node
'use strict';

// provider-allowed-users.js — Load Provider AllowedUser records into DynamoDB via BatchWriteItem.
// Node replacement for provider-allowed-users.sh (see that file's header for background).
//
// Usage:
//   node provider-allowed-users.js --table <dynamodb-table-name> [--profile <aws-profile>]

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { parseArgs, buildDocClient, batchWriteAll } = require('./lib/batchLoad');

const USAGE = 'Usage: node provider-allowed-users.js --table <dynamodb-table-name> [--profile <aws-profile>]';
const CSV = path.join(__dirname, 'denormalized', 'allowed-users-provider.csv');

// Columns: env,envId,sender_name,sender_id,cert_domain,receiver_destid,receiver_name,use_type,validUntil
// Note: sender_id, use_type, and validUntil are retained in the CSV for audit/review
// purposes only; the AllowedUser entity does not store those fields.
async function main() {
  const args = parseArgs(process.argv.slice(2), USAGE);
  const rows = parse(fs.readFileSync(CSV, 'utf8'), { columns: true, skip_empty_lines: true, bom: true, trim: true });
  const validatedOn = new Date().toISOString().replace(/\.\d+Z$/, '.000Z');

  const items = rows.map((r) => ({
    entityType: 'AllowedUser',
    sortKey: `${r.envId}#${r.receiver_destid}#${r.cert_domain}`,
    principal: r.cert_domain,
    organization: r.sender_name,
    destinationId: r.receiver_destid,
    environment: Number(r.envId),
    validatedOn,
    enabled: true,
  }));

  console.log(`Loading Provider AllowedUsers → table: ${args.table}`);
  const doc = buildDocClient(args);
  const { ok, failed } = await batchWriteAll(doc, args.table, items, {
    onItemResult: (success, item, errMsg) => {
      if (success) {
        console.log(`  OK:     PUT AllowedUser/${item.sortKey}`);
      } else {
        console.error(`  FAILED: PUT AllowedUser/${item.sortKey}${errMsg ? ` (${errMsg})` : ''}`);
      }
    },
  });

  console.log(`Done. ${ok} Provider AllowedUser records written to ${args.table}. Failures: ${failed}.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
