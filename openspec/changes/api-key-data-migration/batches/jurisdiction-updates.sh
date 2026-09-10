#!/usr/bin/env bash
# jurisdiction-updates.sh
#
# Sets allowedUseTypes (and useTypes for IIS senders) on existing Jurisdiction records
# and creates the missing CCUAT (id=64) Jurisdiction record.
# useTypes=PUBLIC_HEALTH marks a jurisdiction as an IIS-to-IIS sender.
#
# Usage: TABLE=izgw-hub bash jurisdiction-updates.sh
# Requires: aws CLI, AWS credentials with DynamoDB write access

set -uo pipefail
TABLE="${TABLE:-izgw-hub}"
COUNT=0
FAILURES=0

# allowedUseTypes=PROVIDER|PUBLIC_HEALTH  useTypes=PUBLIC_HEALTH
# 5=ar(Arkansas), 6=az(Arizona), 8=co(Colorado), 9=ct(Connecticut), 11=de(Delaware), 12=fl(Florida), 17=il(Illinois), 18=in(Indiana), 19=ks(Kansas), 20=ky(Kentucky), 21=la(Louisiana), 23=md(Maryland), 25=mi(Michigan), 28=ms(Mississippi), 35=nm(New Mexico), 36=nv(Nevada), 38=nyc(New York City), 39=oh(Ohio), 40=ok(Oklahoma), 41=or(Oregon), 42=ph(Pennsylvania - Philadelphia), 43=pa(Pennsylvania), 50=pr(Puerto Rico), 51=ri(Rhode Island), 53=sd(South Dakota), 54=tn(Tennessee), 56=vi(U.S. Virgin Islands), 58=va(Virginia), 60=wa(Washington), 61=wi(Wisconsin), 62=wv(West Virginia)
for ID in 5 6 8 9 11 12 17 18 19 20 21 23 25 28 35 36 38 39 40 41 42 43 50 51 53 54 56 58 60 61 62; do
  if aws dynamodb update-item --table-name "$TABLE" \
    --key '{"entityType":{"S":"Jurisdiction"},"sortKey":{"S":"'$ID'"}}' \
    --update-expression 'SET allowedUseTypes = :aut, useTypes = :ut' \
    --expression-attribute-values '{":aut":{"SS": ["PROVIDER", "PUBLIC_HEALTH"]},":ut":{"SS": ["PUBLIC_HEALTH"]}}'; then
    echo "  OK:     UPDATE Jurisdiction/${ID}"
    COUNT=$((COUNT + 1))
  else
    echo "  FAILED: UPDATE Jurisdiction/${ID} (rc=$?)" >&2
    FAILURES=$((FAILURES + 1))
  fi
done

# allowedUseTypes=PROVIDER  useTypes=(none)
# 7=ca(California), 13=ga(Georgia), 15=ia(Iowa), 22=ma(Massachusetts), 29=mt(Montana), 30=nc(North Carolina), 32=ne(Nebraska), 33=nh(New Hampshire), 37=ny(New York State), 52=sc(South Carolina), 59=vt(Vermont)
for ID in 7 13 15 22 29 30 32 33 37 52 59; do
  if aws dynamodb update-item --table-name "$TABLE" \
    --key '{"entityType":{"S":"Jurisdiction"},"sortKey":{"S":"'$ID'"}}' \
    --update-expression 'SET allowedUseTypes = :aut' \
    --expression-attribute-values '{":aut":{"SS": ["PROVIDER"]}}'; then
    echo "  OK:     UPDATE Jurisdiction/${ID}"
    COUNT=$((COUNT + 1))
  else
    echo "  FAILED: UPDATE Jurisdiction/${ID} (rc=$?)" >&2
    FAILURES=$((FAILURES + 1))
  fi
done

# allowedUseTypes=PATIENT|PROVIDER|PUBLIC_HEALTH  useTypes=PUBLIC_HEALTH
# 3=ak(Alaska), 10=dc(District of Columbia), 27=mo(Missouri), 31=nd(North Dakota), 34=nj(New Jersey), 57=ut(Utah), 63=wy(Wyoming)
for ID in 3 10 27 31 34 57 63; do
  if aws dynamodb update-item --table-name "$TABLE" \
    --key '{"entityType":{"S":"Jurisdiction"},"sortKey":{"S":"'$ID'"}}' \
    --update-expression 'SET allowedUseTypes = :aut, useTypes = :ut' \
    --expression-attribute-values '{":aut":{"SS": ["PATIENT", "PROVIDER", "PUBLIC_HEALTH"]},":ut":{"SS": ["PUBLIC_HEALTH"]}}'; then
    echo "  OK:     UPDATE Jurisdiction/${ID}"
    COUNT=$((COUNT + 1))
  else
    echo "  FAILED: UPDATE Jurisdiction/${ID} (rc=$?)" >&2
    FAILURES=$((FAILURES + 1))
  fi
done

# allowedUseTypes=PUBLIC_HEALTH  useTypes=PUBLIC_HEALTH
# 4=al(Alabama), 44=as(PI - American Samoa), 45=fm(PI - Federated States of Micronesia), 46=pw(PI - Palau), 47=gu(PI - Guam), 48=mp(PI - Commonwealth of the Mariana Islands), 49=mh(PI - Republic of the Marshall Islands)
for ID in 4 44 45 46 47 48 49; do
  if aws dynamodb update-item --table-name "$TABLE" \
    --key '{"entityType":{"S":"Jurisdiction"},"sortKey":{"S":"'$ID'"}}' \
    --update-expression 'SET allowedUseTypes = :aut, useTypes = :ut' \
    --expression-attribute-values '{":aut":{"SS": ["PUBLIC_HEALTH"]},":ut":{"SS": ["PUBLIC_HEALTH"]}}'; then
    echo "  OK:     UPDATE Jurisdiction/${ID}"
    COUNT=$((COUNT + 1))
  else
    echo "  FAILED: UPDATE Jurisdiction/${ID} (rc=$?)" >&2
    FAILURES=$((FAILURES + 1))
  fi
done

# allowedUseTypes=PATIENT|PROVIDER  useTypes=(none)
# 16=id(Idaho), 24=me(Maine), 26=mn(Minnesota)
for ID in 16 24 26; do
  if aws dynamodb update-item --table-name "$TABLE" \
    --key '{"entityType":{"S":"Jurisdiction"},"sortKey":{"S":"'$ID'"}}' \
    --update-expression 'SET allowedUseTypes = :aut' \
    --expression-attribute-values '{":aut":{"SS": ["PATIENT", "PROVIDER"]}}'; then
    echo "  OK:     UPDATE Jurisdiction/${ID}"
    COUNT=$((COUNT + 1))
  else
    echo "  FAILED: UPDATE Jurisdiction/${ID} (rc=$?)" >&2
    FAILURES=$((FAILURES + 1))
  fi
done

# allowedUseTypes=PATIENT|PROVIDER|PUBLIC_HEALTH  useTypes=(none)
# 1=dev(Development Testing)
for ID in 1; do
  if aws dynamodb update-item --table-name "$TABLE" \
    --key '{"entityType":{"S":"Jurisdiction"},"sortKey":{"S":"'$ID'"}}' \
    --update-expression 'SET allowedUseTypes = :aut' \
    --expression-attribute-values '{":aut":{"SS": ["PATIENT", "PROVIDER", "PUBLIC_HEALTH"]}}'; then
    echo "  OK:     UPDATE Jurisdiction/${ID}"
    COUNT=$((COUNT + 1))
  else
    echo "  FAILED: UPDATE Jurisdiction/${ID} (rc=$?)" >&2
    FAILURES=$((FAILURES + 1))
  fi
done

# allowedUseTypes=(none)  useTypes=(none)
# 14=hi(Hawaii)
for ID in 14; do
  if aws dynamodb update-item --table-name "$TABLE" \
    --key '{"entityType":{"S":"Jurisdiction"},"sortKey":{"S":"'$ID'"}}' \
    --update-expression 'REMOVE allowedUseTypes'; then
    echo "  OK:     UPDATE Jurisdiction/${ID}"
    COUNT=$((COUNT + 1))
  else
    echo "  FAILED: UPDATE Jurisdiction/${ID} (rc=$?)" >&2
    FAILURES=$((FAILURES + 1))
  fi
done

# allowedUseTypes=PROVIDER|PUBLIC_HEALTH  useTypes=(none)
# 55=tx(Texas)
for ID in 55; do
  if aws dynamodb update-item --table-name "$TABLE" \
    --key '{"entityType":{"S":"Jurisdiction"},"sortKey":{"S":"'$ID'"}}' \
    --update-expression 'SET allowedUseTypes = :aut' \
    --expression-attribute-values '{":aut":{"SS": ["PROVIDER", "PUBLIC_HEALTH"]}}'; then
    echo "  OK:     UPDATE Jurisdiction/${ID}"
    COUNT=$((COUNT + 1))
  else
    echo "  FAILED: UPDATE Jurisdiction/${ID} (rc=$?)" >&2
    FAILURES=$((FAILURES + 1))
  fi
done

# CCUAT (id=64) is not present in existing Jurisdiction exports; create/update it.
if aws dynamodb update-item --table-name "$TABLE" \
  --key '{"entityType":{"S":"Jurisdiction"},"sortKey":{"S":"64"}}' \
  --update-expression 'SET jurisdictionId = :jid, #d = :desc, #n = :name, prefix = :p, allowedUseTypes = :aut' \
  --expression-attribute-names '{"#d":"description","#n":"name"}' \
  --expression-attribute-values '{":jid":{"N":"64"},":desc":{"S":"CCUAT"},":name":{"S":"CCUAT"},":p":{"S":"ccuat"},":aut":{"SS":["PATIENT","PROVIDER","PUBLIC_HEALTH"]}}'; then
  echo "  OK:     UPDATE Jurisdiction/64"
  COUNT=$((COUNT + 1))
else
  echo "  FAILED: UPDATE Jurisdiction/64 (rc=$?)" >&2
  FAILURES=$((FAILURES + 1))
fi

echo "Done. $COUNT Jurisdiction records written/updated in $TABLE. Failures: $FAILURES."
