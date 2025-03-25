import React, { useState } from 'react';
import styles from './CardSelectionDialog.module.scss';
import { useGameContext } from "../../context/GameContext";
import cardList from '../../../data/cards.json';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import Card from '../Card/Card';
import Image from 'next/image';
import playSound from "../../utils/sounds";
import { setAiPlayerCards } from "../../utils/aiCardSelection";
import DialogPagination from '../DialogPagination/DialogPagination';


const CardSelectionDialog = () => {
    const { playerCards, currentPlayerCards, currentPlayerHand, enemyId, lostCards, score, isCardSelectionOpen, isSoundEnabled, currentPages, slideDirection, dispatch } = useGameContext();
    const [previewCardId, setPreviewCardId] = useState<number>(0);

    const hand: number[] = [...currentPlayerHand];
    const cards: Record<number, number> = { ...currentPlayerCards };

    const handleCardSelection = (cardId: number, quantity: number) => {
        if (cards[cardId] > 0 && hand.length < 5) {

            hand.push(cardId);
            score[1] += 1;
            cards[cardId] -= 1;
        }
        if (currentPlayerHand.length < 5) {
            const sound = (quantity) ? "place" : "error";
            playSound(sound, isSoundEnabled);
        }

        dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: hand });
        dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: cards });
    }

    const handleCardHover = (cardId: number) => {
        setPreviewCardId(cardId);
        if (currentPlayerHand.length < 5) playSound("select", isSoundEnabled);
    };


    const handleConfirmation = () => {
        const enemyCards = setAiPlayerCards(enemyId, lostCards);

        playSound("select", isSoundEnabled);
        dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: false });
        dispatch({ type: "SET_IS_GAME_ACTIVE", payload: true });
        dispatch({ type: "SET_PLAYER_HAND", payload: hand });
        dispatch({ type: "SET_ENEMY_HAND", payload: enemyCards || [] })
        dispatch({ type: "SET_CURRENT_ENEMY_HAND", payload: enemyCards || [] })
        playSound("spin", isSoundEnabled);
    }

    const handleDenial = () => {
        hand.length = 0;
        score[1] = 0;

        playSound("back", isSoundEnabled);

        dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: hand });
        dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: playerCards });
    }

    const cardContent = (item: { id: string, location: string, player: string, additionalDesc: string }, quantity: number) => (
        < div
            key={item.id}
            onClick={() => handleCardSelection(Number(item.id), quantity)}
            onMouseEnter={() => handleCardHover(Number(item.id))}
            className={`${styles.cardListItem} ${quantity ? "cursor-pointer" : "opacity-50"} flex justify-between`}
            data-slide-direction={slideDirection}
        >
            <div className="flex">
                <Image src="/assets/cardicon.png" alt="Card Icon" width="18" height="18" className="object-contain mr-3" />
                <span>{cardList.find(card => card.id === Number(item.id))?.name}</span>
            </div>
            <div className="text-right"><span className="mr-1">{quantity}</span></div>
        </div >
    );

    return (
        <div className={`${styles.cardSelectionDialog} cardSelection ${(isCardSelectionOpen) ? "" : "hidden"}`} data-dialog="cardSelection">
            <div className="flex justify-between">
                <h4>Cards <span className={`ml-2 ${(Object.entries(playerCards).length > 1) ? "" : "hidden"}`.trim()}>P. <span className="ml-1">{currentPages.cards}</span></span></h4>
                <h4 className="text-right"><span className="mr-3">Num.</span></h4>
            </div>
            <DialogPagination items={Object.entries(cards)} itemsPerPage={11} renderItem={([cardId, quantity]: [string, number]) =>
                cardContent({ id: cardId, location: '', player: '', additionalDesc: '' }, quantity)} pagination="cards" />

            {currentPlayerHand.length === 5 && <ConfirmationDialog handleConfirmation={handleConfirmation} handleDenial={handleDenial} />}
            <div key={previewCardId} className={`${styles.cardSelectionPreview} absolute`}>
                <Card id={previewCardId} player="blue" />
            </div>
        </div >
    );
};

export default CardSelectionDialog;