/**
 * Talking to game.php.
 *
 * Every call is a small POST or GET returning JSON. Nothing here knows the rules
 * of Triple Triad — it moves messages, and the game decides what they mean.
 *
 * The one piece of state it keeps is the seat: the room code, the secret token
 * and which side you are. That lives in localStorage so a refresh rejoins the
 * game you were already in. Without it a reload would leave you locked out of
 * your own room, because the token is the only proof a seat is yours and the
 * server only hands it out once.
 */

export type Seat = "host" | "guest";

/** Where the room is up to. Mirrors the phases in game.php. */
export type Phase = "lobby" | "hands" | "playing" | "rewards" | "done";

export type RoomEvent = {
    n: number;
    type: "accepted" | "hand" | "start" | "move" | "sudden" | "result" | "rewards" | "rematch" | "left";
    by: Seat;
    at: number;
    hand?: number[];
    /** On a 'start' event: which seat opens, drawn at random by the room */
    first?: Seat;
    move?: { cardId: number; uniqueId?: string | null; row: number; col: number };
    winner?: string | null;
    score?: [number, number] | null;
    picks?: unknown[];
};

export type PlayerView = {
    present: boolean;
    accepted?: boolean;
    ready?: boolean;
    left?: boolean;
    seen?: number | null;
};

export type Room = {
    code: string;
    phase: Phase;
    rules: MultiplayerRules;
    rulesHash: string;
    players: Record<Seat, PlayerView>;
    seat: Seat | null;
};

/** What the host fixes and the guest agrees to before anything is dealt. */
export type MultiplayerRules = {
    rules: string[];
    tradeRule: string | null;
};

export type Session = { code: string; token: string; seat: Seat };

const ENDPOINT = "/game.php";
const STORAGE_KEY = "multiplayerSession";

class RoomError extends Error {}

async function call<T>(action: string, body: Record<string, unknown> = {}, query = ""): Promise<T> {
    const response = await fetch(`${ENDPOINT}?action=${action}${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
        // The server always explains itself, so pass its wording through rather
        // than inventing one — "That room is full" is more use than "failed"
        throw new RoomError(payload?.error ?? "Could not reach the game server.");
    }

    return payload as T;
}

export const createRoom = (rules: MultiplayerRules) =>
    call<{ token: string; room: Room }>("create", { rules });

export const joinRoom = (code: string, token?: string) =>
    call<{ token: string; room: Room }>("join", { code, token });

export const acceptRules = (code: string, token: string, rulesHash: string) =>
    call<{ room: Room }>("accept", { code, token, rulesHash });

export const submitHand = (code: string, token: string, hand: number[]) =>
    call<{ room: Room }>("hand", { code, token, hand });

export const sendMove = (code: string, token: string, move: NonNullable<RoomEvent["move"]>) =>
    call<{ event: RoomEvent }>("move", { code, token, move });

export const startSuddenDeath = (code: string, token: string) =>
    call<unknown>("sudden", { code, token });

export const reportResult = (code: string, token: string, winner: string | null, score: [number, number]) =>
    call<unknown>("result", { code, token, winner, score });

export const sendRewards = (code: string, token: string, picks: unknown[]) =>
    call<unknown>("rewards", { code, token, picks });

export const requestRematch = (code: string, token: string) =>
    call<{ room: Room }>("rematch", { code, token });

export const leaveRoom = (code: string, token: string) =>
    call<{ closed: boolean }>("leave", { code, token });

/** The poll. `since` is how much has already been applied. */
export const fetchState = (code: string, token: string, since: number) =>
    call<{ room: Room; events: RoomEvent[] }>("state", {}, `&code=${code}&token=${token}&since=${since}`);

/**
 * The seat, remembered across reloads.
 *
 * Deliberately not in React state: it has to be readable before the first render
 * so a refresh can resume the room, and it must survive the component tree being
 * torn down and rebuilt.
 */
export const saveSession = (session: Session) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
        // A private-mode browser refusing storage should cost a resumable game,
        // not the ability to play one
    }
};

export const loadSession = (): Session | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        return (session?.code && session?.token && session?.seat) ? session as Session : null;
    } catch {
        return null;
    }
};

export const clearSession = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch { /* nothing to do */ }
};

/** The room code carried in a shared link, e.g. ...com/?g=9V7P6 */
export const codeFromUrl = (): string | null => {
    if (typeof window === "undefined") return null;
    const code = new URLSearchParams(window.location.search).get("g");
    return code ? code.toUpperCase() : null;
};

export const linkForCode = (code: string): string => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.search = `?g=${code}`;
    url.hash = "";
    return url.toString();
};

/**
 * Takes the code out of the address bar once it has been used, so a later
 * refresh resumes from the stored session rather than trying to join again —
 * by then the room is full, and the second attempt would be refused.
 */
export const clearUrlCode = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("g")) return;
    url.searchParams.delete("g");
    window.history.replaceState({}, "", url.pathname + url.search);
};
