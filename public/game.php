<?php
/**
 * Multiplayer rooms for Triple Triad.
 *
 * Lives in public/ so the build copies it into the export verbatim, which is
 * what gets uploaded. The game talks to it with fetch; every response is JSON.
 *
 * The model is an **append-only event log per room**. Clients ask "what has
 * happened since event N?" and apply what comes back in order. That one choice
 * buys most of the useful properties:
 *
 *  - **Reconnect is free.** A refresh replays the log from zero and arrives at
 *    the same board, because the same moves in the same order produce it.
 *  - **Animations survive.** Clients receive *moves* and play them through the
 *    same code a local move uses, rather than being handed a finished board and
 *    having to snap to it.
 *  - **No last-writer-wins.** Appending cannot clobber; overwriting shared state
 *    silently can.
 *
 * Deliberately not here: any validation that a move is *legal*. Both clients are
 * trusted. This is a proof of concept for friends, and the rules live in the
 * client. If that ever changes, this file is where the check would go — which is
 * the other reason the log holds moves rather than results.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

/**
 * Where room files live: a folder shipped alongside this file, carrying an
 * .htaccess that denies HTTP access. Room codes are short and guessable by
 * design, so the files must not be fetchable.
 *
 * That .htaccess is a second lock rather than the only one — it does nothing on
 * nginx, or on Apache with AllowOverride None, and a silent failure there would
 * expose every room. So tokens are also stored **hashed** (see seatFor): a
 * leaked room file is embarrassing but not usable.
 *
 * Set to an absolute path outside the web root if you would rather not rely on
 * the deny rule at all.
 */
const ROOM_DIR = null;

/** Rooms untouched for this long are swept. A game does not last a day. */
const ROOM_TTL = 86400;

/** Guards against a runaway client filling the disk */
const MAX_EVENTS = 500;

/** Ambiguous characters left out, since these get read aloud and typed by hand */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

function roomDir(): string
{
    $dir = ROOM_DIR ?? (__DIR__ . '/gameSessions');

    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
        // Recreated rather than assumed: if the folder went missing from an
        // upload, a bare mkdir would leave rooms sitting in a servable
        // directory with no deny rule at all
        @file_put_contents($dir . '/.htaccess', "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n");
    }

    return $dir;
}

function roomPath(string $code): string
{
    // Codes come from user input, so never let one reach the filesystem unchecked
    if (!preg_match('/^[A-Z0-9]{' . CODE_LENGTH . '}$/', $code)) {
        respond(400, ['ok' => false, 'error' => 'Bad room code.']);
    }
    return roomDir() . '/' . $code . '.json';
}

/**
 * Runs a change to a room under an exclusive lock held across the **whole**
 * read-modify-write.
 *
 * The lock has to span all three steps, and it is worth being precise about why.
 * `file_put_contents(..., LOCK_EX)` makes only the *write* atomic, which is not
 * enough: two requests can both read the same room, both append what they think
 * is event 5, and the second write silently discards the first. Measured with
 * eight concurrent workers, that lost 2 of 20 moves.
 *
 * Worse, the obvious invariant does not catch it. Both requests compute
 * `n = count + 1` from their own stale copy, so the numbering comes out
 * perfectly contiguous while events go missing. Only counting what was sent
 * against what was stored finds it.
 *
 * The callback is handed the room and returns [$room|null, $body, $status];
 * returning null for the room means "read only, do not write".
 *
 * `respond()` exits mid-callback in the error paths, which skips the unlock —
 * that is safe, because the OS drops the lock when the process ends, and PHP
 * ends the process at the close of the request.
 */
function withRoom(string $code, callable $mutate): never
{
    $path = roomPath($code);
    if (!is_file($path)) {
        respond(404, ['ok' => false, 'error' => 'That room has expired or never existed.']);
    }

    $handle = fopen($path, 'r+');
    if (!$handle || !flock($handle, LOCK_EX)) {
        respond(503, ['ok' => false, 'error' => 'That room is busy. Try again.']);
    }

    $room = json_decode((string) stream_get_contents($handle), true);
    if (!is_array($room)) {
        respond(500, ['ok' => false, 'error' => 'That room is unreadable.']);
    }

    [$updated, $body, $status] = $mutate($room);

    if ($updated !== null) {
        $updated['updated'] = time();
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($updated));
        fflush($handle);
    }

    flock($handle, LOCK_UN);
    fclose($handle);

    respond($status, $body);
}

/** Removes rooms nobody has touched in a day. Cheap, and runs only on create. */
function sweep(): void
{
    foreach (glob(roomDir() . '/*.json') ?: [] as $file) {
        if (filemtime($file) < time() - ROOM_TTL) {
            @unlink($file);
        }
    }
}

function newCode(): string
{
    do {
        $code = '';
        for ($i = 0; $i < CODE_LENGTH; $i++) {
            $code .= CODE_ALPHABET[random_int(0, strlen(CODE_ALPHABET) - 1)];
        }
    } while (is_file(roomDir() . '/' . $code . '.json'));

    return $code;
}

/** Canonical form, so both sides hash the same bytes regardless of key order */
function rulesHash(array $rules): string
{
    ksort($rules);
    return substr(hash('sha256', json_encode($rules)), 0, 16);
}

function append(array &$room, string $type, string $by, array $data = []): array
{
    if (count($room['events']) >= MAX_EVENTS) {
        respond(409, ['ok' => false, 'error' => 'This room has seen too many events.']);
    }
    $event = array_merge(['n' => count($room['events']) + 1, 'type' => $type, 'by' => $by, 'at' => time()], $data);
    $room['events'][] = $event;
    return $event;
}

/** What is written to disk. The client keeps the only copy of the real token. */
function tokenHash(string $token): string
{
    return hash('sha256', $token);
}

/**
 * Which seat this token holds, or null. The token is the whole of the identity.
 *
 * Compared against a stored hash, so a room file that somehow becomes readable
 * does not hand over the seats with it. hash_equals rather than === so a wrong
 * token cannot be found by timing the comparison.
 */
function seatFor(array $room, ?string $token): ?string
{
    if (!$token) return null;
    foreach (['host', 'guest'] as $seat) {
        $stored = $room['players'][$seat]['token'] ?? null;
        if ($stored && hash_equals($stored, tokenHash($token))) {
            return $seat;
        }
    }
    return null;
}

function requireSeat(array $room, ?string $token): string
{
    $seat = seatFor($room, $token);
    if (!$seat) {
        respond(403, ['ok' => false, 'error' => 'Not a player in this room.']);
    }
    return $seat;
}

/**
 * What a client is allowed to see. Tokens never go out — each player learns
 * their own once, when they take the seat.
 */
function publicRoom(array $room, ?string $seat): array
{
    $players = [];
    foreach (['host', 'guest'] as $key) {
        $p = $room['players'][$key] ?? null;
        $players[$key] = $p ? [
            'present' => true,
            'accepted' => (bool) ($p['accepted'] ?? false),
            'ready' => !empty($p['hand']),
            'seen' => $p['seen'] ?? null,
        ] : ['present' => false];
    }

    return [
        'code' => $room['code'],
        'phase' => $room['phase'],
        'rules' => $room['rules'],
        'rulesHash' => rulesHash($room['rules']),
        'players' => $players,
        'seat' => $seat,
    ];
}

$input = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($input)) $input = [];

$action = (string) ($_GET['action'] ?? $input['action'] ?? '');
$code = strtoupper((string) ($_GET['code'] ?? $input['code'] ?? ''));
$token = (string) ($_GET['token'] ?? $input['token'] ?? '');

switch ($action) {
    /**
     * The host opens a room and fixes the rules. Nothing else can happen until
     * a guest joins and agrees to them.
     *
     * Created with fopen 'x', which fails if the file exists, so two creates
     * landing on the same random code cannot both win.
     */
    case 'create': {
        sweep();
        $rules = is_array($input['rules'] ?? null) ? $input['rules'] : [];
        $hostToken = bin2hex(random_bytes(16));

        $room = [
            'code' => newCode(),
            'created' => time(),
            'updated' => time(),
            'phase' => 'lobby',
            'rules' => $rules,
            'players' => [
                'host' => ['token' => tokenHash($hostToken), 'accepted' => true, 'hand' => null, 'seen' => time()],
                'guest' => null,
            ],
            'events' => [],
        ];

        $handle = @fopen(roomPath($room['code']), 'x');
        if (!$handle) {
            respond(503, ['ok' => false, 'error' => 'Could not open a room. Try again.']);
        }
        fwrite($handle, json_encode($room));
        fclose($handle);

        respond(200, ['ok' => true, 'token' => $hostToken, 'room' => publicRoom($room, 'host')]);
    }

    case 'join':
        withRoom($code, function (array $room) use ($token) {
            // Rejoining with a token you already hold is not a second player —
            // this is what makes a refresh mid-game work rather than 409
            $existing = seatFor($room, $token);
            if ($existing) {
                return [null, ['ok' => true, 'token' => $token, 'room' => publicRoom($room, $existing)], 200];
            }
            if ($room['players']['guest'] !== null) {
                return [null, ['ok' => false, 'error' => 'That room is full.'], 409];
            }

            $guestToken = bin2hex(random_bytes(16));
            $room['players']['guest'] = ['token' => tokenHash($guestToken), 'accepted' => false, 'hand' => null, 'seen' => time()];

            return [$room, ['ok' => true, 'token' => $guestToken, 'room' => publicRoom($room, 'guest')], 200];
        });

    /**
     * The guest agrees to the rules they were shown. The hash is the point: it
     * pins the agreement to the exact rules on screen, so a host editing them
     * between the guest reading and accepting cannot slip the change through.
     */
    case 'accept':
        withRoom($code, function (array $room) use ($token, $input) {
            $seat = requireSeat($room, $token);
            if ($seat !== 'guest') {
                return [null, ['ok' => false, 'error' => 'Only the guest accepts the rules.'], 400];
            }
            if (($input['rulesHash'] ?? '') !== rulesHash($room['rules'])) {
                return [null, ['ok' => false, 'error' => 'The rules changed. Please review them again.'], 409];
            }

            $room['players']['guest']['accepted'] = true;
            $room['phase'] = 'hands';
            append($room, 'accepted', $seat);

            return [$room, ['ok' => true, 'room' => publicRoom($room, $seat)], 200];
        });

    /**
     * Each player submits the five cards they picked from their own collection.
     * Neither deals for the other — the hand is posted, not assigned. Once both
     * are in, play begins.
     */
    case 'hand':
        withRoom($code, function (array $room) use ($token, $input) {
            $seat = requireSeat($room, $token);
            if ($room['phase'] !== 'hands') {
                return [null, ['ok' => false, 'error' => 'Not the time to submit a hand.'], 409];
            }
            $hand = $input['hand'] ?? null;
            if (!is_array($hand) || count($hand) !== 5) {
                return [null, ['ok' => false, 'error' => 'A hand is five cards.'], 422];
            }

            $room['players'][$seat]['hand'] = $hand;
            append($room, 'hand', $seat, ['hand' => $hand]);

            if (!empty($room['players']['host']['hand']) && !empty($room['players']['guest']['hand'])) {
                $room['phase'] = 'playing';
                // The host moves first. Fixed rather than random so both clients
                // agree without another round trip.
                append($room, 'start', 'host');
            }

            return [$room, ['ok' => true, 'room' => publicRoom($room, $seat)], 200];
        });

    /** A card placed. Position and card only — the client works out the flips. */
    case 'move':
        withRoom($code, function (array $room) use ($token, $input) {
            $seat = requireSeat($room, $token);
            if ($room['phase'] !== 'playing') {
                return [null, ['ok' => false, 'error' => 'No game in progress.'], 409];
            }
            $move = $input['move'] ?? null;
            if (!is_array($move) || !isset($move['row'], $move['col'])) {
                return [null, ['ok' => false, 'error' => 'A move needs a card and a cell.'], 422];
            }

            $event = append($room, 'move', $seat, ['move' => $move]);

            return [$room, ['ok' => true, 'event' => $event], 200];
        });

    /**
     * The end of the game, and who takes what. The winner posts their picks;
     * the loser reads them and applies its own half. Nothing here writes to
     * anyone's collection — each client owns its own, and only ever removes
     * from or adds to itself.
     */
    case 'result':
        withRoom($code, function (array $room) use ($token, $input) {
            $seat = requireSeat($room, $token);
            $room['phase'] = 'rewards';
            append($room, 'result', $seat, [
                'winner' => $input['winner'] ?? null,
                'score' => $input['score'] ?? null,
            ]);
            return [$room, ['ok' => true], 200];
        });

    case 'rewards':
        withRoom($code, function (array $room) use ($token, $input) {
            $seat = requireSeat($room, $token);
            $picks = $input['picks'] ?? null;
            if (!is_array($picks)) {
                return [null, ['ok' => false, 'error' => 'Picks must be a list.'], 422];
            }

            append($room, 'rewards', $seat, ['picks' => $picks]);
            $room['phase'] = 'done';

            return [$room, ['ok' => true], 200];
        });

    /**
     * The poll. `since` is how far the client has already applied, so a
     * reconnect just asks from 0 and replays everything.
     */
    case 'state':
        withRoom($code, function (array $room) use ($token, $input) {
            $seat = seatFor($room, $token);
            $since = max(0, (int) ($_GET['since'] ?? $input['since'] ?? 0));
            $events = array_values(array_filter($room['events'], static fn($e) => $e['n'] > $since));

            $body = ['ok' => true, 'room' => publicRoom($room, $seat), 'events' => $events];

            // Only a seated player writes, and only to record a heartbeat; a
            // spectator polling never takes a write lock's worth of work
            if (!$seat) {
                return [null, $body, 200];
            }
            $room['players'][$seat]['seen'] = time();
            return [$room, $body, 200];
        });

    default:
        respond(400, ['ok' => false, 'error' => 'Unknown action.']);
}
