import cards from "../../data/cards.json";
import players from "../../data/players.json";
import { generateCardsFromIds } from "../utils/general";


export const setAiPlayerCards = (playerId: number, lostCards: Record<number, number[]>, playerCards: Record<number, number>) => {
    const currentHand: number[] = [];
    const player = players.find((player) => player.id === playerId);
    if (!player) return;

    const cardPool = cards.filter(card => player.cards.includes(card.level));

    const lostCardsJSON = localStorage.getItem("lostCards");
    const currentLostCards = lostCardsJSON ? JSON.parse(lostCardsJSON) : lostCards;

    const playerLostCards = currentLostCards[playerId];

    if (currentLostCards && playerLostCards && (Math.random() < (0.35))) {
        const randomLostCard = playerLostCards[Math.floor(Math.random() * playerLostCards.length)];
        currentHand.push(randomLostCard);
    }

    if (player.rareCard && !Object.keys(playerCards).includes(String(player.rareCard)) && (Math.random() < (0.35))) {
        currentHand.push(player.rareCard);
    }

    while (currentHand.length < 5) {
        const selectedCard = cardPool.find(card => card.id === Math.floor(Math.random() * (cardPool.length)));
        if (!selectedCard || currentHand.includes(selectedCard.id)) continue;

        currentHand.push(selectedCard.id);
    }

    const sortedHand = currentHand.sort(() => Math.random() - 0.5)
    return generateCardsFromIds(sortedHand);
};