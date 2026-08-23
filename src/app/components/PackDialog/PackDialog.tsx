"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./PackDialog.module.scss";
import { useGameContext } from "../../context/GameContext";
import Card from "../Card/Card";
import cards from "../../../data/cards.json";
import playSound from "../../utils/sounds";
import textToSprite from "../../utils/textToSprite";
import { useCursorNav } from "../../hooks/useCursorNav";
import { openPack, startPackCooldown } from "../../utils/cardPacks";

/**
 * Opening a card pack.
 *
 * Five cards face down across the middle of the screen. Turning each one over
 * is the player's own click — the pack does not deal itself — and once all five
 * are up they sweep away into the collection together.
 *
 * **Styled after the reward screen** deliberately: same background, same Info.
 * box naming the card, same flip. Winning a card and pulling one out of a pack
 * are the same moment as far as the player is concerned, so a screen of its own
 * invention would read as being from another game. What it does not share is
 * that screen's *code* — see the note on the keyframes in the stylesheet.
 */

/** Everything here runs at this fraction of its written time; matches `$speed`. */
const PACK_SPEED = 0.9;
const beat = (ms: number) => Math.round(ms * PACK_SPEED);

/** Half way through the flip, where the face appears and the chime lands. */
const FLIP_MIDPOINT_MS = 250;

/** A moment to look at the full set before it is swept away. */
const BEFORE_COLLECT_MS = 1000;

/**
 * The sweep: one card's travel, plus the stagger across the other four.
 *
 * **Both have to match the stylesheet**, which is where the stagger is actually
 * applied — per cell, by `nth-child`, so it stays with the animation rather
 * than being computed here and passed in. These two only decide when the screen
 * closes, which has to be after the last card has gone.
 */
const COLLECT_MS = 800;
const COLLECT_STAGGER_MS = 80;

interface PackDialogProps {
    onClose: () => void;
}

const PackDialog: React.FC<PackDialogProps> = ({ onClose }) => {
    const { playerCards, isSoundEnabled, isCardGalleryOpen, dispatch } = useGameContext();

    /**
     * The pack is rolled once, on mount, and never again.
     *
     * In a ref behind a lazy initialiser rather than in an effect: React 19 in
     * development mounts twice, and a roll in an effect would deal a second
     * pack over the first — the player would see one set of cards and be
     * credited another. This runs during render but touches nothing outside
     * itself, and the double invocation returns the same array because the ref
     * is only ever filled once.
     *
     * The collection goes in so the roll can favour cards not yet held — the
     * pre-pack collection, necessarily, which is what this is: it is read
     * before the effect below credits anything.
     */
    const packRef = useRef<number[] | null>(null);
    if (packRef.current === null) packRef.current = openPack(playerCards);
    const pack = packRef.current;

    /**
     * Which cards were already owned *before* this pack, so a card can be
     * called new after it has been credited. Snapshotted for the same reason it
     * is a ref: `playerCards` is about to change underneath it.
     */
    const ownedBeforeRef = useRef<Record<number, number> | null>(null);
    if (ownedBeforeRef.current === null) ownedBeforeRef.current = { ...playerCards };

    const [revealed, setRevealed] = useState<number[]>([]);
    const [isCollecting, setIsCollecting] = useState(false);

    const allRevealed = revealed.length === pack.length;
    const lastRevealed = revealed.length ? pack[revealed[revealed.length - 1]] : null;

    /** Waits, tracked so they can all be dropped if the screen goes away early. */
    const pending = useRef<number[]>([]);

    const after = useCallback((ms: number, run: () => void) => {
        const id = window.setTimeout(() => {
            pending.current = pending.current.filter(p => p !== id);
            run();
        }, ms);
        pending.current.push(id);
    }, []);

    useEffect(() => () => {
        pending.current.forEach(window.clearTimeout);
        pending.current = [];
    }, []);

    /**
     * **The whole pack is credited on mount, before a single card is turned
     * over, and the cooldown starts in the same breath.**
     *
     * The reveal is the player's own pace now, which means the screen can sit
     * there half turned over for as long as they like — and a tab closed at
     * that point would otherwise take the unopened cards with it, after the
     * cooldown had already been spent on them. Handing the pack over up front
     * makes the flipping theatre: what is in it is decided and owned the moment
     * it is opened, and turning the cards over only reveals what is already
     * yours. It also closes the other end of it, where abandoning a poor reveal
     * and reloading would deal a fresh pack.
     */
    useEffect(() => {
        const updatedPlayerCards = { ...playerCards };
        pack.forEach(cardId => {
            updatedPlayerCards[cardId] = (updatedPlayerCards[cardId] ?? 0) + 1;
        });

        dispatch({ type: "SET_PLAYER_CARDS", payload: updatedPlayerCards });
        if (typeof window !== "undefined") {
            localStorage.setItem("playerCards", JSON.stringify(updatedPlayerCards));
        }

        startPackCooldown();
        /*
         * Once, on mount. `playerCards` is deliberately not a dependency: this
         * effect changes it, and reacting to that would credit the pack twice.
         */
    }, []);

    /**
     * **The sounds fire here in the click handler, not inside the `setRevealed`
     * updater.**
     *
     * They were in the updater, which is where a report of "the sound only
     * plays for the first card" pointed. An updater runs during the render
     * phase, where React may call it more than once, later than the event, or
     * on work it then throws away — no place for a side effect either way. A
     * click is a discrete event and `revealed` is current by the time one
     * arrives, so the guard can read it directly and the noise can be made
     * right here.
     *
     * Honest about the evidence: the original failure was never reproduced in a
     * browser here, so this is the anti-pattern being removed rather than a
     * confirmed diagnosis. What *is* measured is the state after — three sounds
     * on every one of the five reveals, not just the first.
     */
    const revealCard = useCallback((index: number) => {
        if (isCollecting || revealed.includes(index)) return;

        setRevealed(previous => previous.includes(index) ? previous : [...previous, index]);

        playSound("flip", isSoundEnabled);

        /*
         * The same chime for every card, whatever its level.
         *
         * A high level pull used to add `spin` on top. That clip is the sound
         * the board makes when the turn changes hands, and hearing it here read
         * as something having happened in a game rather than as a good card —
         * a borrowed meaning, and the wrong one. The frame on the card already
         * says how rare it is.
         */
        after(beat(FLIP_MIDPOINT_MS), () => playSound("success", isSoundEnabled));
    }, [isCollecting, revealed, pack, isSoundEnabled, after]);

    /** Once the last card is up, the set is admired briefly and then collected. */
    useEffect(() => {
        if (!allRevealed || isCollecting) return;

        after(beat(BEFORE_COLLECT_MS), () => {
            setIsCollecting(true);

            /*
             * One per card, on the same stagger the cards leave on, so the
             * sweep sounds like five cards being put down rather than one.
             *
             * Comfortably clear of `DEDUPE_MS` in `sounds.ts`, which collapses
             * the same clip fired twice inside 20ms — these are 72ms apart, so
             * all five are heard.
             */
            pack.forEach((_, index) => {
                after(beat(index * COLLECT_STAGGER_MS), () => playSound("place", isSoundEnabled));
            });

            after(beat(COLLECT_MS + COLLECT_STAGGER_MS * (pack.length - 1) + 300), onClose);
        });
        /*
         * Keyed to the last card going up, and nothing else. The other values
         * this reads are stable for the life of the screen.
         */
    }, [allRevealed]);

    /**
     * The same cursor the reward screen's card picker uses.
     *
     * Not decoration: turning the cards over is the only way off this screen,
     * so without a keyboard route to it anyone playing on the keyboard — which
     * the rest of the game supports throughout — would be stranded here with no
     * Escape and nothing to click.
     */
    const { focus, isFocused } = useCursorNav({
        groups: [{ id: "pack", size: pack.length, isDisabled: (index) => revealed.includes(index) }],
        initial: null,
        fallback: { group: "pack", index: 0 },
        enabled: !allRevealed && !isCollecting && !isCardGalleryOpen,
        resolveMove: (current, dir, { wrap }) => {
            if (dir !== "left" && dir !== "right") return null;
            return { group: "pack", index: wrap(current.index, dir === "right" ? 1 : -1, pack.length) };
        },
        onFocus: () => { },
        onConfirm: (current) => revealCard(current.index),
    });

    const lastCard = lastRevealed === null ? null : cards.find(card => card.id === lastRevealed);

    /**
     * Blue for a card that fills a gap, matching the reward screen's colouring —
     * the pack's job is filling gaps, so "this one is new" is the thing worth
     * picking out. Read from the snapshot, since the pack is already credited.
     */
    const isNewCard = !!lastRevealed && !(ownedBeforeRef.current?.[lastRevealed]);

    const headingText = lastCard ? `${lastCard.name} card acquired` : "Turn over your cards";

    return (
        <div className={`${styles.packContainer} flex items-center justify-center top-0 z-10 w-screen h-screen`}>
            {/*
              * Above the cards rather than in the column with them, so the row
              * itself is what sits in the middle of the screen. In flow it
              * pushed the cards down by its own height, and a box that appears
              * when the first card is named would have shunted them again.
              */}
            <div className={styles.dialogAnchor}>
                <div className={styles.packDialog} data-dialog="packInfo">
                    <h4 className={styles.meta} data-sprite="info.">Info.</h4>
                    <h3 className={styles.headingLine}>
                        {textToSprite(headingText, lastCard && isNewCard ? "blue" : "")}
                    </h3>
                </div>
            </div>

            <div className="flex justify-center">
                {pack.map((cardId, index) => {
                    const isRevealed = revealed.includes(index);

                    return (
                        <div
                            className={styles.cell}
                            key={index}
                            data-focused={isFocused("pack", index) && !isRevealed && !isCollecting}
                            onClick={() => revealCard(index)}
                            onMouseEnter={() => { if (!isRevealed && !isCollecting) focus({ group: "pack", index }); }}
                        >
                            {/*
                              * Face down until it is clicked. `Card` hides a red
                              * card whenever no game is running, which is the
                              * only state this screen opens in, so switching the
                              * owner to blue is what turns it over — the same
                              * mechanism the reward screen uses rather than a
                              * second one of our own.
                              */}
                            <Card
                                id={cardId}
                                player={isRevealed ? "blue" : "red"}
                                data-revealed={isRevealed}
                                data-collecting={isCollecting}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PackDialog;
