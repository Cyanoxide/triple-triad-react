import { useCallback, useEffect, useRef, useState } from "react";
import playSound from "../utils/sounds";
import { useGameContext } from "../context/GameContext";

export type NavDirection = "up" | "down" | "left" | "right";
export type NavPageJump = "pageUp" | "pageDown";
type NavAction = NavDirection | NavPageJump | "confirm" | "cancel";

export interface CursorPos {
    group: string;
    index: number;
}

export interface NavGroup {
    id: string;
    size: number;
    isDisabled?: (index: number) => boolean;
}

export interface CursorNavOptions {
    groups: NavGroup[];
    initial: CursorPos | null;
    /** Where the cursor appears when a movement key is pressed while no cursor is shown */
    fallback?: CursorPos;
    enabled: boolean;
    /** Return "handled" when the movement performed its own side effect (e.g. a page flip) */
    resolveMove: (pos: CursorPos, dir: NavDirection, helpers: { wrap: (index: number, delta: 1 | -1, size: number) => number }) => CursorPos | "handled" | null;
    resolvePageJump?: (pos: CursorPos, dir: NavPageJump) => CursorPos | "handled" | null;
    onFocus: (pos: CursorPos) => void;
    onConfirm: (pos: CursorPos) => void;
    onCancel?: () => void;
}

const KEY_MAP: Record<string, NavAction> = {
    ArrowUp: "up", Numpad8: "up",
    ArrowDown: "down", Numpad2: "down",
    ArrowLeft: "left", Numpad4: "left",
    ArrowRight: "right", Numpad6: "right",
    Enter: "confirm", NumpadEnter: "confirm",
    Space: "cancel", Numpad0: "cancel", Insert: "cancel", Escape: "cancel",
    PageUp: "pageUp", Numpad9: "pageUp",
    PageDown: "pageDown", Numpad3: "pageDown",
};

const wrap = (index: number, delta: 1 | -1, size: number) => (index + delta + size) % size;

// When navigation is triggered by keyboard, the destination surface starts
// with its first item focused; mouse navigation starts with no cursor.
let keyboardNavIntent = false;

export const markKeyboardNavigation = () => {
    keyboardNavIntent = true;
};

export const consumeKeyboardNavIntent = () => {
    const intent = keyboardNavIntent;
    keyboardNavIntent = false;
    return intent;
};

const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable || target.tagName === "TEXTAREA") return true;
    return target instanceof HTMLInputElement && target.type !== "range";
};

export function useCursorNav(options: CursorNavOptions) {
    const { isSoundEnabled } = useGameContext();

    const [pos, setPos] = useState<CursorPos | null>(() => {
        if (consumeKeyboardNavIntent()) {
            return options.fallback ?? options.initial;
        }
        return options.initial;
    });

    const stateRef = useRef({ options, pos, isSoundEnabled });
    stateRef.current = { options, pos, isSoundEnabled };

    const initialFocusSentRef = useRef(false);

    const moveTo = useCallback((next: CursorPos, silent: boolean) => {
        const { options: opts, pos: current, isSoundEnabled: sound } = stateRef.current;
        const group = opts.groups.find(g => g.id === next.group);
        if (!group || next.index < 0 || next.index >= group.size) return;
        if (group.isDisabled?.(next.index)) return;
        if (current && current.group === next.group && current.index === next.index) return;

        setPos(next);
        if (!silent) playSound("select", sound);
        opts.onFocus(next);
    }, []);

    const focus = useCallback((next: CursorPos) => moveTo(next, false), [moveTo]);
    const setPosSilently = useCallback((next: CursorPos | null) => {
        setPos(next);
    }, []);

    // Initial focus renders the focused option's preview without the cursor sound
    useEffect(() => {
        if (initialFocusSentRef.current) return;
        initialFocusSentRef.current = true;
        if (stateRef.current.pos) stateRef.current.options.onFocus(stateRef.current.pos);
    }, []);

    // Clamp when a group shrinks underneath the cursor
    useEffect(() => {
        if (!pos) return;
        const group = options.groups.find(g => g.id === pos.group);
        if (group && group.size > 0 && pos.index >= group.size) {
            setPosSilently({ group: pos.group, index: group.size - 1 });
        }
    });

    useEffect(() => {
        if (!options.enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const { options: opts, pos: current } = stateRef.current;

            if (isEditableTarget(e.target)) return;

            const action = KEY_MAP[e.code];
            if (!action) return;
            if (e.metaKey || e.altKey || e.ctrlKey) return;

            e.preventDefault();
            if (e.repeat && (action === "confirm" || action === "cancel")) return;

            if (action === "confirm") {
                if (current) opts.onConfirm(current);
                else if (opts.fallback) moveTo(opts.fallback, false);
                return;
            }

            if (action === "cancel") {
                opts.onCancel?.();
                return;
            }

            if (!current) {
                if (opts.fallback) moveTo(opts.fallback, false);
                return;
            }

            const next = (action === "pageUp" || action === "pageDown")
                ? opts.resolvePageJump?.(current, action) ?? null
                : opts.resolveMove(current, action, { wrap });

            if (next === "handled" || !next) return;
            moveTo(next, false);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [options.enabled, moveTo]);

    const isFocused = useCallback((group: string, index: number) =>
        pos?.group === group && pos.index === index, [pos]);

    return { pos, focus, setPosSilently, isFocused };
}
