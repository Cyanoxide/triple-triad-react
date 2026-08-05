"use client";

import { useSyncExternalStore } from "react";
import type { Room, Session } from "../utils/rooms";

/**
 * The current multiplayer game, shared across screens.
 *
 * It lives outside React because it has to outlive the lobby. Once the rules
 * are agreed the lobby closes and card selection takes over, then the board —
 * but the polling has to keep running through all of it, so neither the session
 * nor the room can belong to any one of those components.
 *
 * The same external-store shape the options and pagination navigation already
 * use here, so `useSyncExternalStore` gives components a re-render when it
 * changes.
 */

type State = {
    session: Session | null;
    room: Room | null;
    /** Set once a hand has been sent, so the wait is not re-sent on every render */
    handSent: boolean;
    /** Why the last game ended, when it ended by itself rather than by leaving */
    notice: string | null;
    /**
     * Moves from the opponent, oldest first, waiting to be played out on the
     * board. A queue rather than a single slot because a reconnect replays the
     * whole log at once, and they have to land in order.
     */
    pendingMoves: OpponentMove[];
    /**
     * The winner's card picks, once they arrive. Only the "one" and "diff"
     * trade rules need this: "all" and "direct" are decided by the board, so
     * both clients work out the same answer without asking.
     */
    incomingRewards: RewardPick[] | null;
    /**
     * When a move will be played for you, as a timestamp. Held here rather than
     * in the board so the countdown beside Quit reads the same clock the timer
     * actually uses, instead of running a second one that could drift from it.
     */
    autoplayAt: number | null;
    /**
     * The room's shared source of randomness. Both clients derive the same
     * element squares from it, so the same move flips the same cards on both
     * boards — rolled separately they diverged and the scores drifted apart.
     */
    seed: number | null;
};

export type OpponentMove = { cardId: number; row: number; col: number };
export type RewardPick = { id: number; position: number };

const empty: State = { session: null, room: null, handSent: false, notice: null, pendingMoves: [], incomingRewards: null, autoplayAt: null, seed: null };

let state: State = empty;
const listeners = new Set<() => void>();

const emit = () => {
    listeners.forEach((listener) => listener());
};

export const multiplayer = {
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    },

    // Returns the same object until something actually changes, which is what
    // useSyncExternalStore needs to avoid an endless re-render
    get: () => state,

    setSession(session: Session | null) {
        state = { ...state, session, handSent: false, notice: null, pendingMoves: [], incomingRewards: null, autoplayAt: null, seed: null };
        emit();
    },

    /**
     * The room is gone — expired, or both players left. Drops the seat so the
     * lobby offers a fresh game instead of polling something that no longer
     * exists, which is otherwise a dead end with nothing but an error on screen.
     */
    ended(notice: string) {
        state = { session: null, room: null, handSent: false, notice, pendingMoves: [], incomingRewards: null, autoplayAt: null, seed: null };
        emit();
    },

    /** Drop the "why you are back here" line without touching the seat */
    clearNotice() {
        if (state.notice === null) return;
        state = { ...state, notice: null };
        emit();
    },

    setRoom(room: Room | null) {
        // A poll already in flight when the game ended still resolves, and it
        // used to put the finished room back — so the next lobby opened showing
        // the last game's rules. There is no seat, so there is no room.
        if (room && !state.session) return;

        if (state.room === room) return;
        state = { ...state, room };
        emit();
    },

    queueMove(move: OpponentMove) {
        state = { ...state, pendingMoves: [...state.pendingMoves, move] };
        emit();
    },

    /** The next move without consuming it, so it is not lost if it cannot be played yet */
    peekMove(): OpponentMove | null {
        return state.pendingMoves[0] ?? null;
    },

    /** Removes and returns the next move, so it cannot be played twice */
    takeMove(): OpponentMove | null {
        const [next, ...rest] = state.pendingMoves;
        if (!next) return null;
        state = { ...state, pendingMoves: rest };
        emit();
        return next;
    },

    setIncomingRewards(picks: RewardPick[] | null) {
        state = { ...state, incomingRewards: picks };
        emit();
    },

    /** Clears anything left from the round just finished, ready for another */
    startNewRound() {
        state = { ...state, pendingMoves: [], incomingRewards: null, autoplayAt: null, seed: null };
        emit();
    },

    setSeed(seed: number | null) {
        if (state.seed === seed) return;
        state = { ...state, seed };
        emit();
    },

    setAutoplayAt(at: number | null) {
        if (state.autoplayAt === at) return;
        state = { ...state, autoplayAt: at };
        emit();
    },

    markHandSent() {
        if (state.handSent) return;
        state = { ...state, handSent: true };
        emit();
    },

    reset() {
        state = empty;
        emit();
    },

    /** Which colour this client plays. Each side sees itself as blue. */
    get mySide() {
        return "blue" as const;
    },

    get opponentSide() {
        return "red" as const;
    },
};

/**
 * Ends the game and hands the room back. Used when a game finishes, when a
 * player quits, and when the other side disappears — all of which leave the
 * lobby ready to start another.
 */
export const finishMultiplayer = async (notice: string) => {
    const { session } = multiplayer.get();
    if (session) {
        const { leaveRoom, clearSession } = await import("../utils/rooms");
        await leaveRoom(session.code, session.token).catch(() => { });
        clearSession();
    }
    multiplayer.ended(notice);
};

export const useMultiplayer = () =>
    useSyncExternalStore(multiplayer.subscribe, multiplayer.get, () => empty);

/** True when a multiplayer game is in progress, as opposed to playing the AI. */
export const useIsMultiplayer = () => !!useMultiplayer().session;
