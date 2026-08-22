"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./PackDialog.module.scss";
import { useGameContext } from "../../context/GameContext";
import Card from "../Card/Card";
import cards from "../../../data/cards.json";
import playSound from "../../utils/sounds";
import textToSprite from "../../utils/textToSprite";
import { openPack, startPackCooldown } from "../../utils/cardPacks";

/**
 * Opening the daily pack.
 *
 * **This is the reward screen wearing a different hat**, deliberately. Winning
 * a card and pulling one out of a pack are the same moment as far as the player
 * is concerned, so they get the same background, the same Info. box naming the
 * card, and the same card-by-card sequence: flip, fly to the middle, hold,
 * leave. Anything more inventive would read as a screen from another game.
 *
 * The one thing it does not share is the *code*. See the note on the keyframes
 * in `PackDialog.module.scss`.
 */

/**
 * Everything here runs at this fraction of its written time, matching
 * `$speed` in `PackDialog.module.scss` — see the note there.
 */
const PACK_SPEED = 0.9;
const beat = (ms: number) => Math.round(ms * PACK_SPEED);

/** Where in the card's travel it is centred and holding, as a fraction of the
 *  `pack-card-preview` keyframes — the 40% mark. Tapping skips ahead to here. */
const CENTRED_AT = 0.4;

/**
 * How long one card owns the screen: the half second of flip, then the three
 * seconds of travel. Spaced so a card has left before the next is dealt —
 * anything shorter and two are in the air at once.
 */
const PER_CARD_MS = 3500;

/** Flip, then 40% of the travel: when the card is centred and the chime lands. */
const CENTRED_MS = 500 + 3000 * CENTRED_AT;

/** From this level up, a pull is worth an extra noise. */
const FLOURISH_FROM_LEVEL = 8;

interface PackDialogProps {
    onClose: () => void;
}

const PackDialog: React.FC<PackDialogProps> = ({ onClose }) => {
    const { playerCards, isSoundEnabled, dispatch } = useGameContext();

    /**
     * The pack is rolled once, on mount, and never again.
     *
     * In a ref rather than state, and behind a lazy initialiser rather than an
     * effect: React 19 in development mounts twice, and a roll in an effect
     * would deal a second pack over the first — the player would see one set of
     * cards and be credited another. This runs in render, but it touches
     * nothing outside itself, and the double invocation returns the same array
     * because the ref is only filled once.
     */
    const packRef = useRef<number[] | null>(null);
    if (packRef.current === null) packRef.current = openPack();
    const pack = packRef.current;

    /** How many cards have been dealt so far; the last one is the one moving. */
    const [revealedCount, setRevealedCount] = useState(0);
    const [currentIndex, setCurrentIndex] = useState<number | null>(null);

    /**
     * Waits that can be brought forward, so a tap moves the animations and the
     * sounds together. Lifted from the reward screen, where the reasoning is
     * written out in full.
     */
    const packScreen = useRef<HTMLDivElement>(null);
    const pending = useRef<{ id: number; run: () => void; fireAt: number }[]>([]);

    const after = useCallback((ms: number, run: () => void) => {
        const entry = { id: 0, run, fireAt: performance.now() + ms };
        entry.id = window.setTimeout(() => {
            pending.current = pending.current.filter(p => p !== entry);
            run();
        }, ms);
        pending.current.push(entry);
    }, []);

    useEffect(() => () => {
        pending.current.forEach(p => window.clearTimeout(p.id));
        pending.current = [];
    }, []);

    const skipToCentre = useCallback(() => {
        const screen = packScreen.current;
        if (!screen) return;

        // Only the ones still going: these are all `forwards`, so a finished
        // animation stays on the element and would be found first
        const running = screen.getAnimations({ subtree: true }).filter(a => a.playState === "running");
        const preview = running.find(a => (a as CSSAnimation).animationName?.includes("pack-card-preview"));
        if (!preview) return;

        const timing = preview.effect?.getComputedTiming();
        const duration = Number(timing?.duration ?? 0);
        const delay = Number(timing?.delay ?? 0);
        if (!duration) return;

        const jump = (delay + duration * CENTRED_AT) - Number(preview.currentTime ?? 0);
        if (jump <= 0) return;

        running.forEach(animation => {
            animation.currentTime = Number(animation.currentTime ?? 0) + jump;
        });

        pending.current.forEach(p => {
            window.clearTimeout(p.id);
            p.fireAt -= jump;
            p.id = window.setTimeout(() => {
                pending.current = pending.current.filter(q => q !== p);
                p.run();
            }, Math.max(0, p.fireAt - performance.now()));
        });
    }, []);

    /**
     * The cooldown starts when the pack is opened, not when the last card
     * lands. Closing the tab part way through the reveal is then still a pack
     * spent — otherwise the sequence could be abandoned and restarted until it
     * dealt something worth keeping.
     */
    useEffect(() => {
        startPackCooldown();
    }, []);

    /**
     * Deal the next card: hand it over, name it, make the noises, and book the
     * one after it.
     *
     * The credit happens as the card is dealt rather than at the end of the
     * screen, for the same reason the cooldown starts early — what has been
     * seen has been given.
     */
    const dealNext = useCallback(() => {
        const index = revealedCount;
        if (index >= pack.length) return;

        const cardId = pack[index];
        const card = cards.find(entry => entry.id === cardId);

        const updatedPlayerCards = { ...playerCards };
        updatedPlayerCards[cardId] = (updatedPlayerCards[cardId] ?? 0) + 1;

        dispatch({ type: "SET_PLAYER_CARDS", payload: updatedPlayerCards });
        if (typeof window !== "undefined") {
            localStorage.setItem("playerCards", JSON.stringify(updatedPlayerCards));
        }

        setCurrentIndex(index);
        setRevealedCount(index + 1);

        playSound("flip", isSoundEnabled);

        // As it reaches the middle. A high level card gets the spin on top of
        // the usual chime rather than instead of it, so the good ones sound
        // like the ordinary ones plus something, which is what they are.
        after(beat(CENTRED_MS), () => {
            playSound("success", isSoundEnabled);
            if ((card?.level ?? 0) >= FLOURISH_FROM_LEVEL) playSound("spin", isSoundEnabled);
        });
    }, [revealedCount, pack, playerCards, dispatch, isSoundEnabled, after]);

    /**
     * The sequence. Each card is dealt one beat after the last, and the screen
     * closes a beat after the fifth has left rather than the instant it does.
     */
    useEffect(() => {
        if (revealedCount >= pack.length) {
            after(beat(PER_CARD_MS), onClose);
            return;
        }
        after(beat(revealedCount === 0 ? 700 : PER_CARD_MS), dealNext);
        /*
         * `dealNext` is deliberately not a dependency. It is rebuilt on every
         * `playerCards` change — which this screen causes itself, once per card
         * — so listing it would re-book the wait each time a card is credited
         * and deal the rest of the pack in a rush.
         */
    }, [revealedCount]);

    const currentCardId = currentIndex === null ? null : pack[currentIndex];
    const currentCard = cards.find(card => card.id === currentCardId);

    /**
     * Blue for a card you did not already have, matching the reward screen's
     * colouring — the pack's job is filling gaps, so "this one is new" is the
     * thing worth picking out.
     *
     * Read from the count *before* this card was credited, or every card would
     * come out owned: it was added to `playerCards` in the same breath.
     */
    const isNewCard = !!currentCardId && (playerCards[currentCardId] ?? 0) <= 1;

    return (
        <div
            ref={packScreen}
            onClick={skipToCentre}
            className={`${styles.packContainer} flex flex-col items-center justify-center top-0 z-10 w-screen h-screen`}
        >
            {/*
              * A fixed height around the label, so the row below it does not
              * shift by the height of a dialog the moment the first card is
              * named. The clearance under the row is measured against this
              * being a known quantity — see the stylesheet.
              */}
            <div className={styles.dialogContainer}>
                <div className={`${styles.packDialog} ${currentCard ? "" : "invisible"}`} data-dialog="packInfo" data-animation={currentCard?.name}>
                    <h4 className={styles.meta} data-sprite="info.">Info.</h4>
                    <h3 className={styles.headingLine}>
                        {textToSprite(currentCard ? `${currentCard.name} card acquired` : "", isNewCard ? "blue" : "")}
                    </h3>
                </div>
            </div>

            <div className={`${styles.packRow} flex justify-center`}>
                {pack.map((cardId, index) => (
                    <div className={styles.cell} key={index}>
                        {/*
                          * Face down until its turn. `Card` hides a red card
                          * whenever no game is running, which is the only state
                          * this screen opens in, so switching the owner to blue
                          * is what turns it over — the same mechanism the
                          * reward screen uses, rather than a second one.
                          */}
                        <Card
                            id={cardId}
                            player={index < revealedCount ? "blue" : "red"}
                            data-dealt={index < revealedCount}
                            data-index={index}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PackDialog;
