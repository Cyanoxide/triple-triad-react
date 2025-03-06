import React, { useState } from 'react';
import styles from './CardSelectionDialog.module.scss';
import { useGameContext } from "../../context/GameContext";
import cardList from '../../../data/cards.json';

const CardSelectionDialog = () => {
    const { playerCards, playerCardsSelection, playerHand, score, isCardSelectionOpen, dispatch } = useGameContext();

    const hand: number[] = [...playerHand];
    const cards: Record<number, number> = { ...playerCardsSelection };

    const handleCardSelection = (cardId: number) => {
        if (cards[cardId] > 0 && hand.length < 5) {
            hand.push(cardId);
            score[1] += 1;
            cards[cardId] -= 1;
        }

        dispatch({ type: "SET_PLAYER_HAND", payload: hand });
        dispatch({ type: "SET_PLAYER_CARDS_SELECTION", payload: cards });
    }

    const handleConfirmation = () => {
        dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: false });
        dispatch({ type: "SET_IS_GAME_ACTIVE", payload: true });
    }

    const handleDenial = () => {
        hand.length = 0;
        score[1] = 0;

        dispatch({ type: "SET_PLAYER_HAND", payload: hand });
        dispatch({ type: "SET_PLAYER_CARDS_SELECTION", payload: playerCards });
    }

    const itemsPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);

    const cardEntries = Object.entries(cards);
    const totalPages = Math.ceil(cardEntries.length / itemsPerPage);

    const paginatedCards = cardEntries.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className={`${styles.cardSelectionDialog} cardSelection ${(isCardSelectionOpen) ? "" : "hidden"}`} data-dialog="cardSelection">
            <table>
                <thead>
                    <tr>
                        <td>Cards <span className={(totalPages > 1) ? "" : "hidden"}>P. {currentPage}</span></td>
                        <td>Num.</td>
                    </tr>
                </thead>
                <tbody>
                    {paginatedCards.map(([cardId, quantity]) => (
                        <tr
                            key={cardId}
                            onClick={() => handleCardSelection(Number(cardId))}
                            className={quantity ? "cursor-pointer" : "text-gray-400"}
                        >
                            <td>{cardList.find(card => card.id === Number(cardId))?.name}</td>
                            <td>{quantity}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className={(totalPages > 1) ? "" : "hidden"}>
                <button onClick={() => setCurrentPage(prev => (prev === 1 ? totalPages : prev - 1))} className="disabled:opacity-50">
                    Left
                </button>
                <button onClick={() => setCurrentPage(prev => (prev === totalPages ? 1 : prev + 1))} className="disabled:opacity-50">
                    Right
                </button>
            </div>

            <div className={`${styles.cardSelectionDialog} ${(playerHand.length === 5) ? "" : "hidden"} absolute`} data-dialog="confirmation">
                <h4>Choice.</h4>
                <h3>Are you sure?</h3>
                <div className="flex flex-col items-center">
                    <button className="relative" onClick={handleConfirmation}>Yes</button>
                    <button className="relative" onClick={handleDenial}>No</button>
                </div>
            </div>
        </div>
    );
};

export default CardSelectionDialog;