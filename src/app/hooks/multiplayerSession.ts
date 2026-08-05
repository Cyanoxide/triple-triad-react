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
};

const empty: State = { session: null, room: null, handSent: false };

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
        state = { ...state, session, handSent: false };
        emit();
    },

    setRoom(room: Room | null) {
        if (state.room === room) return;
        state = { ...state, room };
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

export const useMultiplayer = () =>
    useSyncExternalStore(multiplayer.subscribe, multiplayer.get, () => empty);

/** True when a multiplayer game is in progress, as opposed to playing the AI. */
export const useIsMultiplayer = () => !!useMultiplayer().session;
