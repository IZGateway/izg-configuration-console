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

const fs      = require('fs');
const path    = require('path');
const { parse } = require('csv-parse/sync');

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
  return parse(content, { columns: true, skip_empty_lines: true, bom: true, trim: true });
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

// Split-endpoint aliases — these prefixes don't appear in jurisdiction-table-current.csv
// but map to the same jurisdictionId as their parent prefix
const SPLIT_ENDPOINT_ALIASES = {
  'md_c':    'md',   // Maryland Provider Connect → Maryland
  'va_s':    'va',   // Virginia IIS → Virginia
  'ny_vxu':  'ny',   // New York VXU → New York
  'ny_qbp':  'ny',   // New York QBP (onboarding only) → New York
  'ny_test': 'ny',   // New York test (onboarding only) → New York
  'mi_test': 'mi',   // Michigan test (onboarding only) → Michigan
  'nc_test': 'nc',   // North Carolina test (onboarding only) → North Carolina
};
for (const [alias, parent] of Object.entries(SPLIT_ENDPOINT_ALIASES)) {
  if (prefixToId[parent] !== undefined) {
    prefixToId[alias] = prefixToId[parent];
  }
}

// sender short_id → senderId (integer) — from sender-organizations.csv short_id column
const senderShortIdToId = {};
for (const row of senderOrgRows) {
  if (row.short_id) {
    senderShortIdToId[row.short_id.trim().toLowerCase()] = parseInt(row.sender_id, 10);
  }
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

// ---------------------------------------------------------------------------
// Task 1.3a: Prefix corrections
// ---------------------------------------------------------------------------
// Three Jurisdiction records have incorrect prefix values in the live DB.
// The CSV contains the correct target values; generate unconditional UpdateItem
// JSONs so the correction is auditable and independently re-runnable.

const PREFIX_CORRECTIONS = [
  { jurisdictionId: 14, correctPrefix: 'hi' },  // Hawaii  (live: 'ha')
  { jurisdictionId: 16, correctPrefix: 'id' },  // Idaho   (live: possibly 'io')
  { jurisdictionId: 32, correctPrefix: 'ne' },  // Nebraska (live: 'nb')
];

const prefixCorrectionRequests = PREFIX_CORRECTIONS.map(({ jurisdictionId, correctPrefix }) => ({
  Update: {
    TableName: DYNAMO_TABLE,
    Key: {
      entityType: s('Jurisdiction'),
      sortKey:    s(String(jurisdictionId)),
    },
    UpdateExpression: 'SET #prefix = :prefix',
    ExpressionAttributeNames:  { '#prefix': 'prefix' },
    ExpressionAttributeValues: { ':prefix': s(correctPrefix) },
  },
}));

// TransactWriteItems accepts up to 100 items; 3 fits in one call
const prefixCorrectionsPath = path.join(BATCHES_DIR, 'prefix-corrections.json');
fs.writeFileSync(prefixCorrectionsPath, JSON.stringify(
  { TransactItems: prefixCorrectionRequests }, null, 2
));
counts.prefixCorrections = PREFIX_CORRECTIONS.length;
console.log(`\nPrefix corrections: ${counts.prefixCorrections} items → ${prefixCorrectionsPath}`);

// ---------------------------------------------------------------------------
// Task 1.3: Jurisdiction update-item JSON generation
// ---------------------------------------------------------------------------

// Name aliases: organization_name in allowed-use-types CSV → description in jurisdiction table
const ORG_NAME_ALIASES = {
  'american samoa - pi':             'pi - american samoa',
  'guam - pi':                       'pi - guam',
  'marshall islands - pi':           'pi - republic of the marshall islands',
  'micronesia - pi':                 'pi - federated states of micronesia',
  'n. mariana islands - pi':         'pi - commonwealth of the mariana islands',
  'palau - pi':                      'pi - palau',
  'new york city - new york state':  'new york city',
  'development':                     'development testing',
  'virgin islands u.s.':             'u.s. virgin islands',
};

// description (lowercase) → jurisdictionId integer
const descToJurisdictionId = {};
for (const row of jurisdictionRows) {
  descToJurisdictionId[row.description.trim().toLowerCase()] = parseInt(row.jurisdictionId, 10);
}

// prefix (lowercase) → description string (for AllowedUser destinationId)
const prefixToDesc = {};
for (const row of jurisdictionRows) {
  prefixToDesc[row.prefix.trim().toLowerCase()] = row.prefix.trim().toLowerCase();
}

// IIS sender prefixes — jurisdictions that send IIS-to-IIS messages → get useTypes=PUBLIC_HEALTH
const iisSenderPrefixes = new Set(iisAccessRows.map(r => r.sender_destid?.trim().toLowerCase()).filter(Boolean));
// Texas is in the IIS sender list but must NOT receive useTypes (legally prohibited from sending)
iisSenderPrefixes.delete('tx');

// prefix (lowercase) → jurisdictionId for quick lookup during jurisdiction updates
const prefixToJurisdictionId = {};
for (const row of jurisdictionRows) {
  prefixToJurisdictionId[row.prefix.trim().toLowerCase()] = parseInt(row.jurisdictionId, 10);
}

const ccuatPutItems = [];

for (const row of allowedUseTypeRows) {
  if (row.notes && row.notes.includes('SKIP')) continue;

  const orgKey  = row.organization_name.trim().toLowerCase();
  const descKey = ORG_NAME_ALIASES[orgKey] || orgKey;
  const jid     = descToJurisdictionId[descKey];

  if (jid === undefined) {
    if (orgKey === 'ccuat') {
      // CCUAT is a new record — PutItem, id=64
      const useTypes = row.allowed_use_types.split('|').map(s => s.trim()).filter(Boolean);
      ccuatPutItems.push({
        PutRequest: {
          Item: {
            entityType:        s('Jurisdiction'),
            sortKey:           s('64'),
            jurisdictionId:    n(64),
            description:       s('CCUAT'),
            name:              s('CCUAT'),
            prefix:            s('ccuat'),
            allowedUseTypes:   ss(useTypes),
          },
        },
      });
      counts.jurisdictionUpdates++;
      continue;
    }
    unresolved.push(`jurisdiction-allowed-use-types: no jurisdictionId for "${row.organization_name}"`);
    continue;
  }

  const useTypes = row.allowed_use_types.split('|').map(s => s.trim()).filter(Boolean);

  // Determine if this jurisdiction is an IIS sender — look up its prefix
  const jRow = jurisdictionRows.find(r => parseInt(r.jurisdictionId, 10) === jid);
  const prefix = jRow?.prefix?.trim().toLowerCase();
  const isIisSender = prefix && iisSenderPrefixes.has(prefix);

  let updateExpr = 'SET allowedUseTypes = :aut';
  const exprValues = { ':aut': ss(useTypes) };

  if (isIisSender) {
    updateExpr += ', useTypes = :ut';
    exprValues[':ut'] = ss(['PUBLIC_HEALTH']);
  }

  const updateJson = {
    TableName: DYNAMO_TABLE,
    Key: {
      entityType: s('Jurisdiction'),
      sortKey:    s(String(jid)),
    },
    UpdateExpression:          updateExpr,
    ExpressionAttributeValues: exprValues,
  };

  const outPath = path.join(OUTPUT_DIRS.jurisdictionUpdates, `${jid}.json`);
  fs.writeFileSync(outPath, JSON.stringify(updateJson, null, 2));
  counts.jurisdictionUpdates++;
}

// CCUAT PutItem batch (single item, written as a BatchWriteItem for consistency)
if (ccuatPutItems.length > 0) {
  const ccuatPath = path.join(OUTPUT_DIRS.jurisdictionUpdates, 'ccuat-put.json');
  fs.writeFileSync(ccuatPath, JSON.stringify(
    { RequestItems: { [DYNAMO_TABLE]: ccuatPutItems } }, null, 2
  ));
}

console.log(`Jurisdiction updates: ${counts.jurisdictionUpdates} files → ${OUTPUT_DIRS.jurisdictionUpdates}`);

// ---------------------------------------------------------------------------
// Task 1.4: Sender PutRequest batch generation
// ---------------------------------------------------------------------------
// Sender records are environment-agnostic — same batch written to both env dirs.

const senderPutItems = senderOrgRows.map(row => {
  const useTypes = row.use_types.split('|').map(t => t.trim()).filter(Boolean);
  return {
    PutRequest: {
      Item: {
        entityType:       s('Jurisdiction'),
        sortKey:          s(row.sender_id),
        jurisdictionId:   n(parseInt(row.sender_id, 10)),
        jurisdictionName: s(row.canonical_name),
        useTypes:         ss(useTypes),
      },
    },
  };
});

for (const env of ENVS) {
  const numBatches = writeBatches(senderPutItems, env, 'senders');
  counts.senderRecords = senderPutItems.length;
  console.log(`Sender records [${env}]: ${senderPutItems.length} items → ${numBatches} batch file(s)`);
}

// ---------------------------------------------------------------------------
// Task 1.5: IIS AllowedUser PutRequest batch generation
// ---------------------------------------------------------------------------

// STC shared certs: jurisdiction-type certs with no jurisdiction_destid.
// Used as fallback principal for STC-hosted IIS jurisdictions that have no
// individual certs in the inventory.
const stcSharedCerts = certRows.filter(
  c => c.sender_type === 'jurisdiction' && !c.jurisdiction_destid.trim() && c.environment !== 'exclude'
);

// Build map: sender_destid (lower) → [cert rows] for jurisdiction-type certs
const iisDestIdToCerts = {};
for (const cert of certRows) {
  if (cert.sender_type !== 'jurisdiction') continue;
  if (cert.environment === 'exclude') continue;
  const key = cert.jurisdiction_destid.trim().toLowerCase();
  if (!key) continue; // STC shared certs handled via stcSharedCerts fallback
  if (!iisDestIdToCerts[key]) iisDestIdToCerts[key] = [];
  iisDestIdToCerts[key].push(cert);
}

// Returns true if a cert should appear in targetEnv batch, given:
//   pairEnvs  — pipe-separated string from the pairs CSV (e.g. "production|onboarding")
//   certEnv   — string from cert inventory ("production", "onboarding", "any", "exclude")
//   targetEnv — the env we are currently generating ("production" or "onboarding")
function certAppliesToEnv(pairEnvs, certEnv, targetEnv) {
  if (certEnv === 'exclude') return false;
  const pairSet = new Set(pairEnvs.split('|').map(e => e.trim()));
  if (!pairSet.has(targetEnv)) return false;
  if (certEnv === 'any') return true;
  return certEnv === targetEnv;
}

// Build an AllowedUser PutRequest item with correct DynamoDB types
function makeAllowedUserItem(envName, destId, cert, useTypesList) {
  const envId = ENV_IDS[envName];
  return {
    PutRequest: {
      Item: {
        entityType:    s('AllowedUser'),
        sortKey:       s(`${envId}#${destId}#${cert.common_name}`),
        principal:     s(cert.common_name),
        organization:  s(cert.organization),
        useTypes:      ss(useTypesList),
        validUntil:    s(cert.validUntil || ''),
        destinationId: s(destId),
        environment:   n(envId),
        enabled:       { BOOL: true },
      },
    },
  };
}

for (const env of ENVS) {
  const items = [];

  for (const pair of iisAccessRows) {
    const senderKey  = pair.sender_destid.trim().toLowerCase();
    const destId     = pair.receiver_destid.trim().toLowerCase();
    let   certs      = iisDestIdToCerts[senderKey];

    if (!certs || certs.length === 0) {
      // No individual certs — fall back to STC shared certs for this sender
      certs = stcSharedCerts;
    }

    for (const cert of certs) {
      if (!certAppliesToEnv(pair.environments, cert.environment, env)) continue;
      if (env === 'production' && PRODUCTION_DENY_LIST.has(cert.common_name)) continue;
      items.push(makeAllowedUserItem(env, destId, cert, ['PUBLIC_HEALTH']));
    }
  }

  const numBatches = writeBatches(items, env, 'iis-allowedusers');
  counts.iisAllowedUsers[env] = items.length;
  console.log(`IIS AllowedUsers [${env}]: ${items.length} items → ${numBatches} batch file(s)`);
}

// ---------------------------------------------------------------------------
// Task 1.6: Provider AllowedUser PutRequest batch generation
// ---------------------------------------------------------------------------

// Build sender cert map: jurisdiction_destid (lower) → [cert rows] for sender-type certs
const providerDestIdToCerts = {};
for (const cert of certRows) {
  if (cert.sender_type !== 'sender') continue;
  if (cert.environment === 'exclude') continue;
  const key = cert.jurisdiction_destid.trim().toLowerCase();
  if (!key) continue;
  if (!providerDestIdToCerts[key]) providerDestIdToCerts[key] = [];
  providerDestIdToCerts[key].push(cert);
}

// Bridge map: provider pairs sender_id (lower) → short_id (lower) via sender-organizations.csv
// Covers cases where the pairs CSV uses canonical_name instead of short_id
const senderNameToShortId = {};
for (const row of senderOrgRows) {
  const shortId = row.short_id.trim().toLowerCase();
  senderNameToShortId[row.canonical_name.trim().toLowerCase()] = shortId;
  senderNameToShortId[shortId] = shortId; // identity mapping for direct short_id matches
  // Also map each salesforce name variant
  for (const variant of row.salesforce_name_variants.split('|')) {
    const v = variant.trim().toLowerCase();
    if (v) senderNameToShortId[v] = shortId;
  }
}

for (const env of ENVS) {
  const items = [];

  for (const pair of providerAccessRows) {
    const senderRaw = pair.sender_id.trim();
    const shortId   = senderNameToShortId[senderRaw.toLowerCase()];
    const destId    = pair.receiver_destid.trim().toLowerCase();

    if (!shortId) {
      unresolved.push(`provider-pair: no short_id mapping for sender_id="${senderRaw}"`);
      continue;
    }

    const certs = providerDestIdToCerts[shortId];
    if (!certs || certs.length === 0) {
      unresolved.push(`provider-pair: no certs for sender "${senderRaw}" (short_id="${shortId}")`);
      continue;
    }

    for (const cert of certs) {
      if (!certAppliesToEnv(pair.environments, cert.environment, env)) continue;
      if (env === 'production' && PRODUCTION_DENY_LIST.has(cert.common_name)) continue;
      items.push(makeAllowedUserItem(env, destId, cert, [pair.use_type]));
    }
  }

  const numBatches = writeBatches(items, env, 'provider-allowedusers');
  counts.providerAllowedUsers[env] = items.length;
  console.log(`Provider AllowedUsers [${env}]: ${items.length} items → ${numBatches} batch file(s)`);
}


// ---------------------------------------------------------------------------
// Task 1.9: ApiKeyDomain PutRequest batch generation
// ---------------------------------------------------------------------------

const migrationTs    = new Date().toISOString();
const fallbackExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const stcExclusionsSeen = new Set();

function resolveEntityId(cert) {
  const destId = cert.jurisdiction_destid?.trim().toLowerCase();
  switch (cert.sender_type) {
    case 'jurisdiction': {
      const jid = prefixToId[destId];
      return jid !== undefined ? jid : null;
    }
    case 'sender': {
      const sid = senderShortIdToId[destId];
      return sid !== undefined ? sid : null;
    }
    case 'ops': {
      const shortId = senderNameToShortId[cert.organization?.trim().toLowerCase()];
      if (!shortId) return null;
      return senderShortIdToId[shortId] ?? null;
    }
    default:
      return null;
  }
}

for (const env of ENVS) {
  const envId = ENV_IDS[env];
  const items = [];

  for (const cert of certRows) {
    if (cert.sender_type === 'ops-service') continue;
    if (cert.environment === 'exclude') continue;

    if (STC_SHARED_CERTS.has(cert.common_name)) {
      stcExclusionsSeen.add(cert.common_name);
      continue;
    }

    const certEnv = cert.environment;
    if (certEnv !== 'any' && certEnv !== env) continue;
    if (env === 'production' && PRODUCTION_DENY_LIST.has(cert.common_name)) continue;

    const entityId = resolveEntityId(cert);
    if (entityId === null) {
      unresolved.push(`apikey-domain: no entity ID for "${cert.common_name}" (org="${cert.organization}", type="${cert.sender_type}", dest="${cert.jurisdiction_destid}")`);
      continue;
    }

    items.push({
      PutRequest: {
        Item: {
          entityType:    s('ApiKeyDomain'),
          sortKey:       s(`${envId}#${entityId}#${cert.common_name}`),
          domain:        s(cert.common_name),
          entityId:      n(entityId),
          environment:   n(envId),
          status:        s('authorized'),
          validatedAt:   s(migrationTs),
          authExpiresAt: s(cert.validUntil?.trim() || fallbackExpiry),
          requestedBy:   s('migration'),
        },
      },
    });
  }

  const numBatches = writeBatches(items, env, 'apikey-domains');
  counts.apikeyDomains[env] = items.length;
  console.log(`ApiKey Domains [${env}]: ${items.length} items -> ${numBatches} batch file(s)`);
}

if (stcExclusionsSeen.size > 0) {
  console.log(`STC shared cert exclusions (no 1:1 mapping): ${[...stcExclusionsSeen].join(', ')}`);
}


console.log(`\nEnvironments: ${ENVS.join(', ')}`);

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
