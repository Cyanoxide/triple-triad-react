"use client"

import React, { useEffect } from 'react';
import styles from './Board.module.scss';
import Card from '../Card/Card';
import cards from '../../../data/cards.json';
import { useGameContext } from "../../context/GameContext";
import { getEnemyMove } from '../../utils/ai';

interface BoardProps {
    className?: string;
}

const Board: React.FC<BoardProps> = ({ className }) => {
    const { playerHand, enemyHand, selectedCard, turn, turnNumber, turnState, score, board, dispatch } = useGameContext();

    const setWinState = (currentScore: [number, number] = score) => {
        if (turnNumber <= 9 || turnState !== "TURN_END") return;
        const [redScore, blueScore] = currentScore;

        if (redScore > blueScore) dispatch({ type: "SET_WIN_STATE", payload: "red" });
        if (redScore < blueScore) dispatch({ type: "SET_WIN_STATE", payload: "blue" });
        if (redScore === blueScore) dispatch({ type: "SET_WIN_STATE", payload: "draw" });
    }

    const swapTurn = () => {
        dispatch({ type: "SET_TURN_STATE", payload: "TURN_END" });
        dispatch({ type: "SET_TURN", payload: (turn === "red") ? "blue" : "red" });
        dispatch({ type: "INCREMENT_TURN" });
    };

    const grabCardFromHand = (position: number, player: "red" | "blue") => {
        dispatch({ type: "SET_TURN_STATE", payload: "SELECTING_CARD" });
        const isPlayer = player === "blue";
        const cards = isPlayer ? [...playerHand] : [...enemyHand];
        const selectedCardId = cards.splice(position, 1);

        if (selectedCardId == undefined) return;

        dispatch({
            type: isPlayer ? "SET_PLAYER_HAND" : "SET_ENEMY_HAND",
            payload: cards
        });

        return selectedCardId;
    };

    const placeCard = (row: number, col: number, cardId: number, player: "red" | "blue", currentBoard: ([number, "red" | "blue"] | null)[][] = board) => {
        dispatch({ type: "SET_TURN_STATE", payload: "PLACING_CARD" });
        if (currentBoard[row][col]) return;

        const newBoard = currentBoard.map(row => [...row]);
        newBoard[row][col] = [cardId, player];

        dispatch({ type: "SET_SELECTED_CARD", payload: null });

        determineCardFlips(row, col, player, newBoard);
    };


    const determineCardFlips = (row: number, col: number, player: "red" | "blue", currentBoard: ([number, "red" | "blue"] | null)[][] = board) => {
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
    };

    const handlePlayerBoardSelection = (rowIndex: number, colIndex: number) => {
        if (board[rowIndex][colIndex]) return;

        if (!selectedCard) return;
        const [cardId, cardPlayer, position] = selectedCard;

        if (cardPlayer !== turn) return;
        grabCardFromHand(position, turn);
        placeCard(rowIndex, colIndex, cardId, turn);
        swapTurn();
    };

    const handleEnemyBoardSelection = () => {
        if (turn === "red") {
            const enemyMove = getEnemyMove(board, enemyHand, "intermediate");
            if (enemyMove) {
                const { enemyCardIndex, enemyCard, enemyPosition } = enemyMove;

                setTimeout(() => {
                    dispatch({
                        type: "SET_SELECTED_CARD",
                        payload: [enemyCard, "red", enemyCardIndex],
                    });
                }, 1500);

                setTimeout(() => {
                    grabCardFromHand(enemyCardIndex, "red");
                    placeCard(enemyPosition.row, enemyPosition.col, enemyCard, "red");
                    swapTurn();
                }, 2500);
            }
        }
    }

    const updateScore = () => {
        const redScore = board.flat().filter(entry => entry?.[1] === "red").length + enemyHand.length
        const blueScore = board.flat().filter(entry => entry?.[1] === "blue").length + playerHand.length

        dispatch({ type: "SET_SCORE", payload: [redScore, blueScore] });
        setWinState([redScore, blueScore]);
    }

    useEffect(() => {
        handleEnemyBoardSelection();
    }, [turn]);

    useEffect(() => {
        updateScore()

    }, [board]);

    return (
        <>
            <div className={`${styles.board} ${className || ''}`.trim()}>
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