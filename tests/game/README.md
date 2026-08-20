# game.php smoke tests

Plain curl against the room server — no browser, no React. Start the server
first, from the repo root:

    PHP_CLI_SERVER_WORKERS=8 php -S 127.0.0.1:8100 -t public

Then run any of these. Override the target with `U=` if it is somewhere else.

| script | what it proves |
|---|---|
| `mp.sh` | the whole flow: create, join, rules accepted (and a stale hash refused), both hands, moves, a stranger refused, incremental polling, replay from zero, result and rewards, a third player turned away |
| `race.sh` | no events are lost when both seats post at once |
| `lifecycle.sh` | a finished room survives for the loser to read the result, rematch recycles it, and it is removed once both players leave |
| `sudden.sh` | sudden death rounds, and that only the host narrates a draw or a result |
| `cap.sh` | creation is refused at `MAX_ROOMS`, the sweep reclaims expired rooms, and a read-only folder reports a real failure |
| `limits.sh` | the per-address hourly creation limit |

**`PHP_CLI_SERVER_WORKERS=8` matters.** Without it `php -S` handles requests one
at a time, and `race.sh` passes whether or not the locking is correct — it was
that setting that first exposed 2 of 20 moves being lost.

`cap.sh` and `limits.sh` write hundreds of files into `public/gameSessions/` and
clean up after themselves. They are gitignored, but do not run them against
anything live.
