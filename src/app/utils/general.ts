import { CardType, PlayerType } from "../context/GameTypes";

export const generateCardFromId = (id: number, player: PlayerType = "red", position: number | null = null, status: string | null = null) => {
    if (!id) return;

    return {
        cardId: Number(id),
        uniqueId: generateUniqueId(),
        currentOwner: player,
        initialOwner: player,
        position: position,
        action: status
    }
}


export const generateCardsFromIds = (cardIds: number[] = [], player: PlayerType = "red") => {
    const cardArray: CardType[] = [];
    cardIds.map((cardId, index) => {
        const card = generateCardFromId(cardId, player, index);

        if (card) {
            cardArray.push(card);
        }
    })

    return cardArray;
}


export const generateUniqueId = () => {
    // Use randomUUID if available otherwise use polyfill
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}