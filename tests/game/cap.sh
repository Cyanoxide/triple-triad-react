#!/bin/bash
# Run with the dev server up:  PHP_CLI_SERVER_WORKERS=8 php -S 127.0.0.1:8100 -t public
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
U="${U:-http://127.0.0.1:8100/game.php}"
D="$ROOT/public/gameSessions"
rm -f $D/*.json $D/.limits.json

echo "── fabricate 500 fresh rooms (the cap)"
for i in $(seq 1 500); do printf '{"code":"T%04d","events":[]}' $i > "$D/T$(printf '%04d' $i).json"; done
echo "   files: $(ls $D/*.json | wc -l | tr -d ' ')"
R=$(curl -s -X POST "$U?action=create" -H 'Content-Type: application/json' -d '{"rules":{}}')
echo "   create -> $(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('error') or 'ALLOWED (cap not working)')")"

echo
echo "── age them past the TTL, then try again"
find "$D" -name 'T*.json' -exec touch -t 202501010000 {} +
rm -f $D/.limits.json
R=$(curl -s -X POST "$U?action=create" -H 'Content-Type: application/json' -d '{"rules":{}}')
echo "   create -> $(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);print('ALLOWED, code '+d['room']['code'] if d.get('ok') else d.get('error'))")"
echo "   files after sweep: $(ls $D/*.json 2>/dev/null | wc -l | tr -d ' ')  (the 500 stale ones reclaimed)"

echo
echo "── now make the folder unwritable, so unlink fails silently"
chmod 500 "$D"
for i in $(seq 1 501); do :; done
R=$(curl -s -X POST "$U?action=create" -H 'Content-Type: application/json' -d '{"rules":{}}')
echo "   (folder read-only) create -> $(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('error') or 'allowed')")"
chmod 700 "$D"
rm -f $D/*.json $D/.limits.json
