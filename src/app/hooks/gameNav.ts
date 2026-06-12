// Bridge between the Board-owned gameplay cursor and the Hand components,
// including the AI-driven cursor on the red hand.

export type HandFocus = { player: "blue" | "red"; index: number } | null;

let currentFocus: HandFocus = null;
const listeners = new Set<() => void>();

export const gameNav = {
    actions: {} as {
        /** Registered by the Board so hovering a blue hand card moves the shared cursor */
        focusHand?: (index: number) => void;
    },

    getFocus(): HandFocus {
        return currentFocus;
    },

    setFocus(focus: HandFocus) {
        if (focus === currentFocus) return;
        if (focus && currentFocus && focus.player === currentFocus.player && focus.index === currentFocus.index) return;
        currentFocus = focus;
        listeners.forEach((listener) => listener());
    },

    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
};
