"use client";

import { useEffect, useState } from "react";
import textToSprite from "../../utils/textToSprite";
import { useMultiplayer } from "../../hooks/multiplayerSession";
import styles from "./AutoplayTimer.module.scss";

/**
 * How long is left before a move is played for you.
 *
 * It reads the deadline the board published rather than counting down on its
 * own clock. A second timer would drift from the real one, and the number on
 * screen reaching zero a second before or after the move actually happens is
 * exactly the sort of thing that makes people doubt the whole feature.
 *
 * Only shown while it is your turn, because that is the only time the clock is
 * running — the other player's countdown is their business and, on a background
 * tab, not something this client can know accurately anyway.
 */

/** Where it starts turning red, in seconds */
const URGENT_AT = 15;

const AutoplayTimer = () => {
    const { autoplayAt } = useMultiplayer();
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!autoplayAt) return;
        setNow(Date.now());
        const tick = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(tick);
    }, [autoplayAt]);

    if (!autoplayAt) return null;

    const secondsLeft = Math.max(0, Math.ceil((autoplayAt - now) / 1000));
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    return (
        <p className={styles.timer} data-urgent={secondsLeft <= URGENT_AT}>
            {textToSprite(`${minutes}:${String(seconds).padStart(2, "0")}`)}
        </p>
    );
};

export default AutoplayTimer;
