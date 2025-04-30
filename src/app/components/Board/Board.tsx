"use client"

import React, { useState, useCallback, useEffect } from 'react';
import styles from './Board.module.scss';
import Card from '../Card/Card';
import cards from '../../../data/cards.json';
import { useGameContext } from "../../context/GameContext";
import { BoardType, CardType, DirectionType, PlayerType, PositionType } from "../../context/GameTypes";
import { getEnemyMove } from '../../utils/ai';
import SimpleDialog from '../SimpleDialog/SimpleDialog';
import Indicator from '../Indicator/Indicator';
import playSound from "../../utils/sounds";
import textToSprite from '../../utils/textToSprite';
import elementsList from "../../../data/elements.json";
import BoardMessage from "../BoardMessage/BoardMessage";

interface BoardProps {
    className?: string;
}

const Board: React.FC<BoardProps> = ({ className }) => {
    const debug = false;
    const { currentPlayerHand, currentEnemyHand, selectedCard, turn, turnNumber, turnState, score, board, isGameActive, isSoundEnabled, rules, elements, winState, dispatch } = useGameContext();
    const [sameFlag, setSameFlag] = useState(false);
    const [plusFlag, setPlusFlag] = useState(false);
    const [comboFlag, setComboFlag] = useState(false);

    const directions = {
        top: [-1, 0],
        right: [0, 1],
        bottom: [1, 0],
        left: [0, -1],
    } as const;

    const opposingCardMap = {
        top: "bottom",
        right: "left",
        bottom: "top",
        left: "right",
    } as const;

    const isOutOfBounds = (position: PositionType) => {
        const [row, col] = position;
        return row < 0 || row >= board.length || col < 0 || col >= board[0].length;
    }

    const setWinState = useCallback((currentScore: [number, number] = score) => {
        if (debug) {
            if (isGameActive) dispatch({ type: "SET_WIN_STATE", payload: debug });
            return;
        }

        if (turnNumber <= 9 || turnState !== "TURN_END") return;
        const [redScore, blueScore] = currentScore;

        setTimeout(() => {
            if (redScore === blueScore) dispatch({ type: "SET_WIN_STATE", payload: "draw" });
            if (redScore > blueScore) dispatch({ type: "SET_WIN_STATE", payload: "red" });
            if (redScore < blueScore) {
                dispatch({ type: "SET_WIN_STATE", payload: "blue" });
            }
        }, 1000);
    }, [turnNumber]);


    const swapTurn = useCallback(() => {
        dispatch({ type: "SET_TURN_STATE", payload: "TURN_END" });
        dispatch({ type: "SET_TURN", payload: (turn === "red") ? "blue" : "red" });

        dispatch({ type: "INCREMENT_TURN" });
    }, [turn, dispatch, board]);


    const grabCardFromHand = useCallback((position: number, player: PlayerType) => {
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


    const getAdjacentCardValues = (position: PositionType, direction: DirectionType, currentBoard: BoardType = board) => {
        const values: {
            opposingRow?: number;
            opposingCol?: number;
            attackingValue?: number;
            defendingValue?: number;
            isOpponent?: boolean;
        } = {};

        const [row, col] = position;
        const [x, y] = directions[direction];

        values.opposingRow = Number(row + x);
        values.opposingCol = Number(col + y);
        const opposingPosition = [values.opposingRow, values.opposingCol] as PositionType;
        let opposingCard = null;
        let activeCard = null;

        const isActiveOutOfBounds = isOutOfBounds(position);
        const isOpposingOutOfBounds = isOutOfBounds(opposingPosition);

        if (isOpposingOutOfBounds || isActiveOutOfBounds) {
            if (rules && rules.includes("sameWall")) {
                opposingCard = isOpposingOutOfBounds
                    ? [110, turn === "red" ? "blue" : "red", opposingPosition, "wall", null] as CardType
                    : currentBoard[values.opposingRow][values.opposingCol];

                activeCard = isActiveOutOfBounds
                    ? [110, turn, opposingPosition, "wall", null] as CardType
                    : currentBoard[row][col];
            } else {
                return;
            }
        } else {
            opposingCard = currentBoard[values.opposingRow][values.opposingCol];
            activeCard = currentBoard[row][col];
        }

        const activeCardData = cards.find(card => card.id === activeCard?.[0]);
        const opposingCardData = cards.find(card => card.id === opposingCard?.[0]);

        if (!activeCard || !activeCardData) return;
        if (!opposingCard || !opposingCardData) return;

        values.isOpponent = (opposingCard[1] === turn) ? false : true;

        const positionStr = String(position);
        const opposingPositionStr = String(opposingPosition);

        const activeCardModifier = (elements && positionStr in elements) ? elements[positionStr] === activeCardData?.element ? 1 : -1 : 0;
        const opposingCardModifier = (elements && opposingPositionStr in elements) ? elements[opposingPositionStr] === opposingCardData?.element ? 1 : -1 : 0;

        const opposingDirection = opposingCardMap[direction];

        values.attackingValue = activeCardData[direction] + activeCardModifier;
        values.defendingValue = opposingCardData[opposingDirection] + opposingCardModifier;

        return values;
    }


    const isEligableforPlusSame = (position: PositionType, currentBoard: BoardType = board) => {
        if (!rules || (!rules.includes("same") && !rules.includes("sameWall") && !rules.includes("plus"))) return;

        const adjacentCards: { [key: string]: CardType } = {};
        const [row, col] = position;
        let hasOpponent = false;
        let adjacentCount = 0;

        for (const [x, y] of Object.values(directions)) {
            const opposingRow = row + x;
            const opposingCol = col + y;

            const isOpposingOutOfBounds = isOutOfBounds([opposingRow, opposingCol]);
            let adjacentCard = null;

            if (isOpposingOutOfBounds) {
                if (rules.includes("sameWall")) {
                    adjacentCard = [110, (turn === "red") ? "blue" : "red", [opposingRow, opposingCol], "wall", null] as CardType;
                } else {
                    continue;
                }
            } else {
                adjacentCard = currentBoard[opposingRow][opposingCol];
            }

            if (adjacentCard === null) continue;
            adjacentCards[String(position)] = adjacentCard;
            adjacentCount++;

            const cardOwner = adjacentCard[1];

            if (cardOwner !== turn) {
                hasOpponent = true;
            }
        }

        return adjacentCount >= 2 && hasOpponent;
    }


    const determineRegularCardFlips = (position: PositionType, currentBoard: BoardType = board, combo = false) => {
        const cardFlips: { position: PositionType; action: string }[] = [];

        for (const direction of Object.keys(directions) as DirectionType[]) {
            const adjacentValues = getAdjacentCardValues(position, direction, currentBoard);
            if (!adjacentValues) continue;

            const { attackingValue, defendingValue, opposingRow, opposingCol, isOpponent } = adjacentValues;
            if (!attackingValue || !defendingValue || opposingRow == null || opposingCol == null || !isOpponent) continue;
            if (attackingValue <= defendingValue) continue;
            cardFlips.push({ position: [opposingRow, opposingCol], action: (combo) ? "combo" : "flipped" });
        }
        return cardFlips;
    }


    const determineSameCardFlips = (position: PositionType, currentBoard: BoardType = board) => {
        if (!rules || (!rules.includes("same") && !rules.includes("sameWall"))) return;
        const cardFlips: { position: PositionType; action: string }[] = [];
        const comboFlips: { position: PositionType; action: string }[] = [];

        for (const direction of Object.keys(directions) as DirectionType[]) {
            const adjacentValues = getAdjacentCardValues(position, direction, currentBoard);
            if (!adjacentValues) continue;

            const { attackingValue, defendingValue, opposingRow, opposingCol } = adjacentValues;
            if (!attackingValue || !defendingValue || opposingRow == null || opposingCol == null) continue;

            if (attackingValue === defendingValue) {
                cardFlips.push({ position: [opposingRow, opposingCol], action: "same" });

                const combos = determineRegularCardFlips([opposingRow, opposingCol], currentBoard, true);
                if (!combos) continue;

                comboFlips.push(...combos);
            }
        }

        return [...cardFlips, ...comboFlips];
    }


    const determinePlusCardFlips = (position: PositionType, currentBoard: BoardType = board) => {
        if (!rules || !rules.includes("plus")) return;
        const moves: { position: PositionType, attackingValue: number, defendingValue: number, isOpponent?: boolean }[] = [];
        const cardFlips: { position: PositionType; action: string }[] = [];
        const comboFlips: { position: PositionType; action: string }[] = [];

        for (const direction of Object.keys(directions) as DirectionType[]) {
            const adjacentValues = getAdjacentCardValues(position, direction, currentBoard);
            if (!adjacentValues) continue;
            const { attackingValue, defendingValue, opposingRow, opposingCol } = adjacentValues;
            if (!attackingValue || !defendingValue || opposingRow == null || opposingCol == null) continue;

            moves.push({ position: [opposingRow, opposingCol], attackingValue, defendingValue });
        }

        type Move = { position: PositionType, attackingValue: number, defendingValue: number };
        type MoveMap = { [key: number]: Move[] };

        const movesByScore = moves.reduce((acc: MoveMap, move: Move) => {
            const valueTotal = move.attackingValue + move.defendingValue;

            if (!acc[valueTotal]) {
                acc[valueTotal] = [];
            }

            acc[valueTotal].push(move);
            return acc;
        }, {});

        Object.values(movesByScore).forEach((total) => {
            if (total.length >= 2) {
                total.forEach((move) => {
                    cardFlips.push({ position: move.position, action: "plus" });

                    const combos = determineRegularCardFlips(move.position, currentBoard, true);
                    if (!combos) return;

                    comboFlips.push(...combos);
                });
            }
        });

        return [...cardFlips, ...comboFlips];
    }



    const processCardFlips = (position: PositionType, currentBoard: BoardType = board) => {
        const initialFlips = determineRegularCardFlips(position, currentBoard);
        const newBoard = [...currentBoard];

        if (initialFlips && initialFlips.length > 0) {
            playSound("flip", isSoundEnabled);
            initialFlips.forEach(({ position, action }) => {
                const [row, col] = position;

                if (currentBoard[row][col] && currentBoard[row][col][1] !== turn) {
                    newBoard[row][col] = [currentBoard[row][col]![0], turn, [row, col], action, currentBoard[row][col][1]];
                }
            });
        }

        if (isEligableforPlusSame(position, currentBoard)) {
            const sameFlips = determineSameCardFlips(position, currentBoard);
            if (sameFlips && sameFlips.filter(obj => obj.action === "same").length >= 2) {
                playSound("flip", isSoundEnabled);
                setSameFlag(true);

                sameFlips.forEach(({ position, action }) => {
                    const [row, col] = position;

                    if (isOutOfBounds(position)) return;

                    if (currentBoard[row][col] && currentBoard[row][col][1] !== turn) {
                        newBoard[row][col] = [currentBoard[row][col][0], turn, [row, col], action, currentBoard[row][col][1]];
                    }
                });

                if (sameFlips.filter(obj => obj.action === "same").length < sameFlips.length) {
                    setTimeout(() => {
                        playSound("flip", isSoundEnabled);
                        setComboFlag(true)
                    }, 750);
                }
            }

            const plusFlips = determinePlusCardFlips(position, currentBoard);
            if (plusFlips && plusFlips.filter(obj => obj.action === "plus").length >= 2) {
                playSound("flip", isSoundEnabled);
                setPlusFlag(true);

                plusFlips.forEach(({ position, action }) => {
                    const [row, col] = position;

                    if (currentBoard[row][col] && currentBoard[row][col][1] !== turn) {
                        newBoard[row][col] = [currentBoard[row][col][0], turn, [row, col], action, currentBoard[row][col][1]];
                    }
                });

                if (plusFlips.filter(obj => obj.action === "plus").length < plusFlips.length) {
                    setTimeout(() => {
                        playSound("flip", isSoundEnabled);
                        setComboFlag(true)
                    }, 750);
                }
            }
        }

        dispatch({ type: "SET_BOARD", payload: currentBoard });
    }

    useEffect(() => {
        if (sameFlag || plusFlag) {
            setTimeout(() => {
                setSameFlag(false);
                setPlusFlag(false);
            }, 750);

            setTimeout(() => {
                setComboFlag(false);
            }, 1500);
        }
    }, [sameFlag, plusFlag]);


    const placeCard = useCallback((row: number, col: number, cardId: number) => {
        dispatch({ type: "SET_TURN_STATE", payload: "PLACING_CARD" });
        if (board[row][col]) return;

        const newBoard = board.map(row => [...row]);
        newBoard[row][col] = [Number(cardId), turn, [row, col], "placed", turn];

        dispatch({ type: "SET_SELECTED_CARD", payload: null });
        dispatch({ type: "SET_BOARD", payload: newBoard });

        processCardFlips([row, col], newBoard as BoardType);
    }, [board, processCardFlips, dispatch]);


    const handlePlayerBoardSelection = useCallback((rowIndex: number, colIndex: number) => {
        if (board[rowIndex][colIndex]) return;

        if (!selectedCard) return;
        const [cardId, cardPlayer, position] = selectedCard;

        if (cardPlayer !== turn || typeof position !== "number") return;

        grabCardFromHand(position, turn);
        placeCard(rowIndex, colIndex, cardId);
        playSound("place", isSoundEnabled);
        swapTurn();
    }, [board, selectedCard, turn, grabCardFromHand, placeCard, swapTurn]);


    const handleMouseEnter = (rowIndex: number, colIndex: number) => {
        if (!board[rowIndex][colIndex] && !!selectedCard && turn === "blue") {
            playSound("select", isSoundEnabled);
        }
    }


    useEffect(() => {
        if (turn === "red" && turnNumber <= ((debug) ? 1 : 9)) {
            const enemyMove = getEnemyMove(board, currentEnemyHand, "advanced", elements);
            if (enemyMove) {
                const { enemyCardIndex, enemyCardId, enemyPosition } = enemyMove;
                if (!enemyCardId) return;

                setTimeout(() => {
                    playSound("select", isSoundEnabled);

                    dispatch({
                        type: "SET_SELECTED_CARD",
                        payload: [enemyCardId, "red", enemyCardIndex, "", null],
                    });
                }, 3000);

                setTimeout(() => {
                    grabCardFromHand(enemyCardIndex, "red");
                    placeCard(enemyPosition.row, enemyPosition.col, enemyCardId);
                    playSound("place", isSoundEnabled);
                    swapTurn();
                }, 4500);
            }
        }
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
                                return cardData && <Card {...cardData} player={col[1]} onBoard={true} data-state={col[3]} data-modifier={modifier} />;
                            })()}
                            {elements && String([rowIndex, colIndex]) in elements && <div data-element data-sprite={elements[String([rowIndex, colIndex])]}>{elements[String([rowIndex, colIndex])]}</div>}
                        </div>
                    ))
                ))}
            </div >
            {turn === "blue" && selectedCard && <div className={styles.selectedCardLabel}><SimpleDialog>{textToSprite(cards.find(card => card.id === +selectedCard[0])?.name || "", undefined, true)}</SimpleDialog></div>}
            {!winState && (sameFlag || plusFlag || comboFlag) && <BoardMessage message={(comboFlag) ? "combo" : (sameFlag) ? "same" : "plus"} />}

        </>
    );
};

export default Board;