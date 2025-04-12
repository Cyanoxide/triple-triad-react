import cards from "../../data/cards.json";
import { BoardType, AiMethodType, PlayerType } from "../context/GameTypes";

const difficultySettings = {
    beginner: 10,
    intermediate: 5,
    advanced: 2,
}

export function getEnemyMove(boardState: BoardType, enemyHand: number[], method: AiMethodType, elements: Record<string, string> | null) {
    const availablePositions = boardState
        .map((row, rowIndex) =>
            row.map((cell, colIndex) => (!cell ? { row: rowIndex, col: colIndex } : null))
        )
        .flat()
        .filter((pos) => pos !== null);

    if (availablePositions.length === 0) return;

    if (method === "random") {
        const enemyCardIndex = Math.floor(Math.random() * enemyHand.length);
        const enemyCard = enemyHand[enemyCardIndex];
        const enemyPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];

        return { enemyCardIndex, enemyCard, enemyPosition };
    }

    if (!(method in difficultySettings)) return;
    const possibleMoves = [];

    for (const { row, col } of availablePositions) {
        for (const [index, cardId] of enemyHand.entries()) {
            const competingCardMap = {
                top: "bottom",
                right: "left",
                bottom: "top",
                left: "right",
            } as const;

            const potentialFlips = {
                top: { r: row - 1, c: col },
                right: { r: row, c: col + 1 },
                bottom: { r: row + 1, c: col },
                left: { r: row, c: col - 1 },
            };

            const flips: { row: number; col: number; player: PlayerType }[] = [];
            const activeCard = cards.find(card => card.id === cardId);
            if (!activeCard) continue;
            let totalOpenValue = 0;
            let openSideCount = 0;

            for (const [direction, { r, c }] of Object.entries(potentialFlips) as [keyof typeof competingCardMap, { r: number, c: number }][]) {
                const isWithinBounds = r >= 0 && r < boardState.length && c >= 0 && c < boardState[0].length;
                if (!isWithinBounds) continue;

                const competingCardData = boardState[r]?.[c];

                if (!competingCardData) {
                    totalOpenValue += activeCard[direction];
                    openSideCount++;
                    continue;
                }

                const [competingCardId, competingCardOwner] = competingCardData;
                if (competingCardOwner === "red") continue;

                const competingCard = cards.find(card => card.id === competingCardId);
                if (competingCard) {

                    let activeCardModifier = 0
                    if (elements && String([row, col]) in elements) {
                        activeCardModifier = (elements[String([row, col])] === activeCard?.element) ? 1 : -1;
                    }

                    let competingCardModifier = 0;
                    if (elements && String([r, c]) in elements) {
                        competingCardModifier = (elements[String([r, c])] === competingCard?.element) ? 1 : -1;
                    }

                    if (activeCard[direction] + activeCardModifier > competingCard[competingCardMap[direction]] + competingCardModifier) {
                        flips.push({ row: r, col: c, player: "red" });
                    }
                }
            }

            possibleMoves.push({
                enemyCardIndex: index,
                enemyCard: activeCard.id,
                enemyPosition: { row, col },
                flips: flips.length,
                openStrength: totalOpenValue / openSideCount,
                strength: [totalOpenValue, openSideCount]
            });
        }
    }

    const sortedMoves = possibleMoves.sort((a, b) => {
        if (b.flips !== a.flips) {
            return b.flips - a.flips;
        }
        return b.openStrength - a.openStrength;
    });

    const topChoices = sortedMoves.slice(0, difficultySettings[method]);
    const chosenMove = topChoices[Math.floor(Math.random() * topChoices.length)];

    const { enemyCardIndex, enemyPosition, enemyCard } = chosenMove;
    return { enemyCardIndex, enemyCard, enemyPosition };

}