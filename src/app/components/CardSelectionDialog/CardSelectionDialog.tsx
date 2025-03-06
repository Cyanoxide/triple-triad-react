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
        hand.pop()
        dispatch({ type: "SET_PLAYER_HAND", payload: hand });
    }

    return (
        <>
            <div className={`${(isCardSelectionOpen) ? "" : "hidden"}`}>
                <table>
                    <thead>
                        <tr>
                            <td>Cards</td>
                            <td>Num.</td>
                        </tr>
                    </thead>
                    <tbody>
                        {cards.map((cardId, index) => (
                            <tr key={index} onClick={() => handleCardSelection(cardId)}>
                                <td>{cardList.find(card => card.id === cardId)?.name}</td>
                                <td>{cardList.filter(card => card.id === cardId).length}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className={`${(playerHand.length === 5) ? "" : "hidden"}`}>
                    <h4>Choice.</h4>
                    <h3>Are you sure?</h3>
                    <div className="flex flex-col items-center">
                        <button className="relative" onClick={handleConfirmation}>Yes</button>
                        <button className="relative" onClick={handleDenial}>No</button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CardSelectionDialog;
// cards num.icon name quantity choice Are you sure ? Yes No