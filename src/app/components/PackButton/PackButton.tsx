"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import styles from "./PackButton.module.scss";
import textToSprite from "../../utils/textToSprite";
import playSound from "../../utils/sounds";
import { useGameContext } from "../../context/GameContext";
import { PACK_COOLDOWN_MS, formatCountdown, readNextPackAt } from "../../utils/cardPacks";

/**
 * The daily pack, in the corner.
 *
 * A card back and nothing else — the same art the unopened cards in the reveal
 * are drawn with, at the size of the option bar's icons opposite, so the
 * corners match.
 *
 * **Shut, it is only that icon, faded.** No clock and no bar: a pack still
 * charging is not asking for anything, and the fade is the whole message. The
 * exact time is worth having when it is actually wanted, so hovering or tapping
 * slides a second section out beside the icon — the same trick the options bar
 * opposite plays, and the same reason: quiet by default, complete on demand.
 *
 * That section carries the clock *and* the progress behind it, so the two
 * arrive and leave together. The bar measures the section rather than the whole
 * button, which is what keeps it off the card art.
 */

interface PackButtonProps {
    onOpen: () => void;
}

const PackButton: React.FC<PackButtonProps> = ({ onOpen }) => {
    const { isSoundEnabled } = useGameContext();

    /**
     * `undefined` until mounted, and nothing is drawn until then.
     *
     * The deadline lives in `localStorage`, which the server cannot read, so
     * rendering either state during the server pass guarantees one of them is
     * wrong and hydration tears. Waiting a frame costs nothing on a box that is
     * decoration until it is clicked.
     */
    const [nextPackAt, setNextPackAt] = useState<number | null | undefined>(undefined);
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    /**
     * **Open is derived, not toggled.**
     *
     * Hover covers a pointer; focus covers everything else. A tap focuses the
     * button — the click handler asks for it explicitly, because Safari on iOS
     * has not always given a `<button>` focus on its own — and moving focus
     * away is what closes it again. Keyboard users get it for free.
     *
     * The click used to flip this, which meant a second tap on an open box shut
     * it: you reached for the card, hit the only thing there, and the time you
     * were reading vanished.
     */
    const isOpen = isHovered || isFocused;
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        setNextPackAt(readNextPackAt());
    }, []);

    /**
     * **One timer for the whole wait, not a tick.**
     *
     * The bar is a CSS animation running on the compositor (see the
     * stylesheet), so nothing has to re-render for it to move, and waking this
     * component every second for twenty-three hours to redraw a bar that grows
     * by a pixel an hour would be pure waste on a phone. The only moment React
     * needs is the one where it finishes.
     */
    useEffect(() => {
        if (!nextPackAt) return;

        const ready = setTimeout(() => setNextPackAt(null), Math.max(0, nextPackAt - Date.now()));
        return () => clearTimeout(ready);
    }, [nextPackAt]);

    /**
     * The per-second tick exists only while the box is actually open and there
     * is a number on screen to keep honest. Shut, there is nothing to update.
     */
    useEffect(() => {
        if (!isOpen || !nextPackAt) return;

        setNow(Date.now());
        const tick = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(tick);
    }, [isOpen, nextPackAt]);

    if (nextPackAt === undefined) return null;

    const isReady = nextPackAt === null;

    /**
     * How much of the wait is already done, expressed as a negative animation
     * delay: the fill is one 24-hour animation, started partway through. That
     * is what makes a reload pick the bar up where it left off rather than
     * starting it again — the elapsed time is derived from the stored deadline,
     * so the only state the bar has is that one timestamp.
     */
    const elapsed = isReady ? 0 : PACK_COOLDOWN_MS - (nextPackAt - Date.now());

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (isReady) {
            playSound("select", isSoundEnabled);
            onOpen();
            return;
        }

        /*
         * There is nothing to open yet, so it refuses — and *only* refuses. It
         * deliberately does not close the box: on a touchscreen the button is
         * the only thing to press, so a tap that shut the clock would take away
         * the one thing the press was for.
         *
         * Asking for focus is what opens it on a phone, and what lets it close
         * again when focus moves on. On an already-open box it is a no-op, so
         * repeated taps just keep refusing.
         */
        playSound("error", isSoundEnabled);
        event.currentTarget.focus();
    };

    return (
        /**
         * **The fade lives on this wrapper, not on the box.**
         *
         * The box is a dialog, and every dialog opens with `boxOpen`, which
         * fills its own opacity — an animation's filled value beats a plain
         * declaration, so an `opacity` rule on the box itself is liable to
         * never apply at all. `AutoplayTimer` hit exactly this and solved it
         * the same way.
         */
        <div className={styles.wrap} data-ready={isReady} data-open={isOpen}>
            <SimpleDialog metaTitle={null} dialog="pack" data-expanded={!isReady && isOpen}>
            <button
                type="button"
                onClick={handleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={styles.packButton}
                data-ready={isReady}
                aria-label={isReady ? "Open the daily card pack" : `The next card pack is ready in ${formatCountdown(nextPackAt - now)}`}
            >
                <Image src="/assets/cardback.png" alt="" width="27" height="27" className={styles.icon} />

                {/*
                  * The clock and its progress, in a section of their own.
                  *
                  * Shut, the box clips to the icon's lane and this is simply
                  * not on screen — bar included. The bar belongs to the timer
                  * rather than sitting behind the card art, so the two arrive
                  * and leave together.
                  *
                  * `aria-hidden` because the button's own label already says
                  * how long is left; without it a screen reader reads the time
                  * twice, once as prose and once as loose digits.
                  */}
                {!isReady && (
                    <span className={styles.timer} aria-hidden="true">
                        {/*
                          * The unfilled part of the wait, shrinking away to the
                          * right and uncovering the panel underneath. Drawn as
                          * what is *left* rather than as a bar that grows, so
                          * the colour filling the section is the button's own
                          * background rather than a second colour laid over it.
                          *
                          * Both timings come from here: the stylesheet has no
                          * business knowing how long a cooldown is.
                          */}
                        <span
                            className={styles.charge}
                            style={{ animationDuration: `${PACK_COOLDOWN_MS}ms`, animationDelay: `${-elapsed}ms` }}
                        />
                        <span className={styles.clock}>{textToSprite(formatCountdown(nextPackAt - now))}</span>
                    </span>
                )}
            </button>
            </SimpleDialog>
        </div>
    );
};

export default PackButton;
