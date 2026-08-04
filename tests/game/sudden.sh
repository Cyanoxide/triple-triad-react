#!/bin/bash
# Run with the dev server up:  PHP_CLI_SERVER_WORKERS=8 php -S 127.0.0.1:8100 -t public
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
U="${U:-http://127.0.0.1:8100/game.php}"
D="$ROOT/public/gameSessions"
post() { curl -s -X POST "$U?action=$1" -H 'Content-Type: application/json' -d "$2"; }
err() { python3 -c "import sys,json;d=json.load(sys.stdin);print('   ->', d.get('error') or ('duplicate ignored' if d.get('duplicate') else 'accepted'))"; }

C=$(post create '{"rules":["open","suddenDeath"]}')
CODE=$(echo "$C" | python3 -c "import sys,json;print(json.load(sys.stdin)['room']['code'])")
HOST=$(echo "$C" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
HASH=$(echo "$C" | python3 -c "import sys,json;print(json.load(sys.stdin)['room']['rulesHash'])")
G=$(post join "{\"code\":\"$CODE\"}"); GUEST=$(echo "$G" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
post accept "{\"code\":\"$CODE\",\"token\":\"$GUEST\",\"rulesHash\":\"$HASH\"}" >/dev/null
post hand "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"hand\":[1,2,3,4,5]}" >/dev/null
post hand "{\"code\":\"$CODE\",\"token\":\"$GUEST\",\"hand\":[9,8,7,6,5]}" >/dev/null

echo "── round 1: play some moves, then a draw"
for i in 1 2 3; do post move "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"move\":{\"cardId\":$i,\"row\":0,\"col\":0}}" >/dev/null; done

echo "── the guest tries to announce sudden death (only the host narrates)"
post sudden "{\"code\":\"$CODE\",\"token\":\"$GUEST\"}" | err

echo "── the host announces it"
post sudden "{\"code\":\"$CODE\",\"token\":\"$HOST\"}" | err

echo "── both clients saw the draw at once, so the host retries immediately"
post sudden "{\"code\":\"$CODE\",\"token\":\"$HOST\"}" | err
echo "   (refused because no move has been played in the new round yet)"

echo
echo "── round 2 plays, then another draw -> a second sudden death IS allowed"
post move "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"move\":{\"cardId\":4,\"row\":1,\"col\":1}}" >/dev/null
post sudden "{\"code\":\"$CODE\",\"token\":\"$HOST\"}" | err

echo
echo "── someone finally wins; guest cannot report it, host can, twice is ignored"
post move "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"move\":{\"cardId\":5,\"row\":2,\"col\":2}}" >/dev/null
post result "{\"code\":\"$CODE\",\"token\":\"$GUEST\",\"winner\":\"guest\"}" | err
post result "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"winner\":\"host\"}" | err
post result "{\"code\":\"$CODE\",\"token\":\"$HOST\",\"winner\":\"host\"}" | err

echo
echo "── the log both clients replay"
curl -s "$U?action=state&code=$CODE&token=$GUEST&since=0" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('   ', ' '.join('%d:%s' % (e['n'], e['type']) for e in d['events']))
print('    phase:', d['room']['phase'])"
