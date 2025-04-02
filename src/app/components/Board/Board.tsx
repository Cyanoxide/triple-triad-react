"use client"

import React, { useCallback, useEffect } from 'react';
import styles from './Board.module.scss';
import Card from '../Card/Card';
import cards from '../../../data/cards.json';
import { useGameContext } from "../../context/GameContext";
import { getEnemyMove } from '../../utils/ai';
import SimpleDialog from '../SimpleDialog/SimpleDialog';
import Indicator from '../Indicator/Indicator';
import playSound from "../../utils/sounds";
import textToSprite from '../../utils/textToSprite';
import elementsList from "../../../data/elements.json";

interface BoardProps {
    className?: string;
}

const Board: React.FC<BoardProps> = ({ className }) => {
    const { currentPlayerHand, currentEnemyHand, selectedCard, turn, turnNumber, turnState, score, board, isGameActive, isSoundEnabled, rules, elements, winState, dispatch } = useGameContext();

    const setWinState = useCallback((currentScore: [number, number] = score) => {
        // if (isGameActive) dispatch({ type: "SET_WIN_STATE", payload: "blue" });
        // return;

        if (turnNumber <= 9 || turnState !== "TURN_END") return;
        const [redScore, blueScore] = currentScore;

        if (redScore === blueScore) dispatch({ type: "SET_WIN_STATE", payload: "draw" });
        if (redScore > blueScore) dispatch({ type: "SET_WIN_STATE", payload: "red" });
        if (redScore < blueScore) {
            dispatch({ type: "SET_WIN_STATE", payload: "blue" });
        }
    }, [turnNumber]);


    const resetBoardValuesOnSwap = (board: ([number, "red" | "blue", "placed" | "flipped" | undefined] | null)[][]): ([number, "red" | "blue", "placed" | "flipped" | undefined] | null)[][] => {
        board.map((row) =>
            row.map((cell) =>
                cell && cell[2] === "flipped" ? [cell[0], cell[1], "placed"] as [number, "red" | "blue", "placed"] : cell
            )
        );
        return board;
    };

    const swapTurn = useCallback(() => {
        dispatch({ type: "SET_TURN_STATE", payload: "TURN_END" });
        dispatch({ type: "SET_TURN", payload: (turn === "red") ? "blue" : "red" });

        dispatch({ type: "INCREMENT_TURN" });
    }, [turn, dispatch, board]);


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


    const determineElementalBoardCells = () => {
        if (!rules || !rules?.includes("elemental")) return;
        const position = new Set<string>();

        for (let i = 0; i <= 2; i++) {
            if (position.size && Math.random() < 0.6) continue;

            const row = Math.floor(Math.random() * 3);
            const col = Math.floor(Math.random() * 3);
            const pos = `${row},${col}`;
            position.add(pos);
        }

        const result: { [key: string]: (typeof elementsList)[number] } = {};
        position.forEach((pos) => {
            const element = elementsList[Math.floor(Math.random() * elementsList.length)];
            result[pos] = element;
        });

        dispatch({ type: "SET_ELEMENTS", payload: result });
    };


    const determineCardFlips = useCallback((row: number, col: number, player: "red" | "blue", currentBoard: ([number, "red" | "blue", "placed" | "flipped" | undefined] | null)[][] = board) => {
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

            let activeCardModifier = 0
            if (elements && String([row, col]) in elements) {
                activeCardModifier = (elements[String([row, col])] === activeCard?.element) ? 1 : -1;
            }

            let competingCardModifier = 0;
            if (elements && String([r, c]) in elements) {
                competingCardModifier = (elements[String([r, c])] === competingCard?.element) ? 1 : -1;
            }

            if ((activeCard[direction] + activeCardModifier) > (competingCard[competingCardMap[direction]] + competingCardModifier)) {
                flips.push({ row: r, col: c, player });
            }
        }

        if (flips.length > 0) {
            playSound("flip", isSoundEnabled);
            const newBoard = [...currentBoard.map(row => [...row])];
            flips.forEach(({ row, col, player }) => {
                if (currentBoard[row][col]) {
                    newBoard[row][col] = [currentBoard[row][col]![0], player, "flipped"];
                }
            });

            dispatch({ type: "SET_BOARD", payload: newBoard });
            return;
        }

        dispatch({ type: "SET_BOARD", payload: currentBoard });
    }, [board, dispatch]);


    const placeCard = useCallback((row: number, col: number, cardId: number, player: "red" | "blue", currentBoard: ([number, "red" | "blue", "placed" | "flipped" | undefined] | null)[][] = board) => {
        dispatch({ type: "SET_TURN_STATE", payload: "PLACING_CARD" });
        if (currentBoard[row][col]) return;

        const newBoard = currentBoard.map(row => [...row]);
        newBoard[row][col] = [cardId, player, "placed"];

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
        playSound("place", isSoundEnabled);
        swapTurn();
    }, [board, selectedCard, turn, grabCardFromHand, placeCard, swapTurn]);


    const handleMouseEnter = (rowIndex: number, colIndex: number) => {
        if (!board[rowIndex][colIndex] && !!selectedCard && turn === "blue") {
            playSound("select", isSoundEnabled);
        }
    }


    useEffect(() => {
        if (turn === "red" && turnNumber <= 9) {
            const enemyMove = getEnemyMove(board, currentEnemyHand, "advanced", elements);
            if (enemyMove) {
                const { enemyCardIndex, enemyCard, enemyPosition } = enemyMove;

                setTimeout(() => {
                    playSound("select", isSoundEnabled);

                    dispatch({
                        type: "SET_SELECTED_CARD",
                        payload: [enemyCard, "red", enemyCardIndex],
                    });
                }, 3000);

                setTimeout(() => {
                    grabCardFromHand(enemyCardIndex, "red");
                    placeCard(enemyPosition.row, enemyPosition.col, enemyCard, "red");
                    playSound("place", isSoundEnabled);
                    swapTurn();
                }, 4500);
            }
        }

        dispatch({ type: "SET_BOARD", payload: resetBoardValuesOnSwap(board) });
    }, [turn]);


    useEffect(() => {
        const redScore = board.flat().filter(entry => entry?.[1] === "red").length + currentEnemyHand.length;
        const blueScore = board.flat().filter(entry => entry?.[1] === "blue").length + currentPlayerHand.length;

        dispatch({ type: "SET_SCORE", payload: [redScore, blueScore] });
        
        setWinState([redScore, blueScore])
    }, [board]);


    useEffect(() => {
        if (!isGameActive) return;
        determineElementalBoardCells();
    }, [isGameActive]);


    return (
        <>
            {isGameActive && turnNumber === 1 && <Indicator type="STARTING_PLAYER_INDICATOR" />}
            <div className={`${styles.board} ${className || ''}`.trim()}>
                {board.map((row, rowIndex) => (
                    row.map((col, colIndex) => (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            className={styles.cell}
                            data-position={[rowIndex, colIndex]}
                            data-selectable={!board[rowIndex][colIndex] && !!selectedCard && turn === "blue"}
                            data-element={(elements && String([rowIndex, colIndex]) in elements) ? elements[String([rowIndex, colIndex])] : null}
                            onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                            onClick={() => handlePlayerBoardSelection(rowIndex, colIndex)}
                        >
                            {col && (() => {
                                const cardData = cards.find(card => card.id === col[0]);
                                let modifier = 0;
                                if (elements && String([rowIndex, colIndex]) in elements) {
                                    modifier = (elements[String([rowIndex, colIndex])] === cardData?.element) ? 1 : -1;
                                }
                                return cardData && <Card {...cardData} player={col[1]} onBoard={true} data-state={col[2]} data-modifier={modifier} />;
                            })()}
                            {elements && String([rowIndex, colIndex]) in elements && <div data-element data-sprite={elements[String([rowIndex, colIndex])]}>{elements[String([rowIndex, colIndex])]}</div>}
                        </div>
                    ))
                ))}
            </div >
            {turn === "blue" && selectedCard && <div className={styles.selectedCardLabel}><SimpleDialog>{textToSprite(cards.find(card => card.id === selectedCard[0])?.name || "", undefined, true)}</SimpleDialog></div>}
        </>
    );
};

export default Board;