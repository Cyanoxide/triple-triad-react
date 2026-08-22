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
 * band, and the featured slot is by far the likeliest to.
 *
 * Rough odds per pack, from these numbers:
 *
 * | at least one | chance | ~1 in    |
 * |---|---|---|
 * | level 7+     | 66%    | 1.5      |
 * | level 8+     | 36%    | 2.8      |
 * | level 9+     | 15%    | 6.7      |
 * | level 10     | 4.4%   | 23 packs |
 *
 * **These are deliberately far more generous than the first pass**, which put a
 * level 10 at 1 in 268 packs and, with duplicates, needed a simulated *six
 * years* of daily opening to finish the 88. The set has to be completable.
 *
 * The thing that actually made that possible is the duplicate protection in
 * `drawFromLevel`, not the weights: it is what lets level 10 stay a 1-in-23
 * event while the whole pool still comes in at a median of 88 packs — under
 * three months — because a rare pull is never wasted on a card already held.
 * Simulated against this module over 2000 runs; 90% finish inside 134 packs,
 * and a nearly-complete collection still sees only 22% duplicates against the
 * 86% it would draw without the preference.
 *
 * Those numbers were computed, not estimated. Re-derive them if the weights
 * change.
 */
const STANDARD_WEIGHTS: Record<number, number> = {
    1: 1800, 2: 1800, 3: 1700, 4: 1500, 5: 1300,
    6: 800, 7: 500, 8: 250, 9: 130, 10: 60,
};

const FEATURED_WEIGHTS: Record<number, number> = {
    6: 500, 7: 270, 8: 150, 9: 60, 10: 20,
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
 * One card from a level: something new if there is anything new to be had.
 *
 * **Cards the player does not own come first.** This is what makes the set
 * finishable without making the rare frames common. Without it a level 10 pull
 * — a 1-in-23 event — lands on a card already held two times in three once the
 * collection fills up, and the last few cards take longer to arrive than every
 * card before them put together. Simulated, the same weights go from a median
 * of 220 packs to complete the pool down to 89.
 *
 * It is a preference, not a guarantee: once every card in the band is owned it
 * hands back a duplicate rather than escaping to another level, because the
 * level is what the weights decided and quietly overriding it would bias every
 * roll towards whichever band happens to be least complete. Duplicates are
 * worth something here anyway — `playerCards` counts copies.
 *
 * The bands are not evenly stocked either — four cards survive the exclusion at
 * level 1 and three at level 10 — so a band can run out of cards *this pack*
 * has not already used. Rather than reroll the level, which would bias the
 * result towards the roomier bands, it steps down one level at a time.
 */
const drawFromLevel = (level: number, taken: Set<number>, owned: Record<number, number>) => {
    for (let current = level; current >= 1; current--) {
        const unused = byLevel(current).filter(card => !taken.has(card.id));
        if (!unused.length) continue;

        const unowned = unused.filter(card => !owned[card.id]);
        const choices = unowned.length ? unowned : unused;
        return choices[Math.floor(Math.random() * choices.length)];
    }

    const anything = byLevel(level);
    return anything[Math.floor(Math.random() * anything.length)] ?? packPool[0];
};

/**
 * The five card ids a pack contains, in the order they are revealed.
 *
 * `owned` is the player's collection — `playerCards`, counts and all — and is
 * used only to prefer cards they are missing. A count of zero reads as not
 * owned, which is what it means: that is a card lost back to an opponent.
 */
export const openPack = (owned: Record<number, number> = {}): number[] => {
    const taken = new Set<number>();

    const drawn = Array.from({ length: PACK_SIZE }, (_, slot) => {
        const weights = (slot === PACK_SIZE - 1) ? FEATURED_WEIGHTS : STANDARD_WEIGHTS;
        const card = drawFromLevel(rollLevel(weights), taken, owned);
        taken.add(card.id);
        return card.id;
    });

    /**
     * **Shuffled, so the featured slot is not always the last card.**
     *
     * The rolls have to happen in a fixed order — the featured slot is defined
     * as one of the five and the duplicate check walks them in turn — but
     * nothing should be inferable from *where* a card sits afterwards. Left in
     * order, the fifth card was the good one every single time, which turns
     * turning them over into a formality: you would know before touching them
     * which four were filler.
     *
     * Fisher-Yates, back to front, so every ordering is equally likely.
     */
    for (let i = drawn.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [drawn[i], drawn[j]] = [drawn[j], drawn[i]];
    }

    return drawn;
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
