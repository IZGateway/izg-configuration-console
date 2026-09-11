#!/usr/bin/env node
'use strict';

// apikey-domains.js — Load ApiKeyDomain records into DynamoDB via BatchWriteItem.
// Node replacement for apikey-domains.sh (see that file's header for background).
//
// Usage:
//   node apikey-domains.js --table <dynamodb-table-name> [--profile <aws-profile>]

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { parseArgs, buildDocClient, batchWriteAll } = require('./lib/batchLoad');

const USAGE = 'Usage: node apikey-domains.js --table <dynamodb-table-name> [--profile <aws-profile>]';
const CSV = path.join(__dirname, 'denormalized', 'apikey-domains.csv');

// Columns: env,envId,domain,organization,sender_type,entityId,entityName,status,authExpiresAt
async function main() {
  const args = parseArgs(process.argv.slice(2), USAGE);
  const rows = parse(fs.readFileSync(CSV, 'utf8'), { columns: true, skip_empty_lines: true, bom: true, trim: true });
  const validatedAt = new Date().toISOString().replace(/\.\d+Z$/, '.000Z');

  const items = rows.map((r) => ({
    entityType: 'ApiKeyDomain',
    sortKey: `${r.envId}#${r.entityId}#${r.domain}`,
    domain: r.domain,
    entityId: Number(r.entityId),
    environment: Number(r.envId),
    status: r.status,
    validatedAt,
    authExpiresAt: r.authExpiresAt,
    requestedBy: 'migration',
  }));

  console.log(`Loading ApiKeyDomains → table: ${args.table}`);
  const doc = buildDocClient(args);
  const { ok, failed } = await batchWriteAll(doc, args.table, items, {
    onItemResult: (success, item, errMsg) => {
      if (success) {
        console.log(`  OK:     PUT ApiKeyDomain/${item.sortKey}`);
      } else {
        console.error(`  FAILED: PUT ApiKeyDomain/${item.sortKey}${errMsg ? ` (${errMsg})` : ''}`);
      }
    },
  });

  console.log(`Done. ${ok} ApiKeyDomain records written to ${args.table}. Failures: ${failed}.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
