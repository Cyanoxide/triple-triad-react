"use client"

import { useEffect } from 'react';
import React from 'react';
import styles from './Board.module.scss';
import Card from '../Card/Card';
import cards from '../../../data/cards.json';
import { useGameContext } from "../../context/GameContext";

interface BoardProps {
    className?: string;
}

const Board: React.FC<BoardProps> = ({ className }) => {
    const { playerCards, enemyCards, selectedCard, turn, turnNumber, lastPlacedCard, redScore, blueScore, winState, board, dispatch } = useGameContext();

    const setWinState = () => {
        if (turnNumber <= 9) return;

        if (redScore > blueScore) dispatch({ type: "SET_WIN_STATE", payload: "red" });
        if (redScore < blueScore) dispatch({ type: "SET_WIN_STATE", payload: "blue" });
        if (redScore === blueScore) dispatch({ type: "SET_WIN_STATE", payload: "draw" });

        console.log(redScore, blueScore, winState);
    }

    const swapTurn = () => {
        dispatch({ type: "SET_TURN", payload: (turn === "red") ? "blue" : "red" });
        dispatch({ type: "INCREMENT_TURN" });
    };

    const grabCardFromHand = (position: number, player: "red" | "blue") => {
        const isPlayer = player === "blue";
        const cards = isPlayer ? [...playerCards] : [...enemyCards];
        const selectedCardId = cards.splice(position, 1);

        if (selectedCardId == undefined) return;

        dispatch({
            type: isPlayer ? "SET_PLAYER_CARDS" : "SET_ENEMY_CARDS",
            payload: cards
        });

        return selectedCardId;
    };

    const placeCard = (row: number, col: number, cardId: number, player: "red" | "blue") => {
        if (board[row][col]) return;

        const newBoard = board.map(row => [...row]);
        newBoard[row][col] = [cardId, player];

        dispatch({ type: "SET_BOARD", payload: newBoard });
        dispatch({ type: "SET_LAST_PLACED_CARD", payload: { position: [row, col], player } });
        dispatch({ type: "SET_SELECTED_CARD", payload: null });
    };

    const flipCard = (row: number, col: number, player?: "red" | "blue") => {
        const card = board[row][col];
        if (!card) return;

        const activePlayer = player || ((card[1] === "red") ? "blue" : "red");

        const newBoard = board.map(row => [...row]);
        newBoard[row][col] = [card[0], activePlayer];
        dispatch({ type: "SET_BOARD", payload: newBoard });
    }

    const determineCardFlips = (row: number, col: number, player: "red" | "blue") => {
        if (!board[row][col]) return;

        const competingCardMap = {
            top: "bottom",
            right: "left",
            bottom: "top",
            left: "right",
        } as const;

        const potentialFlips = {
            top: { row: row - 1, col },
            right: { row, col: col + 1 },
            bottom: { row: row + 1, col },
            left: { row, col: col - 1 },
        };

        const [cardId] = board[row][col];
        const activeCard = cards.find(card => card.id === cardId);
        if (!activeCard) return;

        const flips: { row: number; col: number; player: "red" | "blue" }[] = [];

        for (const [direction, { row: r, col: c }] of Object.entries(potentialFlips) as [keyof typeof competingCardMap, { row: number, col: number }][]) {
            const competingCardData = board[r]?.[c];
            if (!competingCardData) continue;

            const [competingCardId, competingCardOwner] = competingCardData;
            if (player === competingCardOwner) continue;

            const competingCard = cards.find(card => card.id === competingCardId);
            if (!competingCard) continue;

            if (activeCard[direction] > competingCard[competingCardMap[direction]]) {
                flips.push({ row: r, col: c, player });
            }
        }

        if (flips.length > 0) {
            const newBoard = board.map(row => [...row]);
            flips.forEach(({ row, col, player }) => {
                if (board[row][col]) {
                    newBoard[row][col] = [board[row][col]![0], player];
                }
            });

            dispatch({ type: "SET_BOARD", payload: newBoard });
        }
    };

    const handleBoardSelection = (rowIndex: number, colIndex: number) => {
        if (board[rowIndex][colIndex]) return;

        if (!selectedCard) return;
        const [cardId, cardPlayer, position] = selectedCard;

        if (cardPlayer !== turn) return;
        grabCardFromHand(position, turn);
        placeCard(rowIndex, colIndex, cardId, turn);
        swapTurn();
    }

    useEffect(() => {
        if (lastPlacedCard) {
            determineCardFlips(lastPlacedCard.position[0], lastPlacedCard.position[1], lastPlacedCard.player);
        }
    }, [lastPlacedCard]);

    useEffect(() => {
        setWinState();
    }, [turnNumber]);

    useEffect(() => {
        const redCardsInHand = enemyCards.length;
        const blueCardsInHand = playerCards.length;

        dispatch({ type: "SET_RED_SCORE", payload: board.flat().filter(entry => entry?.[1] === "red").length + redCardsInHand });
        dispatch({ type: "SET_BLUE_SCORE", payload: board.flat().filter(entry => entry?.[1] === "blue").length + blueCardsInHand });
    }, [board]);

    return (
        <>
            <div className={`${styles.board} ${className || ''}`.trim()}>
                {board.map((row, rowIndex) => (
                    row.map((col, colIndex) => (
                        <div key={`${rowIndex}-${colIndex}`} className="cell" data-position={[rowIndex, colIndex]} data-selectable={!board[rowIndex][colIndex] && !!selectedCard && turn === "blue"} onClick={() => handleBoardSelection(rowIndex, colIndex)}>
                            {col && (() => {
                                const cardData = cards.find(card => card.id === col[0]);
                                return cardData && <Card {...cardData} player={col[1]} onClick={() => flipCard(rowIndex, colIndex)} />;
                            })()}
                        </div>
                    ))
                ))}
            </div >
        </>
    );
};

export default Board;