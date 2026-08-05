"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchState, type Room, type RoomEvent, type Session } from "../utils/rooms";

/**
 * Keeps one room in sync by polling.
 *
 * The cursor is the whole idea. `since` is how many events have already been
 * handed to the game, so each poll asks only for what is new. A fresh mount
 * starts at 0 and replays the room from the beginning, which is what makes a
 * refresh mid-game land exactly where it left off.
 *
 * Events are delivered through a callback rather than held in state. They are
 * instructions to act on once — play this move, start a sudden death round —
 * not data to render, and keeping them in state would invite replaying the same
 * move on an unrelated re-render.
 */

/** Slow enough to be nothing, fast enough that nobody notices. Turn-based. */
const POLL_MS = 1500;

/** Backed off to this while the tab is hidden — nobody is watching. */
const HIDDEN_POLL_MS = 10000;

type Options = {
    session: Session | null;
    onEvents: (events: RoomEvent[]) => void;
    enabled?: boolean;
};

export function useRoom({ session, onEvents, enabled = true }: Options) {
    const [room, setRoom] = useState<Room | null>(null);
    const [error, setError] = useState<string | null>(null);

    // How far the game has been advanced. A ref, not state: the poll loop must
    // read the current value without being restarted every time it moves.
    const cursor = useRef(0);
    const onEventsRef = useRef(onEvents);
    onEventsRef.current = onEvents;

    // Reset when the room changes, or a new game would resume another's cursor
    const code = session?.code ?? null;
    useEffect(() => {
        cursor.current = 0;
        setRoom(null);
        setError(null);
    }, [code]);

    const poll = useCallback(async () => {
        if (!session) return;
        try {
            const { room: next, events } = await fetchState(session.code, session.token, cursor.current);
            setRoom(next);
            setError(null);

            if (events.length) {
                // Moved before the callback runs: if applying an event throws,
                // the alternative is replaying it forever on every poll
                cursor.current = events[events.length - 1].n;
                onEventsRef.current(events);
            }
        } catch (problem) {
            setError(problem instanceof Error ? problem.message : "Lost contact with the game.");
        }
    }, [session]);

    useEffect(() => {
        if (!session || !enabled) return;

        let timer: number;
        let stopped = false;

        const tick = async () => {
            await poll();
            if (stopped) return;
            const wait = document.visibilityState === "visible" ? POLL_MS : HIDDEN_POLL_MS;
            timer = window.setTimeout(tick, wait);
        };

        tick();

        // Coming back to the tab should feel immediate rather than waiting out
        // the long interval it was backed off to
        const onVisible = () => {
            if (document.visibilityState !== "visible" || stopped) return;
            window.clearTimeout(timer);
            tick();
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            stopped = true;
            window.clearTimeout(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [session, enabled, poll]);

    /** Ask for the next poll now rather than waiting — used straight after acting */
    const refresh = useCallback(() => { void poll(); }, [poll]);

    return { room, error, refresh };
}
