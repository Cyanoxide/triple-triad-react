#!/bin/bash
# Run with the dev server up:  PHP_CLI_SERVER_WORKERS=8 php -S 127.0.0.1:8100 -t public
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
U="${U:-http://127.0.0.1:8100/game.php}"
D="$ROOT/public/gameSessions"
echo "── hammering create 25 times from one address (limit is 20/hour)"
ok=0; refused=0; msg=""
for i in $(seq 1 25); do
  R=$(curl -s -X POST "$U?action=create" -H 'Content-Type: application/json' -d '{"rules":{}}')
  if echo "$R" | grep -q '"ok":true'; then ok=$((ok+1)); else refused=$((refused+1)); msg=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin).get('error',''))"); fi
done
echo "   created: $ok   refused: $refused"
echo "   refusal message: $msg"
echo
echo "── files actually on disk"
ls $D/*.json 2>/dev/null | wc -l | sed 's/^ */   rooms: /'
echo "   bookkeeping file: $(ls -la $D/.limits.json 2>/dev/null | awk '{print $5" bytes"}')"
echo "   (one file for ALL addresses, so rate limiting costs 1 inode, not 1 per visitor)"
