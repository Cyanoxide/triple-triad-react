"use client";

import type { BoardType, CardType, PlayerType } from "../context/GameTypes";
import { generateCardsFromIds } from "./general";

/**
 * Development-only shortcuts for putting the game straight into a state that
 * normally takes a full match to reach.
 *
 * The reward screen is the reason this exists. Getting to it means playing nine
 * moves and then winning or losing the right way round, and some of what it
 * does — a trade that sends cards in both directions — only happens under one
 * rule. That is a slow loop for something that is mostly animation, and a slow
 * loop is how animation bugs survive.
 *
 * Everything here is gated on NODE_ENV, so none of it exists in a build.
 */

type Dispatch = (action: { type: string; payload?: unknown }) => void;

/** Five cards each, enough for the reward screen to have something to show */
const YOURS = [1, 2, 3, 4, 5];
const THEIRS = [6, 7, 8, 9, 10];

/**
 * A finished board. `initialOwner` and `currentOwner` differing is what the
 * direct rule reads as "this card changed hands", so the mix here decides how
 * many cards move each way.
 */
const finishedBoard = (
    flippedToYou: number,
    flippedToThem: number,
    yours: number[] = YOURS,
    theirs: number[] = THEIRS,
    flippedToYouIds?: number[],
    flippedToThemIds?: number[],
): BoardType => {
    // Which card sits in each flipped cell. By default it follows the hands in
    // order; a scenario can name them when it needs a particular card to move a
    // particular way — the same card going both ways, say.
    const toYou = flippedToYouIds ?? Array.from(
        { length: flippedToYou }, (_, i) => theirs[i % 5]);
    const toThem = flippedToThemIds ?? Array.from(
        { length: flippedToThem }, (_, i) => yours[(flippedToYou + i) % 5]);

    const cells: CardType[] = [];

    const cell = (cardId: number, owner: PlayerType, from: PlayerType): CardType => ({
        cardId,
        uniqueId: `preview-${cells.length}`,
        position: [Math.floor(cells.length / 3), cells.length % 3],
        currentOwner: owner,
        initialOwner: from,
    });

    toYou.forEach((id) => cells.push(cell(id, "blue", "red")));
    toThem.forEach((id) => cells.push(cell(id, "red", "blue")));

    // Whatever is left never changed hands, so it takes no part in a trade
    while (cells.length < 9) {
        const owner: PlayerType = cells.length % 2 ? "blue" : "red";
        cells.push(cell(owner === "blue" ? yours[cells.length % 5] : theirs[cells.length % 5], owner, owner));
    }

    return [cells.slice(0, 3), cells.slice(3, 6), cells.slice(6, 9)];
};

type Scenario = {
    /** Who won. "blue" is you. */
    winner: PlayerType;
    tradeRule: string;
    flippedToYou: number;
    flippedToThem: number;
    score: [number, number];
    /**
     * Hands, when the scenario needs particular cards in them. Defaults are
     * five each with nothing in common.
     */
    yours?: number[];
    theirs?: number[];
    /**
     * The cards in the flipped cells, when the order they fall in matters.
     * Ids in `flippedToYouIds` must exist in `theirs` and vice versa — a card
     * you take is one of theirs.
     */
    flippedToYouIds?: number[];
    flippedToThemIds?: number[];
};

const SCENARIOS: Record<string, Scenario> = {
    // You win and pick a card off them
    win: { winner: "blue", tradeRule: "one", flippedToYou: 4, flippedToThem: 1, score: [3, 7] },
    // You lose and they take one of yours
    loss: { winner: "red", tradeRule: "one", flippedToYou: 1, flippedToThem: 4, score: [7, 3] },
    // The interesting one: cards move both ways in a single sequence, so the
    // label has to change direction card by card
    direct: { winner: "blue", tradeRule: "direct", flippedToYou: 3, flippedToThem: 3, score: [4, 6] },
    /**
     * The same card in both hands, at the same hand index, moving both ways.
     *
     * Card 3 is third in each hand. A confirmed reward is an id and a position,
     * and both rows are tested against the same list — so this is the case
     * where one confirmed card matches in the player's row *and* the
     * opponent's, and the won and lost animations run on the same beat.
     *
     * Only the direct rule can produce it, and only when the duplicate happens
     * to sit at the same index in both hands, which is why it survived: it
     * cannot be reached by playing unless you are unlucky in a specific way.
     */
    directDuplicate: {
        winner: "blue", tradeRule: "direct", flippedToYou: 3, flippedToThem: 3, score: [4, 6],
        yours: [1, 2, 3, 4, 5], theirs: [6, 7, 3, 9, 10],
        // Card 3 goes **both ways**: you take their copy and they take yours.
        // Naming the ids is the point — left to fall in hand order the
        // duplicate only ever moves one way, which produces the cross-match
        // without showing the thing it causes.
        flippedToYouIds: [6, 7, 3],
        flippedToThemIds: [4, 5, 3],
    },
    // Everything changes hands
    all: { winner: "blue", tradeRule: "all", flippedToYou: 5, flippedToThem: 0, score: [2, 8] },
};

export const installPreview = (dispatch: Dispatch) => {
    if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return;

    const rewards = (name: keyof typeof SCENARIOS = "direct") => {
        const scenario = SCENARIOS[name];
        if (!scenario) {
            console.warn(`No such scenario. Try: ${Object.keys(SCENARIOS).join(", ")}`);
            return;
        }

        dispatch({ type: "SET_IS_MENU_OPEN", payload: false });
        dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: false });
        dispatch({ type: "SET_IS_GAME_ACTIVE", payload: true });
        dispatch({ type: "SET_RULES", payload: ["open"] });
        dispatch({ type: "SET_TRADE_RULE", payload: scenario.tradeRule });
        dispatch({ type: "SET_ENEMY_ID", payload: 1 });
        const yours = scenario.yours ?? YOURS;
        const theirs = scenario.theirs ?? THEIRS;

        dispatch({ type: "SET_PLAYER_HAND", payload: generateCardsFromIds(yours, "blue") });
        dispatch({ type: "SET_ENEMY_HAND", payload: generateCardsFromIds(theirs, "red") });
        dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: [] });
        dispatch({ type: "SET_CURRENT_ENEMY_HAND", payload: [] });
        dispatch({ type: "SET_BOARD", payload: finishedBoard(scenario.flippedToYou, scenario.flippedToThem, yours, theirs, scenario.flippedToYouIds, scenario.flippedToThemIds) });
        dispatch({ type: "SET_SCORE", payload: scenario.score });
        dispatch({ type: "SET_WIN_STATE", payload: scenario.winner });
        dispatch({ type: "SET_IS_REWARD_SELECTION_OPEN", payload: true });

        console.info(
            `Reward screen: "${name}" — ${scenario.winner === "blue" ? "you win" : "you lose"}, ` +
            `trade rule "${scenario.tradeRule}". Reload to get out.`,
        );
    };

    const api = {
        rewards,
        scenarios: () => Object.keys(SCENARIOS),
    };

    (window as unknown as { preview: typeof api }).preview = api;
};
