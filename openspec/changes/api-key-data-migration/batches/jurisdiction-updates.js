#!/usr/bin/env node
'use strict';

// jurisdiction-updates.js — Set allowedUseTypes/useTypes on existing Jurisdiction
// records and create the missing CCUAT (id=64) record.
// Node replacement for jurisdiction-updates.sh. DynamoDB has no bulk UpdateItem
// API (BatchWriteItem only supports Put/Delete), so this still issues individual
// UpdateItem calls -- but from one persistent process/connection, which is what
// eliminated the per-call aws-cli process-spawn cost for the other four scripts.
//
// Usage:
//   node jurisdiction-updates.js --table <dynamodb-table-name> [--profile <aws-profile>]

const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { parseArgs, buildDocClient } = require('./lib/batchLoad');

const USAGE = 'Usage: node jurisdiction-updates.js --table <dynamodb-table-name> [--profile <aws-profile>]';

// allowedUseTypes / useTypes assignments, grouped exactly as in the retired .sh script.
const GROUPS = [
  {
    label: 'PROVIDER|PUBLIC_HEALTH, useTypes=PUBLIC_HEALTH',
    ids: [5, 6, 8, 9, 11, 12, 17, 18, 19, 20, 21, 23, 25, 28, 35, 36, 38, 39, 40, 41, 42, 43, 50, 51, 53, 54, 56, 58, 60, 61, 62],
    allowedUseTypes: ['PROVIDER', 'PUBLIC_HEALTH'],
    useTypes: ['PUBLIC_HEALTH'],
  },
  {
    label: 'PROVIDER, useTypes=(none)',
    ids: [7, 13, 15, 22, 29, 30, 32, 33, 37, 52, 59],
    allowedUseTypes: ['PROVIDER'],
  },
  {
    label: 'PATIENT|PROVIDER|PUBLIC_HEALTH, useTypes=PUBLIC_HEALTH',
    ids: [3, 10, 27, 31, 34, 57, 63],
    allowedUseTypes: ['PATIENT', 'PROVIDER', 'PUBLIC_HEALTH'],
    useTypes: ['PUBLIC_HEALTH'],
  },
  {
    label: 'PUBLIC_HEALTH, useTypes=PUBLIC_HEALTH',
    ids: [4, 44, 45, 46, 47, 48, 49],
    allowedUseTypes: ['PUBLIC_HEALTH'],
    useTypes: ['PUBLIC_HEALTH'],
  },
  {
    label: 'PATIENT|PROVIDER, useTypes=(none)',
    ids: [16, 24, 26],
    allowedUseTypes: ['PATIENT', 'PROVIDER'],
  },
  {
    label: 'PATIENT|PROVIDER|PUBLIC_HEALTH, useTypes=(none) (1=dev, Development Testing)',
    ids: [1],
    allowedUseTypes: ['PATIENT', 'PROVIDER', 'PUBLIC_HEALTH'],
  },
  {
    label: 'REMOVE allowedUseTypes (14=hi, Hawaii)',
    ids: [14],
    remove: true,
  },
  {
    label: 'PROVIDER|PUBLIC_HEALTH, useTypes=(none) (55=tx, Texas)',
    ids: [55],
    allowedUseTypes: ['PROVIDER', 'PUBLIC_HEALTH'],
  },
];

function buildUpdateParams(tableName, sortKey, group) {
  if (group.remove) {
    return {
      TableName: tableName,
      Key: { entityType: 'Jurisdiction', sortKey: String(sortKey) },
      UpdateExpression: 'REMOVE allowedUseTypes',
    };
  }
  const values = { ':aut': new Set(group.allowedUseTypes) }; // Set -> DynamoDB SS
  let expr = 'SET allowedUseTypes = :aut';
  if (group.useTypes) {
    expr += ', useTypes = :ut';
    values[':ut'] = new Set(group.useTypes);
  }
  return {
    TableName: tableName,
    Key: { entityType: 'Jurisdiction', sortKey: String(sortKey) },
    UpdateExpression: expr,
    ExpressionAttributeValues: values,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2), USAGE);
  const doc = buildDocClient(args);

  let ok = 0;
  let failed = 0;

  for (const group of GROUPS) {
    for (const id of group.ids) {
      try {
        await doc.send(new UpdateCommand(buildUpdateParams(args.table, id, group)));
        console.log(`  OK:     UPDATE Jurisdiction/${id}`);
        ok++;
      } catch (err) {
        console.error(`  FAILED: UPDATE Jurisdiction/${id} (${err.message})`);
        failed++;
      }
    }
  }

  // CCUAT (id=64) is not present in existing Jurisdiction exports; create/update it.
  try {
    await doc.send(
      new UpdateCommand({
        TableName: args.table,
        Key: { entityType: 'Jurisdiction', sortKey: '64' },
        UpdateExpression: 'SET jurisdictionId = :jid, #d = :desc, #n = :name, prefix = :p, allowedUseTypes = :aut',
        ExpressionAttributeNames: { '#d': 'description', '#n': 'name' },
        ExpressionAttributeValues: {
          ':jid': 64,
          ':desc': 'CCUAT',
          ':name': 'CCUAT',
          ':p': 'ccuat',
          ':aut': new Set(['PATIENT', 'PROVIDER', 'PUBLIC_HEALTH']),
        },
      })
    );
    console.log('  OK:     UPDATE Jurisdiction/64');
    ok++;
  } catch (err) {
    console.error(`  FAILED: UPDATE Jurisdiction/64 (${err.message})`);
    failed++;
  }

  console.log(`Done. ${ok} Jurisdiction records written/updated in ${args.table}. Failures: ${failed}.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
