#!/bin/bash
# Run with the dev server up:  PHP_CLI_SERVER_WORKERS=8 php -S 127.0.0.1:8100 -t public
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
U="${U:-http://127.0.0.1:8100/game.php}"
D="$ROOT/public/gameSessions"
post() { curl -s -X POST "$U?action=$1" -H 'Content-Type: application/json' -d "$2"; }
count() { ls $D/*.json 2>/dev/null | wc -l | tr -d ' '; }

C=$(post create '{"rules":{"trade":"one"}}')
CODE=$(echo "$C" | python3 -c "import sys,json;print(json.load(sys.stdin)['room']['code'])")
HOST=$(echo "$C" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
HASH=$(echo "$C" | python3 -c "import sys,json;print(json.load(sys.stdin)['room']['rulesHash'])")
G=$(post join "{\"code\":\"$CODE\"}"); GUEST=$(echo "$G" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
post accept "{\"code\":\"$CODE\",\"token\":\"$GUEST\",\"rulesHash\":\"$HASH\"}" >/dev/null
post hand "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"hand\":[1,2,3,4,5]}" >/dev/null
post hand "{\"code\":\"$CODE\",\"token\":\"$GUEST\",\"hand\":[9,8,7,6,5]}" >/dev/null
post move "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"move\":{\"cardId\":1,\"row\":0,\"col\":0}}" >/dev/null
post result "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"winner\":\"host\"}" >/dev/null
post rewards "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"picks\":[{\"cardId\":9}]}" >/dev/null
echo "── game finished.  rooms on disk: $(count)   (still here, so the loser can read the result)"

echo
echo "── loser polls and learns what was taken"
curl -s "$U?action=state&code=$CODE&token=$GUEST&since=6" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('   phase:',d['room']['phase'],' events:',[(e['n'],e['type']) for e in d['events']])"

echo
echo "── REMATCH: recycles the same room"
post rematch "{\"code\":\"$CODE\",\"token\":\"$HOST\"}" | python3 -c "
import sys,json;d=json.load(sys.stdin);print('   phase now:',d['room']['phase'],' host ready:',d['room']['players']['host']['ready'])"
echo "   rooms on disk: $(count)   (no new file, no creation allowance used)"
echo "   event log continued, cursors still valid:"
curl -s "$U?action=state&code=$CODE&token=$GUEST&since=0" | python3 -c "
import sys,json;d=json.load(sys.stdin);print('    ',[(e['n'],e['type']) for e in d['events']])"

echo
echo "── one player leaves"
post leave "{\"code\":\"$CODE\",\"token\":\"$HOST\"}" | python3 -c "import sys,json;d=json.load(sys.stdin);print('   closed:',d['closed'])"
echo "   rooms on disk: $(count)   (kept — the other player is still here)"

echo
echo "── the second player leaves"
post leave "{\"code\":\"$CODE\",\"token\":\"$GUEST\"}" | python3 -c "import sys,json;d=json.load(sys.stdin);print('   closed:',d['closed'])"
echo "   rooms on disk: $(count)   (gone at completion, not waiting for the sweep)"

echo
echo "── and the room really is gone"
curl -s "$U?action=state&code=$CODE&token=$GUEST&since=0" | python3 -c "import sys,json;print('   ',json.load(sys.stdin).get('error'))"
