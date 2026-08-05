"use client";

import { useEffect, useRef } from "react";

/**
 * Arrow keys, Enter and a way back, for the dialogs that are a plain grid of
 * options.
 *
 * The board's own `useCursorNav` is built around groups that resolve their own
 * movement, which suits a screen where the cursor crosses between a list, a
 * pane and a set of tabs. These dialogs are simpler than that: a handful of
 * options laid out in rows. Describing the layout directly is less machinery
 * than bending `resolveMove` around each screen, and it means the keyboard and
 * the eye agree — Down goes to the option below, not the next one in source
 * order.
 *
 * The selection is the caller's state, deliberately. It has to survive the
 * pointer leaving, and it has to be readable to draw the cursor, so there is
 * nothing for this to own.
 */

type Options = {
    /** The options as they are laid out: one array per visible row */
    layout: string[][];
    selected: string;
    onSelect: (id: string) => void;
    onConfirm: (id: string) => void;
    /** Escape, and Backspace where the caller has nothing better to do with it */
    onBack?: () => void;
    enabled?: boolean;
    /** Return true to keep Backspace — the code field uses it to delete */
    claimsBackspace?: () => boolean;
};

const find = (layout: string[][], id: string) => {
    for (let row = 0; row < layout.length; row++) {
        const col = layout[row].indexOf(id);
        if (col !== -1) return { row, col };
    }
    return null;
};

const clamp = (value: number, max: number) => Math.max(0, Math.min(value, max));

export function useMenuCursor({ layout, selected, onSelect, onConfirm, onBack, enabled = true, claimsBackspace }: Options) {
    // Held in a ref so the listener is bound once rather than re-bound on every
    // keystroke, which would drop keys pressed during the swap
    const state = useRef({ layout, selected, onSelect, onConfirm, onBack, claimsBackspace });
    state.current = { layout, selected, onSelect, onConfirm, onBack, claimsBackspace };

    useEffect(() => {
        if (!enabled) return;

        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const { layout: grid, selected: current, onSelect: select, onConfirm: confirm, onBack: back, claimsBackspace: claims } = state.current;
            if (!grid.length) return;

            const at = find(grid, current) ?? { row: 0, col: 0 };
            const move = (row: number, col: number) => {
                const nextRow = clamp(row, grid.length - 1);
                const nextCol = clamp(col, grid[nextRow].length - 1);
                const id = grid[nextRow][nextCol];
                if (id && id !== current) select(id);
            };

            switch (event.key) {
                case "ArrowUp":
                    event.preventDefault();
                    move(at.row - 1, at.col);
                    return;
                case "ArrowDown":
                    event.preventDefault();
                    move(at.row + 1, at.col);
                    return;
                case "ArrowLeft":
                    event.preventDefault();
                    move(at.row, at.col - 1);
                    return;
                case "ArrowRight":
                    event.preventDefault();
                    move(at.row, at.col + 1);
                    return;
                case "Enter":
                    event.preventDefault();
                    confirm(current);
                    return;
                case "Escape":
                    event.preventDefault();
                    back?.();
                    return;
                case "Backspace":
                    if (claims?.()) return;
                    event.preventDefault();
                    back?.();
                    return;
            }
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [enabled]);
}
