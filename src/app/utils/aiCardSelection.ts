import cards from '../../data/cards.json';
import players from '../../data/players.json';

export const setAiPlayerCards = (playerId: number, lostCards: Record<number, number>) => {
    const currentHand: number[] = [];
    const player = players.find((player) => player.id === playerId);
    if (!player) return;

    console.log(playerId, player.id)

    const cardPool = cards.filter(card => player.cards.includes(card.level));

    const lostCardsJSON = localStorage.getItem("lostCards");
    const currentLostCards = lostCardsJSON ? JSON.parse(lostCardsJSON) : lostCards;

    if (currentLostCards && currentLostCards[playerId] && (Math.random() < (0.35))) {
        currentHand.push(currentLostCards[playerId]);
    }

    if (player.rareCard && (Math.random() < (0.35))) {
        currentHand.push(player.rareCard);
    }

    while (currentHand.length < 5) {
        const selectedCard = cardPool.find(card => card.id === Math.floor(Math.random() * (cardPool.length)));
        if (!selectedCard || currentHand.includes(selectedCard.id)) continue;

        currentHand.push(selectedCard.id);
    }

    return currentHand.sort(() => Math.random() - 0.5);
};