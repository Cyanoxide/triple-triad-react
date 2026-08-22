"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import styles from "./PackButton.module.scss";
import playSound from "../../utils/sounds";
import { useGameContext } from "../../context/GameContext";
import { PACK_COOLDOWN_MS, readNextPackAt } from "../../utils/cardPacks";

/**
 * The daily pack, in the corner.
 *
 * A card back and nothing else. It is the same art the unopened cards in the
 * reveal are drawn with, so the button and the thing it opens are visibly one
 * feature — and it sits at the size of the option bar's icons opposite, so the
 * corners match.
 *
 * **The wait is the button's own background filling, not a clock.** A countdown
 * reading `18:42:07` is a number nobody can do anything with; it has to be read
 * and subtracted from before it means anything. A bar that is a third full says
 * "not yet, come back later" at a glance, which is the entire content of the
 * message. It also keeps the box square, so it stays an icon rather than
 * growing into a label the moment a pack is opened.
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

    useEffect(() => {
        setNextPackAt(readNextPackAt());
    }, []);

    /**
     * **One timer for the whole wait, not a tick.**
     *
     * The bar is a CSS animation running on the compositor (see the stylesheet),
     * so nothing has to re-render for it to move — and a `setInterval` re-running
     * this component every second for twenty-three hours to redraw a bar that
     * grows by a pixel an hour would be pure waste on a phone. The only moment
     * React needs to know about is the one where it finishes.
     */
    useEffect(() => {
        if (!nextPackAt) return;

        const ready = setTimeout(() => setNextPackAt(null), Math.max(0, nextPackAt - Date.now()));
        return () => clearTimeout(ready);
    }, [nextPackAt]);

    if (nextPackAt === undefined) return null;

    const isReady = nextPackAt === null;

    /**
     * How much of the wait is already done, expressed as a negative animation
     * delay: the fill is one 24-hour animation, started partway through. That is
     * what makes a reload pick the bar up where it left off instead of starting
     * it again — the elapsed time is derived from the stored deadline, so the
     * only state the bar has is that one timestamp.
     */
    const elapsed = isReady ? 0 : PACK_COOLDOWN_MS - (nextPackAt - Date.now());

    const handleOpen = () => {
        if (!isReady) {
            playSound("error", isSoundEnabled);
            return;
        }

        playSound("select", isSoundEnabled);
        onOpen();
    };

    return (
        <SimpleDialog metaTitle={null} dialog="pack">
            <button
                type="button"
                onClick={handleOpen}
                className={styles.packButton}
                data-ready={isReady}
                aria-label={isReady ? "Open the daily card pack" : "The daily card pack is not ready yet"}
            >
                {/*
                  * The unfilled part of the wait, shrinking away to the right
                  * and uncovering the panel underneath. Drawn as what is *left*
                  * rather than as a bar that grows, so the colour filling the
                  * button is the button's own background rather than a second
                  * colour laid over it.
                  */}
                {!isReady && (
                    <span
                        className={styles.charge}
                        style={{ animationDelay: `${-elapsed}ms` }}
                        aria-hidden="true"
                    />
                )}
                <Image src="/assets/cardback.png" alt="" width="27" height="27" className={styles.icon} />
            </button>
        </SimpleDialog>
    );
};

export default PackButton;
