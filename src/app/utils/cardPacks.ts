import cards from "../../data/cards.json";
import players from "../../data/players.json";

/**
 * The daily card pack: what is in it, how likely each card is, and when the
 * next one is due.
 *
 * Kept apart from the screen that opens it so the odds can be reasoned about —
 * and adjusted — without reading an animation sequence, and so the weights can
 * be sampled from a script when tuning them.
 */

/** How many cards a pack holds. */
export const PACK_SIZE = 5;

/** How long after opening one before the next is due. */
export const PACK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** When the next pack unlocks, as epoch ms. Absent means one is ready now. */
const STORAGE_KEY = "nextPackAt";

/**
 * **Cards you can already win from someone are not in packs.**
 *
 * The whole point of the collection is walking the world and beating the person
 * who holds the card you want. A pack that could hand you Ifrit undoes that, so
 * the pack draws only from what no opponent carries — every id in a player's
 * hand or held as their rare card is out, which leaves 88 of the 110.
 *
 * Inactive players count too. `active` is a switch on whether that opponent is
 * currently in the game, not a statement about the card, and one being switched
 * back on should not quietly put a card in two places at once.
 *
 * **The CC Group's `rareCard: "Any"` excludes nothing.** Eight players carry
 * that string instead of an id. It names no card, and the game does not treat
 * it as a wildcard either — `aiCardSelection` coerces `rareCard` with `+`, so
 * "Any" becomes `NaN` and no rare card is ever added to those hands. Reading it
 * as "every card is obtainable" would empty the pool outright; ignoring it
 * matches what those opponents actually do.
 */
const rareCardIds = players
    .map(player => player.rareCard)
    .filter((rareCard): rareCard is number => typeof rareCard === "number");

const obtainableFromPlayers = new Set<number>([
    ...players.flatMap(player => player.cards),
    ...rareCardIds,
]);

/**
 * Wall (level 0) is excluded as well. It is not a card anyone collects — it has
 * no rarity, sits outside the level bands the frames are drawn for, and a 10/10
 * on all four sides would be the best card in the game by a distance.
 */
const packPool = cards.filter(card => card.level > 0 && !obtainableFromPlayers.has(card.id));

/**
 * The level bands, weighted per slot.
 *
 * **Levels are the rarity.** The card art already carries a different frame at
 * 1-5, 6-7, 8-9 and 10, so a pack that pushes a level up is visibly a better
 * pull without inventing a second rarity scale on top of the one on screen.
 *
 * Four slots roll on `STANDARD`, one on `FEATURED`. A typical pack is therefore
 * four cards in the 1-5 band and one level 6 — but every slot can exceed its
 * band, and the featured slot is by far the likeliest to. Each level above the
 * last is roughly a third as likely as the one below it, so the difficulty
 * climbs the whole way to 10 rather than levelling off at "rare".
 *
 * Rough odds per pack, from these numbers:
 *
 * | at least one | chance | ~1 in    |
 * |---|---|---|
 * | level 7+     | 19.7%  | 5 packs  |
 * | level 8+     | 5.2%   | 19 packs |
 * | level 9+     | 1.5%   | 66 packs |
 * | level 10     | 0.37%  | 268      |
 *
 * A daily pack makes a level 10 about nine months of opening, which is the
 * intent: only three of them survive the exclusion below, and the other eight
 * are still out there to be won from someone.
 *
 * Those numbers come from `Math`, not from reading the table — if the weights
 * are changed, the odds are worth re-deriving rather than adjusted by eye.
 */
const STANDARD_WEIGHTS: Record<number, number> = {
    1: 2400, 2: 2400, 3: 2200, 4: 1900, 5: 1500,
    6: 400, 7: 120, 8: 24, 9: 7, 10: 2,
};

const FEATURED_WEIGHTS: Record<number, number> = {
    6: 850, 7: 110, 8: 28, 9: 9, 10: 3,
};

const byLevel = (level: number) => packPool.filter(card => card.level === level);

const rollLevel = (weights: Record<number, number>): number => {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);

    let roll = Math.random() * total;
    for (const [level, weight] of entries) {
        roll -= weight;
        if (roll < 0) return Number(level);
    }

    // Only reachable through floating point drift on the final entry
    return Number(entries[entries.length - 1][0]);
};

/**
 * One card from a level, avoiding anything already in this pack.
 *
 * The bands are not evenly stocked — four cards survive the exclusion at level
 * 1 and three at level 10 — so a small band can run out of unseen cards inside
 * a single pack. Rather than reroll the level, which would quietly bias the
 * result towards the roomier bands, it steps *down* one level at a time and
 * settles for a duplicate only when nothing below has anything left either.
 * Duplicates are worth something here anyway: `playerCards` counts copies.
 */
const drawFromLevel = (level: number, taken: Set<number>) => {
    for (let current = level; current >= 1; current--) {
        const unseen = byLevel(current).filter(card => !taken.has(card.id));
        if (unseen.length) return unseen[Math.floor(Math.random() * unseen.length)];
    }

    const anything = byLevel(level);
    return anything[Math.floor(Math.random() * anything.length)] ?? packPool[0];
};

/** The five card ids a pack contains, in the order they are revealed. */
export const openPack = (): number[] => {
    const taken = new Set<number>();

    return Array.from({ length: PACK_SIZE }, (_, slot) => {
        // The featured card goes last, so the pack builds towards its best odds
        const weights = (slot === PACK_SIZE - 1) ? FEATURED_WEIGHTS : STANDARD_WEIGHTS;
        const card = drawFromLevel(rollLevel(weights), taken);
        taken.add(card.id);
        return card.id;
    });
};

/**
 * When the next pack is due, or `null` for "now".
 *
 * A stored time further out than the cooldown itself is treated as due now
 * rather than trusted. The clock behind it is the device's own, so moving it
 * forward and back is enough to produce one — and the failure to avoid is a
 * pack locked for a decade, not somebody granting themselves a spare.
 */
export const readNextPackAt = (): number | null => {
    if (typeof window === "undefined") return null;

    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (!stored || Number.isNaN(stored)) return null;
    if (stored <= Date.now()) return null;
    if (stored > Date.now() + PACK_COOLDOWN_MS) return null;

    return stored;
};

export const startPackCooldown = () => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, String(Date.now() + PACK_COOLDOWN_MS));
};
