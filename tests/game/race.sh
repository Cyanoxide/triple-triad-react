#!/bin/bash
# Run with the dev server up:  PHP_CLI_SERVER_WORKERS=8 php -S 127.0.0.1:8100 -t public
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
U="${U:-http://127.0.0.1:8100/game.php}"
D="$ROOT/public/gameSessions"
post() { curl -s -X POST "$U?action=$1" -H 'Content-Type: application/json' -d "$2"; }
CREATE=$(post create '{"rules":{"trade":"one"}}')
CODE=$(echo "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['room']['code'])")
HOST=$(echo "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
JOIN=$(post join "{\"code\":\"$CODE\"}")
GUEST=$(echo "$JOIN" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
HASH=$(echo "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['room']['rulesHash'])")
post accept "{\"code\":\"$CODE\",\"token\":\"$GUEST\",\"rulesHash\":\"$HASH\"}" >/dev/null
post hand "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"hand\":[1,2,3,4,5]}" >/dev/null
post hand "{\"code\":\"$CODE\",\"token\":\"$GUEST\",\"hand\":[9,8,7,6,5]}" >/dev/null

# 20 moves fired from both seats at once, as fast as the machine will go
for i in $(seq 1 10); do
  post move "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"move\":{\"cardId\":$i,\"row\":0,\"col\":0}}" >/dev/null &
  post move "{\"code\":\"$CODE\",\"token\":\"$GUEST\",\"move\":{\"cardId\":$i,\"row\":1,\"col\":1}}" >/dev/null &
done
wait
curl -s "$U?action=state&code=$CODE&token=$HOST&since=0" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ev=d['events']
moves=[e for e in ev if e['type']=='move']
ns=[e['n'] for e in ev]
print('  events stored :', len(ev))
print('  moves stored  :', len(moves), 'of 20 fired')
print('  n sequence    :', 'contiguous 1..%d' % len(ns) if ns==list(range(1,len(ns)+1)) else 'GAPS/DUPES: %s' % ns)
print('  duplicate n   :', len(ns)-len(set(ns)))"
