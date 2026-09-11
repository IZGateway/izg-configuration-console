'use strict';

/**
 * Shared CLI-arg parsing, DynamoDB client construction, and BatchWriteItem
 * loader used by senders.js, iis-allowed-users.js, provider-allowed-users.js,
 * and apikey-domains.js. Replaces the one-put-item-per-row aws-cli loops in
 * the sibling .sh scripts, which don't scale (each aws-cli invocation is a
 * separate process spawn; on this team's Windows/Git-Bash environment that
 * cost ~2-3s/call regardless of concurrency, making a ~1,700-row load take
 * 20-60 minutes). BatchWriteItem sends up to 25 items per network call from
 * a single long-lived Node process, cutting the same load to seconds.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const CHUNK_SIZE = 25; // DynamoDB BatchWriteItem hard limit
const MAX_RETRIES = 6;

function parseArgs(argv, usage) {
  const args = { table: null, profile: null, region: process.env.AWS_REGION || 'us-east-1' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--table') {
      args.table = argv[++i];
    } else if (argv[i] === '--profile') {
      args.profile = argv[++i];
    } else {
      throw new Error(`Unknown argument: ${argv[i]}\n${usage}`);
    }
  }
  if (!args.table) {
    throw new Error(usage);
  }
  return args;
}

function buildDocClient(args) {
  // AWS_ENDPOINT_URL matches the convention already used for the .sh scripts this
  // session; DYNAMODB_ENDPOINT matches this app's own src/lib/db/dynamo.ts convention.
  const endpoint = process.env.AWS_ENDPOINT_URL || process.env.DYNAMODB_ENDPOINT || undefined;
  if (args.profile) {
    process.env.AWS_PROFILE = args.profile;
  }
  const clientConfig = { region: args.region };
  if (endpoint) clientConfig.endpoint = endpoint;
  if (process.env.AWS_ACCESS_KEY_ID) {
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };
  }
  const client = new DynamoDBClient(clientConfig);
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Every entity type here uses (entityType, sortKey) as its primary key. Used to
// match items in the UnprocessedItems response back to the originals we sent,
// since the SDK returns freshly-deserialized objects (reference equality won't work).
function itemKey(item) {
  return `${item.entityType}#${item.sortKey}`;
}

/**
 * Collapses items sharing the same (entityType, sortKey) to the last one in
 * input order -- BatchWriteItem rejects an entire 25-item chunk outright if
 * it contains duplicate keys (unlike put-item, which just lets a later call
 * silently overwrite an earlier one). This reproduces that same last-write-
 * wins behavior instead of failing, and reports how many keys collapsed so
 * the collision isn't silently invisible the way it was with put-item.
 *
 * This is expected and not a data error: many jurisdictions share the same
 * STC Health cert domain (e.g. izgateway.stchealthops.com), and the
 * AllowedUser sortKey is keyed on (destination, cert) only -- it has no
 * sender field, because the underlying mTLS auth can't distinguish senders
 * sharing one cert either. Multiple CSV rows legitimately collapse to one
 * physical record in that case.
 */
function dedupeByKey(items) {
  const byKey = new Map();
  for (const item of items) byKey.set(itemKey(item), item);
  const deduped = [...byKey.values()];
  const collapsed = items.length - deduped.length;
  if (collapsed > 0) {
    console.warn(
      `  NOTE: ${items.length} CSV rows produced only ${deduped.length} distinct DynamoDB keys ` +
        `(${collapsed} rows shared a key with another row -- last one in file order wins, matching ` +
        `put-item's overwrite behavior). This is expected when senders share a certificate.`
    );
  }
  return deduped;
}

/**
 * Writes `items` (plain JS objects, one per DynamoDB item) to `tableName` via
 * BatchWriteItem, chunked to 25 and retried (exponential backoff) on
 * UnprocessedItems. Returns { ok, failed } counts.
 */
async function batchWriteAll(doc, tableName, rawItems, { onItemResult } = {}) {
  let ok = 0;
  let failed = 0;
  const items = dedupeByKey(rawItems);

  for (const group of chunk(items, CHUNK_SIZE)) {
    let pending = group;
    let attempt = 0;

    while (pending.length > 0) {
      const RequestItems = {
        [tableName]: pending.map((Item) => ({ PutRequest: { Item } })),
      };

      let resp;
      try {
        resp = await doc.send(new BatchWriteCommand({ RequestItems }));
      } catch (err) {
        failed += pending.length;
        if (onItemResult) pending.forEach((item) => onItemResult(false, item, err.message));
        console.error(`  FAILED batch of ${pending.length}: ${err.message}`);
        pending = [];
        break;
      }

      const unprocessed = (resp.UnprocessedItems && resp.UnprocessedItems[tableName]) || [];
      const unprocessedItems = unprocessed.map((req) => req.PutRequest.Item);
      const unprocessedKeys = new Set(unprocessedItems.map(itemKey));
      const succeededCount = pending.length - unprocessedItems.length;
      ok += succeededCount;

      if (onItemResult) {
        pending.forEach((item) => {
          if (!unprocessedKeys.has(itemKey(item))) onItemResult(true, item);
        });
      }

      if (unprocessedItems.length === 0) break;

      attempt += 1;
      if (attempt > MAX_RETRIES) {
        failed += unprocessedItems.length;
        if (onItemResult) unprocessedItems.forEach((item) => onItemResult(false, item, 'gave up after retries'));
        console.error(`  FAILED: ${unprocessedItems.length} items unprocessed after ${attempt} retries`);
        break;
      }
      await sleep(Math.min(200 * 2 ** attempt, 3000));
      pending = unprocessedItems;
    }
  }

  return { ok, failed };
}

module.exports = { parseArgs, buildDocClient, batchWriteAll, CHUNK_SIZE };
