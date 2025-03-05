"use client"

import React, { useEffect } from 'react';
import styles from './Board.module.scss';
import Card from '../Card/Card';
import cards from '../../../data/cards.json';
import { useGameContext } from "../../context/GameContext";
import { getAIMove } from '../../utils/ai';

interface BoardProps {
    className?: string;
}

const Board: React.FC<BoardProps> = ({ className }) => {
    const { playerCards, enemyCards, selectedCard, turn, turnNumber, redScore, blueScore, winState, board, dispatch } = useGameContext();

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

    const placeCard = (row: number, col: number, cardId: number, player: "red" | "blue", currentBoard: ([number, "red" | "blue"] | null)[][] = board) => {
        if (currentBoard[row][col]) return;

        const newBoard = currentBoard.map(row => [...row]);
        newBoard[row][col] = [cardId, player];

        dispatch({ type: "SET_SELECTED_CARD", payload: null });

        determineCardFlips(row, col, player, newBoard);
    };


    const determineCardFlips = (row: number, col: number, player: "red" | "blue", currentBoard: ([number, "red" | "blue"] | null)[][] = board) => {
        if (!currentBoard[row][col]) return;

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

        const [cardId] = currentBoard[row][col];
        const activeCard = cards.find(card => card.id === cardId);
        if (!activeCard) return;

        const flips: { row: number; col: number; player: "red" | "blue" }[] = [];

        for (const [direction, { row: r, col: c }] of Object.entries(potentialFlips) as [keyof typeof competingCardMap, { row: number, col: number }][]) {
            const competingCardData = currentBoard[r]?.[c];
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
            const newBoard = [...currentBoard.map(row => [...row])];
            flips.forEach(({ row, col, player }) => {
                if (currentBoard[row][col]) {
                    newBoard[row][col] = [currentBoard[row][col]![0], player];
                }
            });

            dispatch({ type: "SET_BOARD", payload: newBoard });
            return;
        }

        dispatch({ type: "SET_BOARD", payload: currentBoard });
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
        setWinState();
    }, [turnNumber]);

    useEffect(() => {
        if (turn === "red") {
            const aiMove = getAIMove(board, enemyCards, "random");
            if (aiMove) {
                const { enemyCardIndex, enemyCard, enemyPosition } = aiMove;

                setTimeout(() => {
                    dispatch({
                        type: "SET_SELECTED_CARD",
                        payload: [enemyCard, turn, enemyCardIndex],
                    });
                }, 1500);

                setTimeout(() => {
                    grabCardFromHand(enemyCardIndex, "red");
                    placeCard(enemyPosition.row, enemyPosition.col, enemyCard, "red");
                    swapTurn();
                }, 2500);
            }
        }
    }, [turn]);

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
                                return cardData && <Card {...cardData} player={col[1]} />;
                            })()}
                        </div>
                    ))
                ))}
            </div >
        </>
    );
};

export default Board;