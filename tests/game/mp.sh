#!/bin/bash
# Run with the dev server up:  PHP_CLI_SERVER_WORKERS=8 php -S 127.0.0.1:8100 -t public
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
U="${U:-http://127.0.0.1:8100/game.php}"
D="$ROOT/public/gameSessions"
# Drives a whole two-player game through game.php with nothing but curl.
post() { curl -s -X POST "$U?action=$1" -H 'Content-Type: application/json' -d "$2"; }
get()  { curl -s "$U?action=$1&$2"; }
j() { python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps(d,separators=(',',':'))[:$1])"; }

echo "── host creates a room with rules"
CREATE=$(post create '{"rules":{"open":true,"same":true,"plus":false,"trade":"one"}}')
echo "$CREATE" | j 200
CODE=$(echo "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['room']['code'])")
HOST=$(echo "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
HASH=$(echo "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['room']['rulesHash'])")
echo "   code=$CODE"

echo
echo "── guest joins and sees the rules"
JOIN=$(post join "{\"code\":\"$CODE\"}")
echo "$JOIN" | j 200
GUEST=$(echo "$JOIN" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

echo
echo "── guest accepts with a STALE hash (should be refused)"
post accept "{\"code\":\"$CODE\",\"token\":\"$GUEST\",\"rulesHash\":\"deadbeefdeadbeef\"}" | j 200

echo
echo "── guest accepts with the right hash"
post accept "{\"code\":\"$CODE\",\"token\":\"$GUEST\",\"rulesHash\":\"$HASH\"}" | j 160

echo
echo "── each player posts their OWN hand"
post hand "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"hand\":[1,2,3,4,5]}" > /dev/null
post hand "{\"code\":\"$CODE\",\"token\":\"$GUEST\",\"hand\":[9,8,7,6,5]}" | j 160

echo
echo "── a stranger with the code but no token tries to move"
post move "{\"code\":\"$CODE\",\"token\":\"nope\",\"move\":{\"cardId\":1,\"row\":0,\"col\":0}}" | j 120

echo
echo "── host and guest alternate moves"
post move "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"move\":{\"cardId\":1,\"row\":0,\"col\":0}}" | j 120
post move "{\"code\":\"$CODE\",\"token\":\"$GUEST\",\"move\":{\"cardId\":9,\"row\":1,\"col\":1}}" | j 120

echo
echo "── guest polls from scratch (a reconnect): full replay"
get state "code=$CODE&token=$GUEST&since=0" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  phase:', d['room']['phase'], ' seat:', d['room']['seat'])
for e in d['events']: print('   ', e['n'], e['type'], e['by'], {k:v for k,v in e.items() if k in ('move','hand')})"

echo
echo "── host polls incrementally (since=4): only what is new"
get state "code=$CODE&token=$HOST&since=4" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  events:', [(e['n'],e['type']) for e in d['events']])"

echo
echo "── result + winner's picks"
post result "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"winner\":\"host\",\"score\":[6,4]}" | j 60
post rewards "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"picks\":[{\"cardId\":9}]}" | j 60
get state "code=$CODE&token=$GUEST&since=6" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  phase:', d['room']['phase'])
for e in d['events']: print('   ', e['n'], e['type'], e['by'], {k:v for k,v in e.items() if k in ('winner','picks','score')})"

echo
echo "── a third person tries to take a seat"
post join "{\"code\":\"$CODE\"}" | j 100
