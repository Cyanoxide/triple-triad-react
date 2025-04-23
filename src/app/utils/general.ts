import { CardType, PlayerType } from "../context/GameTypes";

export const generateCardFromId = (id: number, player: PlayerType = "red", position: number | null = null, status: string | null = null) => {
    if (!id) return;

    return [id, player, position, status] as CardType;
}


export const generateCardsFromIds = (cardIds: number[] = [], player: PlayerType = "red") => {
    const cardArray: CardType[] = [];
    cardIds.map((cardId) => {
        const card = generateCardFromId(cardId, player);

        if (card) {
            cardArray.push(card);
        }

    })

    return cardArray;
}