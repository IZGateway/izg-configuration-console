#!/usr/bin/env node
'use strict';

// senders.js — Load Sender (Jurisdiction) records into DynamoDB via BatchWriteItem.
// Node replacement for senders.sh (see that file's header for background).
//
// Usage:
//   node senders.js --table <dynamodb-table-name> [--profile <aws-profile>]

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { parseArgs, buildDocClient, batchWriteAll } = require('./lib/batchLoad');

const USAGE = 'Usage: node senders.js --table <dynamodb-table-name> [--profile <aws-profile>]';
const CSV = path.join(__dirname, 'denormalized', 'senders.csv');

async function main() {
  const args = parseArgs(process.argv.slice(2), USAGE);
  const rows = parse(fs.readFileSync(CSV, 'utf8'), { columns: true, skip_empty_lines: true, bom: true, trim: true });

  const items = rows.map((r) => ({
    entityType: 'Jurisdiction',
    sortKey: r.sender_id,
    jurisdictionId: Number(r.sender_id),
    jurisdictionName: r.canonical_name,
    prefix: r.prefix,
    useTypes: new Set(r.use_types.split('|')), // Set -> DynamoDB SS; plain Array would marshal to List
  }));

  console.log(`Loading senders → table: ${args.table}`);
  const doc = buildDocClient(args);
  const { ok, failed } = await batchWriteAll(doc, args.table, items, {
    onItemResult: (success, item, errMsg) => {
      if (success) {
        console.log(`  OK:     PUT Jurisdiction/${item.sortKey} — ${item.jurisdictionName} (${item.prefix})`);
      } else {
        console.error(`  FAILED: PUT Jurisdiction/${item.sortKey} — ${item.jurisdictionName}${errMsg ? ` (${errMsg})` : ''}`);
      }
    },
  });

  console.log(`Done. ${ok} sender records written to ${args.table}. Failures: ${failed}.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
