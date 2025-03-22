import cards from '../../data/cards.json';
import players from '../../data/players.json';

export const setAiPlayerCards = (playerId: number) => {
    const currentHand: number[] = [];
    const player = players.find((player) => player.id === playerId);
    if (!player) return;

    const cardPool = cards.filter(card => player.cards.includes(card.level));

    while (currentHand.length < 5) {
        const selectedCard = cardPool.find(card => card.id === Math.floor(Math.random() * (cardPool.length)));
        if (!selectedCard || currentHand.includes(selectedCard.id)) continue;

        currentHand.push(selectedCard.id);
    }

    return currentHand;
};