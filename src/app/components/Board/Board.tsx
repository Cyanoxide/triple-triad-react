"use client"

import React, { useCallback, useEffect } from 'react';
import styles from './Board.module.scss';
import Card from '../Card/Card';
import cards from '../../../data/cards.json';
import { useGameContext } from "../../context/GameContext";
import { getEnemyMove } from '../../utils/ai';

interface BoardProps {
    className?: string;
}

const Board: React.FC<BoardProps> = ({ className }) => {
    const { currentPlayerHand, currentEnemyHand, selectedCard, turn, turnNumber, turnState, score, board, isGameActive, dispatch } = useGameContext();


    const setWinState = useCallback((currentScore: [number, number] = score) => {
        // if (isGameActive) dispatch({ type: "SET_WIN_STATE", payload: "red" });
        // return;

        if (turnNumber <= 9 || turnState !== "TURN_END") return;
        const [redScore, blueScore] = currentScore;

        if (redScore > blueScore) dispatch({ type: "SET_WIN_STATE", payload: "red" });
        if (redScore < blueScore) dispatch({ type: "SET_WIN_STATE", payload: "blue" });
        if (redScore === blueScore) dispatch({ type: "SET_WIN_STATE", payload: "draw" });
    }, [score, turnNumber, turnState, isGameActive, dispatch])

    const swapTurn = useCallback(() => {
        dispatch({ type: "SET_TURN_STATE", payload: "TURN_END" });
        dispatch({ type: "SET_TURN", payload: (turn === "red") ? "blue" : "red" });
        dispatch({ type: "INCREMENT_TURN" });
    }, [turn, dispatch]);


    const grabCardFromHand = useCallback((position: number, player: "red" | "blue") => {
        dispatch({ type: "SET_TURN_STATE", payload: "SELECTING_CARD" });
        const isPlayer = player === "blue";
        const cards = isPlayer ? [...currentPlayerHand] : [...currentEnemyHand];
        const selectedCardId = cards.splice(position, 1);

        if (selectedCardId == undefined) return;

        dispatch({
            type: isPlayer ? "SET_CURRENT_PLAYER_HAND" : "SET_CURRENT_ENEMY_HAND",
            payload: cards
        });

        return selectedCardId;
    }, [currentEnemyHand, currentPlayerHand, dispatch]);


    const determineCardFlips = useCallback((row: number, col: number, player: "red" | "blue", currentBoard: ([number, "red" | "blue"] | null)[][] = board) => {
        dispatch({ type: "SET_TURN_STATE", payload: "PROCESSING_FLIPS" });
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
    }, [board, dispatch]);


    const placeCard = useCallback((row: number, col: number, cardId: number, player: "red" | "blue", currentBoard: ([number, "red" | "blue"] | null)[][] = board) => {
        dispatch({ type: "SET_TURN_STATE", payload: "PLACING_CARD" });
        if (currentBoard[row][col]) return;

        const newBoard = currentBoard.map(row => [...row]);
        newBoard[row][col] = [cardId, player];

        dispatch({ type: "SET_SELECTED_CARD", payload: null });

        determineCardFlips(row, col, player, newBoard);
    }, [board, determineCardFlips, dispatch]);


    const handlePlayerBoardSelection = useCallback((rowIndex: number, colIndex: number) => {
        if (board[rowIndex][colIndex]) return;

        if (!selectedCard) return;
        const [cardId, cardPlayer, position] = selectedCard;

        if (cardPlayer !== turn) return;
        grabCardFromHand(position, turn);
        placeCard(rowIndex, colIndex, cardId, turn);
        swapTurn();
    }, [board, selectedCard, turn, grabCardFromHand, placeCard, swapTurn]);


    useEffect(() => {
        if (turn === "red" && turnNumber <= 9) {
            const enemyMove = getEnemyMove(board, currentEnemyHand, "intermediate");
            if (enemyMove) {
                const { enemyCardIndex, enemyCard, enemyPosition } = enemyMove;

                setTimeout(() => {
                    dispatch({
                        type: "SET_SELECTED_CARD",
                        payload: [enemyCard, "red", enemyCardIndex],
                    });
                }, 1000);

                setTimeout(() => {
                    grabCardFromHand(enemyCardIndex, "red");
                    placeCard(enemyPosition.row, enemyPosition.col, enemyCard, "red");
                    swapTurn();
                }, 2000);
            }
        }
    }, [turn]);


    useEffect(() => {
        const redScore = board.flat().filter(entry => entry?.[1] === "red").length + currentEnemyHand.length;
        const blueScore = board.flat().filter(entry => entry?.[1] === "blue").length + currentPlayerHand.length;

        dispatch({ type: "SET_SCORE", payload: [redScore, blueScore] });

        setWinState([redScore, blueScore])
    }, [board]);


    return (
        <>
            <div className={`${styles.board} ${(isGameActive) ? "" : "invisible"} ${className || ''}`.trim()}>
                {board.map((row, rowIndex) => (
                    row.map((col, colIndex) => (
                        <div key={`${rowIndex}-${colIndex}`} className="cell" data-position={[rowIndex, colIndex]} data-selectable={!board[rowIndex][colIndex] && !!selectedCard && turn === "blue"} onClick={() => handlePlayerBoardSelection(rowIndex, colIndex)}>
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