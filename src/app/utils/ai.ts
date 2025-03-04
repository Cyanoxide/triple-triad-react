export function getAIMove(boardState: ([number, "red" | "blue"] | null)[][], enemyHand: number[], method: "random" | "beginner" | "intermediate" | "advanced") {
    // Filter available spaces
    const availablePositions = boardState
        .map((row, rowIndex) =>
            row.map((cell, colIndex) => (!cell ? { row: rowIndex, col: colIndex } : null))
        )
        .flat()
        .filter((pos) => pos !== null);

    if (availablePositions.length === 0) return null; // No valid moves

    if (method === "random") {
        // Choose a random card and position
        const enemyCardIndex = Math.floor(Math.random() * enemyHand.length);
        const enemyCard = enemyHand[enemyCardIndex];
        const enemyPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];

        return { enemyCardIndex, enemyCard, enemyPosition };
    }
}