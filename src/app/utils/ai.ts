import cards from '../../data/cards.json';

const difficultySettings = {
    beginner: 10,
    intermediate: 5,
    advanced: 2,
}

export function getEnemyMove(boardState: ([number, "red" | "blue"] | null)[][], enemyHand: number[], method: "random" | "beginner" | "intermediate" | "advanced") {
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
                top: { row: row - 1, col },
                right: { row, col: col + 1 },
                bottom: { row: row + 1, col },
                left: { row, col: col - 1 },
            };

            const flips: { row: number; col: number; player: "red" | "blue" }[] = [];
            const activeCard = cards.find(card => card.id === cardId);
            if (!activeCard) continue;
            let totalOpenValue = 0;
            let openSideCount = 0;

            for (const [direction, { row, col }] of Object.entries(potentialFlips) as [keyof typeof competingCardMap, { row: number, col: number }][]) {
                const isWithinBounds = row >= 0 && row < boardState.length && col >= 0 && col < boardState[0].length;
                if (!isWithinBounds) continue;

                const competingCardData = boardState[row]?.[col];

                if (!competingCardData) {
                    totalOpenValue += activeCard[direction];
                    openSideCount++;
                    continue;
                }

                const [competingCardId, competingCardOwner] = competingCardData;
                if (competingCardOwner === "red") continue;

                const competingCard = cards.find(card => card.id === competingCardId);
                if (competingCard) {
                    if (activeCard[direction] > competingCard[competingCardMap[direction]]) {
                        flips.push({ row, col, player: "red" });
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

    console.log(sortedMoves)

    const topChoices = sortedMoves.slice(0, difficultySettings[method]);
    const chosenMove = topChoices[Math.floor(Math.random() * topChoices.length)];

    const { enemyCardIndex, enemyPosition, enemyCard } = chosenMove;
    return { enemyCardIndex, enemyCard, enemyPosition };

}