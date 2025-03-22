import React, { useState } from 'react';
import styles from './CardSelectionDialog.module.scss';
import { useGameContext } from "../../context/GameContext";
import cardList from '../../../data/cards.json';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import Card from '../Card/Card';
import Image from 'next/image';
import playSound from "../../utils/sounds";
import { setAiPlayerCards } from "../../utils/aiCardSelection";


const CardSelectionDialog = () => {
    const { playerCards, currentPlayerCards, currentPlayerHand, score, isCardSelectionOpen, isSoundEnabled, dispatch } = useGameContext();
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
        playSound("select", isSoundEnabled);
        dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: false });
        dispatch({ type: "SET_IS_GAME_ACTIVE", payload: true });
        dispatch({ type: "SET_PLAYER_HAND", payload: hand });
        dispatch({ type: "SET_ENEMY_HAND", payload: setAiPlayerCards(1) || [] })
        dispatch({ type: "SET_CURRENT_ENEMY_HAND", payload: setAiPlayerCards(1) || [] })
        playSound("spin", isSoundEnabled);
    }

    const handleDenial = () => {
        hand.length = 0;
        score[1] = 0;

        playSound("back", isSoundEnabled);

        dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: hand });
        dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: playerCards });
    }

    const itemsPerPage = 11;
    const [currentPage, setCurrentPage] = useState(1);

    const cardEntries = Object.entries(cards);
    const totalPages = Math.ceil(cardEntries.length / itemsPerPage);

    const paginatedCards = cardEntries.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className={`${styles.cardSelectionDialog} cardSelection ${(isCardSelectionOpen) ? "" : "hidden"}`} data-dialog="cardSelection">
            <table className="w-full">
                <thead>
                    <tr>
                        <td>Cards <span className={`ml-2 ${(totalPages > 1) ? "" : "hidden"}`.trim()}>P. <span className="ml-1">{currentPage}</span></span></td>
                        <td className="text-right"><span className="mr-3">Num.</span></td>
                    </tr>
                </thead>
                <tbody className="mt-2">
                    {paginatedCards.map(([cardId, quantity]) => (
                        <tr
                            key={cardId}
                            onClick={() => handleCardSelection(Number(cardId), quantity)}
                            onMouseEnter={() => handleCardHover(Number(cardId))}
                            className={quantity ? "cursor-pointer" : "text-gray-400"}
                        >
                            <td className="flex">
                                <Image src="/assets/cardIcon.png" alt="Card Icon" width="18" height="18" className="object-contain mr-3" />
                                <span>{cardList.find(card => card.id === Number(cardId))?.name}</span>

                            </td>
                            <td className="text-right"><span className="mr-1">{quantity}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className={`${styles.pagination} flex justify-between absolute bottom-0 left-0 w-full ${(totalPages > 1) ? "" : "hidden"}`.trim()}>
                <button data-prev onClick={() => setCurrentPage(prev => (prev === 1 ? totalPages : prev - 1))} className="disabled:opacity-50"></button>
                <button data-next onClick={() => setCurrentPage(prev => (prev === totalPages ? 1 : prev + 1))} className="disabled:opacity-50"></button>
            </div>

            {currentPlayerHand.length === 5 && <ConfirmationDialog handleConfirmation={handleConfirmation} handleDenial={handleDenial} />}
            <div key={previewCardId} className={`${styles.cardSelectionPreview} absolute`}>
                <Card id={previewCardId} player="blue" />
            </div>
        </div >
    );
};

export default CardSelectionDialog;