#!/usr/bin/env python3
"""
sync_dynamodb_local.py

Clones the real izgateway-dev-test DynamoDB table into a local JSON snapshot,
and resets a DynamoDB Local table from that snapshot for repeatable testing
of the IGDD-3258 batch loader scripts (senders.sh, iis-allowed-users.sh,
provider-allowed-users.sh, apikey-domains.sh, jurisdiction-updates.sh).

Usage:
    python sync_dynamodb_local.py export --profile <aws-profile> [--table izgateway-dev-test]
    python sync_dynamodb_local.py reset-local [--table izgateway-dev-test]

The snapshot file (izgateway-dev-test-snapshot.json, alongside this script)
is intentionally gitignored -- it's a raw dump of current AWS state,
regenerable on demand, not a reviewed migration artifact.
"""
import argparse
import json
import os
from decimal import Decimal

import boto3

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_TABLE = "izgateway-dev-test"
DEFAULT_REGION = "us-east-1"
DEFAULT_ENDPOINT = "http://localhost:8000"
DEFAULT_FILE = os.path.join(SCRIPT_DIR, "izgateway-dev-test-snapshot.json")


class DynamoJSONEncoder(json.JSONEncoder):
    """Round-trips the two DynamoDB-native Python types json can't handle natively."""

    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        if isinstance(obj, set):
            return {"__set__": list(obj)}
        return super().default(obj)


def dynamo_json_decoder(obj):
    if set(obj.keys()) == {"__set__"}:
        return set(obj["__set__"])
    return obj


def scan_all(table):
    """Resource-level Table.scan() only returns one page; loop on LastEvaluatedKey."""
    items = []
    kwargs = {}
    while True:
        resp = table.scan(**kwargs)
        items.extend(resp["Items"])
        if "LastEvaluatedKey" not in resp:
            return items
        kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]


def cmd_export(args):
    session = boto3.Session(profile_name=args.profile, region_name=args.region)
    table = session.resource("dynamodb").Table(args.table)
    items = scan_all(table)
    with open(args.file, "w", encoding="utf-8") as f:
        json.dump(items, f, cls=DynamoJSONEncoder, indent=2)
    print(f"Exported {len(items)} items from '{args.table}' (profile: {args.profile or 'default'}) to {args.file}")


def cmd_reset_local(args):
    session = boto3.Session(
        aws_access_key_id="local",
        aws_secret_access_key="local",
        region_name=args.region,
    )
    client = session.client("dynamodb", endpoint_url=args.endpoint_url)

    if args.table in client.list_tables()["TableNames"]:
        print(f"Deleting existing local table '{args.table}'...")
        client.delete_table(TableName=args.table)
        client.get_waiter("table_not_exists").wait(TableName=args.table)

    print(f"Creating local table '{args.table}'...")
    client.create_table(
        TableName=args.table,
        AttributeDefinitions=[
            {"AttributeName": "entityType", "AttributeType": "S"},
            {"AttributeName": "sortKey", "AttributeType": "S"},
        ],
        KeySchema=[
            {"AttributeName": "entityType", "KeyType": "HASH"},
            {"AttributeName": "sortKey", "KeyType": "RANGE"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    client.get_waiter("table_exists").wait(TableName=args.table)

    with open(args.file, "r", encoding="utf-8") as f:
        items = json.load(f, object_hook=dynamo_json_decoder)

    table = session.resource("dynamodb", endpoint_url=args.endpoint_url).Table(args.table)
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)

    print(f"Loaded {len(items)} items into local table '{args.table}' at {args.endpoint_url}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p_export = sub.add_parser("export", help="Scan the real table and save a local JSON snapshot")
    p_export.add_argument("--table", default=DEFAULT_TABLE)
    p_export.add_argument("--profile", default=None, help="AWS SSO/named profile (default: default credential chain)")
    p_export.add_argument("--region", default=DEFAULT_REGION)
    p_export.add_argument("--file", default=DEFAULT_FILE)
    p_export.set_defaults(func=cmd_export)

    p_reset = sub.add_parser("reset-local", help="Delete/recreate the local table and reload the snapshot")
    p_reset.add_argument("--table", default=DEFAULT_TABLE)
    p_reset.add_argument("--region", default=DEFAULT_REGION)
    p_reset.add_argument("--endpoint-url", dest="endpoint_url", default=DEFAULT_ENDPOINT)
    p_reset.add_argument("--file", default=DEFAULT_FILE)
    p_reset.set_defaults(func=cmd_reset_local)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
