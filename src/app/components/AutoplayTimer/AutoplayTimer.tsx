"use client";

import { useEffect, useRef, useState } from "react";
import textToSprite from "../../utils/textToSprite";
import { useMultiplayer } from "../../hooks/multiplayerSession";
import { useGameContext } from "../../context/GameContext";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import styles from "./AutoplayTimer.module.scss";

/**
 * How long is left before a move is played for you.
 *
 * It reads the deadline the board published rather than counting down on its
 * own clock. A second timer would drift from the real one, and the number on
 * screen reaching zero a second before or after the move actually happens is
 * exactly the sort of thing that makes people doubt the whole feature.
 *
 * Shown on both turns and labelled with whose it is, so the wait always has a
 * number against it rather than only when you are the one holding things up.
 *
 * Mostly it keeps out of the way. A two minute clock ticking down through every
 * turn is a nag, and the number only matters near the end — so it surfaces
 * briefly now and then to say it is there, and stays up once the end is close.
 */

/** How often it surfaces to remind you it exists */
const PEEK_EVERY_MS = 30000;

/** How long it stays up when it does */
const PEEK_FOR_MS = 3000;

/** Seconds left at which it stops hiding and stays up for good */
const URGENT_AT = 10;

const AutoplayTimer = () => {
    const { autoplayAt } = useMultiplayer();
    const { turn } = useGameContext();
    const yourTurn = turn === "blue";
    const [now, setNow] = useState(() => Date.now());

    /**
     * When this turn's clock began. The peeks are spaced from the start of the
     * turn, not from whenever this component happened to mount, so they land at
     * the same points on both players' screens.
     */
    const startedAt = useRef(0);

    useEffect(() => {
        if (!autoplayAt) return;
        startedAt.current = Date.now();
        setNow(Date.now());
        const tick = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(tick);
    }, [autoplayAt]);

    if (!autoplayAt) return null;

    const secondsLeft = Math.max(0, Math.ceil((autoplayAt - now) / 1000));
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    const elapsed = now - startedAt.current;
    const urgent = secondsLeft <= URGENT_AT;

    // The first peek is one interval in: the turn has only just started, and
    // announcing that immediately is the nagging this is here to avoid
    const peeking = elapsed >= PEEK_EVERY_MS && elapsed % PEEK_EVERY_MS < PEEK_FOR_MS;

    return (
        /**
         * The showing and hiding is on this wrapper, not on the box. The box is
         * a dialog, and every dialog opens with an animation that fills its own
         * opacity — an animation beats a plain declaration, so a rule setting
         * opacity on the box itself simply never applied.
         */
        <div className={styles.wrap} data-shown={urgent || peeking} data-urgent={urgent}>
            <SimpleDialog metaTitle={null} dialog="timer" className={styles.timer}>
                <span className={styles.label}>{textToSprite(yourTurn ? "Your move" : "Their move")}</span>
                <span className={styles.clock}>
                    {textToSprite(`${minutes}:${String(seconds).padStart(2, "0")}`)}
                </span>
            </SimpleDialog>
        </div>
    );
};

export default AutoplayTimer;
