#!/usr/bin/env node
'use strict';

/**
 * generate-batches.js
 *
 * Generates DynamoDB batch files for the api-key-data-migration (IGDD-3258).
 *
 * Usage (run from the change directory):
 *   node openspec/changes/api-key-data-migration/generate-batches.js [--env production|onboarding]
 *
 * Or from the change directory itself:
 *   node generate-batches.js [--env production|onboarding]
 *
 * Outputs (relative to the change directory):
 *   batches/prefix-corrections.json
 *   batches/jurisdiction-updates/{id}.json
 *   batches/{env}/senders-batch-NNN.json
 *   batches/{env}/iis-allowedusers-batch-NNN.json
 *   batches/{env}/provider-allowedusers-batch-NNN.json
 *   batches/{env}/apikey-domains-batch-NNN.json
 *   unresolved.txt
 */

const fs   = require('fs');
const path = require('path');
/**
 * Minimal CSV parser — handles quoted fields with embedded commas.
 * Used in place of csv-parse to keep this migration script self-contained
 * with no dependencies beyond Node.js builtins.
 */
function parse(content, { columns = false } = {}) {
  const rows = [];
  let i = 0;
  const len = content.length;

  function parseField() {
    if (content[i] === '"') {
      i++; // skip opening quote
      let val = '';
      while (i < len) {
        if (content[i] === '"' && content[i + 1] === '"') { val += '"'; i += 2; }
        else if (content[i] === '"') { i++; break; }
        else { val += content[i++]; }
      }
      return val;
    }
    let val = '';
    while (i < len && content[i] !== ',' && content[i] !== '\n' && content[i] !== '\r') {
      val += content[i++];
    }
    return val;
  }

  function parseLine() {
    const fields = [];
    while (i < len && content[i] !== '\n' && content[i] !== '\r') {
      fields.push(parseField());
      if (i < len && content[i] === ',') i++;
    }
    if (content[i] === '\r') i++;
    if (content[i] === '\n') i++;
    return fields;
  }

  // strip BOM if present
  if (content.charCodeAt(0) === 0xFEFF) { i = 1; }

  const header = columns ? parseLine() : null;
  while (i < len) {
    if (content[i] === '\r' || content[i] === '\n') { i++; continue; }
    const fields = parseLine();
    if (fields.length === 0 || (fields.length === 1 && fields[0] === '')) continue;
    if (columns) {
      const obj = {};
      header.forEach((h, idx) => { obj[h] = (fields[idx] || '').trim(); });
      rows.push(obj);
    } else {
      rows.push(fields);
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DYNAMO_TABLE = 'izgw-hub';
const BATCH_SIZE   = 25; // DynamoDB BatchWriteItem max

const ENV_IDS = { production: 1, onboarding: 3 };

// Certs that must never appear in production AllowedUser or ApiKeyDomain records
const PRODUCTION_DENY_LIST = new Set([
  'cicd.testing.izgateway.org',
  'dev.izgateway.org',
  'dev.xform.izgateway.org',
  'preprod-cc.phiz-project.org',
  'preprod.phiz-project.org',
  'preprod.xform.phiz-project.org',
  'test.izgateway.org',
]);

// STC Health shared certs — excluded from ApiKeyDomain (1:1 mapping impossible)
const STC_SHARED_CERTS = new Set([
  'izgateway.stchealthops.com',
  'izgateway2.stchealthops.com',
  'epicenter.stchome.com',
]);

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const CHANGE_DIR  = __dirname;
const BATCHES_DIR = path.join(__dirname, 'batches');
const OUTPUT_DIRS = {
  production:          path.join(BATCHES_DIR, 'production'),
  onboarding:          path.join(BATCHES_DIR, 'onboarding'),
  jurisdictionUpdates: path.join(BATCHES_DIR, 'jurisdiction-updates'),
};

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const envFlagIdx = args.indexOf('--env');
const envFilter = envFlagIdx !== -1 ? args[envFlagIdx + 1] : null;

if (envFilter && !['production', 'onboarding'].includes(envFilter)) {
  console.error(`Unknown --env value: ${envFilter}. Use "production" or "onboarding".`);
  process.exit(1);
}

const ENVS = envFilter ? [envFilter] : ['production', 'onboarding'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readCsv(filename) {
  const filepath = path.join(CHANGE_DIR, filename);
  const content  = fs.readFileSync(filepath, 'utf8');
  return parse(content, { columns: true });
}

function ensureDirs() {
  for (const dir of Object.values(OUTPUT_DIRS)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeBatches(items, envOrDir, prefix) {
  const outDir = typeof envOrDir === 'string' && OUTPUT_DIRS[envOrDir]
    ? OUTPUT_DIRS[envOrDir]
    : envOrDir;
  let batchNum = 1;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk   = items.slice(i, i + BATCH_SIZE);
    const payload = { RequestItems: { [DYNAMO_TABLE]: chunk } };
    const outPath = path.join(outDir, `${prefix}-batch-${String(batchNum).padStart(3, '0')}.json`);
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
    batchNum++;
  }
  return batchNum - 1; // number of batch files written
}

function s(val)  { return { S: String(val) }; }
function n(val)  { return { N: String(val) }; }
function ss(arr) { return { SS: arr.map(String) }; }

// ---------------------------------------------------------------------------
// Reporting state
// ---------------------------------------------------------------------------

const unresolved = [];
const counts = {
  prefixCorrections:      0,
  jurisdictionUpdates:    0,
  senderRecords:          0,
  iisAllowedUsers:        { production: 0, onboarding: 0 },
  providerAllowedUsers:   { production: 0, onboarding: 0 },
  apikeyDomains:          { production: 0, onboarding: 0 },
};

// ---------------------------------------------------------------------------
// Phase 0: Load reference data
// ---------------------------------------------------------------------------

console.log('Loading reference CSVs...');

const jurisdictionRows    = readCsv('jurisdiction-table-current.csv');
const allowedUseTypeRows  = readCsv('jurisdiction-allowed-use-types.csv');
const senderOrgRows       = readCsv('sender-organizations.csv');
const certRows            = readCsv('certificate-inventory.csv');
const iisAccessRows       = readCsv('iis-access-control-pairs.csv');
const providerAccessRows  = readCsv('provider-access-control-pairs.csv');

// prefix → jurisdictionId (integer)
const prefixToId = {};
// jurisdictionId → name
const idToName   = {};

for (const row of jurisdictionRows) {
  const id = parseInt(row.jurisdictionId, 10);
  prefixToId[row.prefix.trim().toLowerCase()] = id;
  idToName[id] = row.jurisdictionName || row.name || row.prefix;
}

// sender shortId → senderId (integer) — from sender-organizations.csv
const senderShortIdToId = {};
for (const row of senderOrgRows) {
  senderShortIdToId[row.sender_id.trim().toLowerCase()] = parseInt(row.sender_id, 10);
}

// cert common_name → senderId for sender-type certs
// (will be resolved via jurisdiction_destid for jurisdiction certs, sender_id for sender certs)
const certCommonNameToSenderId = {};
for (const row of certRows) {
  if (row.sender_type === 'sender' && row.jurisdiction_destid) {
    const sid = senderShortIdToId[row.jurisdiction_destid.trim().toLowerCase()];
    if (sid !== undefined) {
      certCommonNameToSenderId[row.common_name.trim().toLowerCase()] = sid;
    }
  } else if (row.sender_type === 'jurisdiction' && row.jurisdiction_destid) {
    const jid = prefixToId[row.jurisdiction_destid.trim().toLowerCase()];
    if (jid !== undefined) {
      certCommonNameToSenderId[row.common_name.trim().toLowerCase()] = jid;
    }
  }
}

// IIS sender destIds — used to determine which jurisdictions get useTypes=PUBLIC_HEALTH
const iisSenderDestIds = new Set(iisAccessRows.map(r => r.sender_destid?.trim().toLowerCase()).filter(Boolean));

console.log(`  Loaded ${jurisdictionRows.length} jurisdictions, ${senderOrgRows.length} senders, ${certRows.length} certs`);
console.log(`  Loaded ${iisAccessRows.length} IIS pairs, ${providerAccessRows.length} provider pairs`);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

ensureDirs();

// Tasks will be implemented in subsequent subtasks (1.3a through 1.9).
// This scaffold wires up the structure; each generation function is a stub.

console.log('\nGeneration stubs ready. Implement tasks 1.2–1.9 to populate output.');
console.log(`Environments: ${ENVS.join(', ')}`);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function writeReport() {
  console.log('\n=== Migration Batch Generation Report ===');
  console.log(`Prefix corrections:       ${counts.prefixCorrections}`);
  console.log(`Jurisdiction updates:     ${counts.jurisdictionUpdates}`);
  console.log(`Sender records:           ${counts.senderRecords}`);
  for (const env of ENVS) {
    console.log(`IIS AllowedUsers    [${env}]: ${counts.iisAllowedUsers[env]}`);
    console.log(`Provider AllowedUsers [${env}]: ${counts.providerAllowedUsers[env]}`);
    console.log(`ApiKey Domains      [${env}]: ${counts.apikeyDomains[env]}`);
  }
  if (unresolved.length > 0) {
    console.warn(`\nUnresolved rows: ${unresolved.length} (see migrate/unresolved.txt)`);
    fs.writeFileSync(path.join(__dirname, 'unresolved.txt'), unresolved.join('\n') + '\n');
  } else {
    console.log('\nNo unresolved rows.');
  }
}

writeReport();

module.exports = {
  // exported for testing / incremental implementation
  prefixToId, idToName, senderShortIdToId, certCommonNameToSenderId,
  iisSenderDestIds, certRows, senderOrgRows, iisAccessRows, providerAccessRows,
  allowedUseTypeRows, ENVS, ENV_IDS, DYNAMO_TABLE, BATCH_SIZE,
  PRODUCTION_DENY_LIST, STC_SHARED_CERTS,
  OUTPUT_DIRS, BATCHES_DIR, CHANGE_DIR,
  unresolved, counts,
  s, n, ss, writeBatches,
};
