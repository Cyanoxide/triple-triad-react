"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
    /** Where it sits. The corner offsets belong to the caller, not to this. */
    className?: string;
    children: ReactNode;
};

/**
 * A box pinned to a corner of the window: Quit, the move clock, the options
 * bar, the links bar, Undo.
 *
 * **It renders outside `#app`, and that is the whole point.** `scaleApp` zooms
 * `#app`, and every one of these also carries `data-app-scaled`, which zooms
 * them again — so anything rendered inside `#app` is multiplied twice while the
 * options bar, which happens to be a sibling, is multiplied once. They came out
 * different sizes on a phone for that reason alone, and the offsets that were
 * meant to put them all on one margin did not.
 *
 * A portal fixes it without moving anything in the React tree: the DOM node
 * goes to `document.body`, the component stays where it is, and state, context
 * and cursor handling are untouched.
 *
 * Mounted-only, because a portal needs a DOM node the server does not have.
 */
const Furniture = ({ className = "", children }: Props) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return createPortal(
        <div className={className} data-app-scaled>{children}</div>,
        document.body,
    );
};

export default Furniture;
