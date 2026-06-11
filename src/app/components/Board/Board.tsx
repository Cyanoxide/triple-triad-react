"use client"

import React, { useState, useCallback, useEffect, useRef } from 'react';
import styles from './Board.module.scss';
import Card from '../Card/Card';
import cards from '../../../data/cards.json';
import { useGameContext } from "../../context/GameContext";
import { BoardType, CardType, DirectionType, PlayerType, PositionType, FlipDirectionType } from "../../context/GameTypes";
import { getEnemyMove } from '../../utils/ai';
import SimpleDialog from '../SimpleDialog/SimpleDialog';
import Indicator from '../Indicator/Indicator';
import playSound from "../../utils/sounds";
import textToSprite from '../../utils/textToSprite';
import elementsList from "../../../data/elements.json";
import BoardMessage from "../BoardMessage/BoardMessage";
import { useCursorNav, consumeKeyboardNavIntent } from "../../hooks/useCursorNav";
import { gameNav } from "../../hooks/gameNav";

interface BoardProps {
    className?: string;
}

const Board: React.FC<BoardProps> = ({ className }) => {
    const debug = false;
    const { currentPlayerHand, currentEnemyHand, selectedCardId, turn, turnNumber, turnState, score, board, isGameActive, isSoundEnabled, rules, elements, winState, isMenuOpen, isCardSelectionOpen, isCardGalleryOpen, isRewardSelectionOpen, dispatch } = useGameContext();
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

    const selectedCard = [...currentPlayerHand, ...currentEnemyHand].find(card => card.uniqueId === selectedCardId);

    const isCardOwnedByOpposingPlayer = (card: CardType) => card && card.currentOwner !== turn;

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


    const grabCardFromHand = useCallback((card: CardType, player: PlayerType) => {
        dispatch({ type: "SET_TURN_STATE", payload: "SELECTING_CARD" });
        const isPlayer = player === "blue";
        const cards = isPlayer ? [...currentPlayerHand] : [...currentEnemyHand];
        const newCards = cards.filter(handCard => handCard !== card);

        dispatch({
            type: isPlayer ? "SET_CURRENT_PLAYER_HAND" : "SET_CURRENT_ENEMY_HAND",
            payload: newCards
        });
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
        const wallCard = { cardId: 110, currentOwner: turn, position: opposingPosition, action: "wall", initialOwner: null };

        if (isOpposingOutOfBounds || isActiveOutOfBounds) {
            if (rules && rules.includes("sameWall")) {
                opposingCard = isOpposingOutOfBounds
                    ? wallCard
                    : currentBoard[values.opposingRow][values.opposingCol];

                activeCard = isActiveOutOfBounds
                    ? wallCard
                    : currentBoard[row][col];
            } else {
                return;
            }
        } else {
            opposingCard = currentBoard[values.opposingRow][values.opposingCol];
            activeCard = currentBoard[row][col];
        }

        const activeCardData = cards.find(card => card.id === activeCard?.cardId);
        const opposingCardData = cards.find(card => card.id === opposingCard?.cardId);

        if (!activeCard || !activeCardData) return;
        if (!opposingCard || !opposingCardData) return;

        values.isOpponent = (opposingCard.currentOwner === turn) ? false : true;

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
                    adjacentCard = { cardId: 110, currentOwner: (turn === "red") ? "blue" : "red" as PlayerType, position: [opposingRow, opposingCol], action: "wall" };
                } else {
                    continue;
                }
            } else {
                adjacentCard = currentBoard[opposingRow][opposingCol];
            }

            if (adjacentCard === null) continue;
            adjacentCards[String(position)] = adjacentCard;
            adjacentCount++;

            if (adjacentCard.currentOwner !== turn) hasOpponent = true;
        }

        return adjacentCount >= 2 && hasOpponent;
    }


    const determineRegularCardFlips = (position: PositionType, currentBoard: BoardType = board, combo = false) => {
        const cardFlips: { position: PositionType; action: string; flipDirection: FlipDirectionType }[] = [];

        for (const direction of Object.keys(directions) as DirectionType[]) {
            const adjacentValues = getAdjacentCardValues(position, direction, currentBoard);
            if (!adjacentValues) continue;

            const { attackingValue, defendingValue, opposingRow, opposingCol, isOpponent } = adjacentValues;
            if (attackingValue === undefined || defendingValue === undefined || opposingRow == null || opposingCol == null || !isOpponent) continue;
            if (attackingValue <= defendingValue) continue;
            cardFlips.push({ position: [opposingRow, opposingCol], action: (combo) ? "combo" : "flipped", flipDirection: (["top", "bottom"].includes(direction)) ? "vertical" : "horizontal" });
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
            if (!adjacentValues || (adjacentValues?.opposingRow != null && adjacentValues.opposingCol != null && isOutOfBounds([adjacentValues.opposingRow, adjacentValues.opposingCol]))) continue;
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
            initialFlips.forEach(({ position, action, flipDirection }) => {
                const [row, col] = position;

                if (row == null || col == null || isOutOfBounds(position)) return;
                const card = currentBoard[row][col] as CardType;

                if (!isCardOwnedByOpposingPlayer(card)) return;
                const existingCard = currentBoard[row][col];

                newBoard[row][col] = {
                    cardId: existingCard!.cardId,
                    currentOwner: turn,
                    initialOwner: existingCard?.initialOwner,
                    position: [row, col],
                    action: action,
                    flipDirection,
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

                    if (row == null || col == null || isOutOfBounds(position)) return;
                    const card = currentBoard[row][col] as CardType;

                    if (!isCardOwnedByOpposingPlayer(card)) return;
                    const existingCard = currentBoard[row][col];
                    newBoard[row][col] = {
                        cardId: existingCard!.cardId,
                        currentOwner: turn,
                        initialOwner: existingCard?.initialOwner,
                        position: [row, col],
                        action: action,
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
                    const card = currentBoard[row][col] as CardType;

                    if (!isCardOwnedByOpposingPlayer(card)) return;

                    const existingCard = currentBoard[row][col];

                    newBoard[row][col] = {
                        cardId: existingCard!.cardId,
                        currentOwner: turn,
                        initialOwner: existingCard?.initialOwner,
                        position: [row, col],
                        action: action,
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


    const placeCard = useCallback((row: number, col: number, card: CardType) => {
        dispatch({ type: "SET_TURN_STATE", payload: "PLACING_CARD" });
        if (board[row][col]) return;

        const newBoard = board.map(row => [...row]);

        newBoard[row][col] = {
            ...card,
            position: [row, col],
            action: "placed",
        }

        dispatch({ type: "SET_SELECTED_CARD_ID", payload: null });
        dispatch({ type: "SET_BOARD", payload: newBoard });

        processCardFlips([row, col], newBoard as BoardType);
    }, [board, processCardFlips, dispatch]);


    const handlePlayerBoardSelection = useCallback((rowIndex: number, colIndex: number) => {
        if (board[rowIndex][colIndex] || !selectedCard || selectedCard.currentOwner !== turn) return;

        grabCardFromHand(selectedCard, turn);
        placeCard(rowIndex, colIndex, selectedCard);
        playSound("place", isSoundEnabled);
        swapTurn();
    }, [board, selectedCardId, turn, grabCardFromHand, placeCard, swapTurn]);


    const handleMouseEnter = (rowIndex: number, colIndex: number) => {
        if (!board[rowIndex][colIndex] && !!selectedCardId && turn === "blue") {
            focus({ group: "board", index: rowIndex * 3 + colIndex });
        }
    }

    const lastHandIndexRef = useRef(0);
    const lastBoardCellRef = useRef<number | null>(null);
    const posRef = useRef<{ group: string; index: number } | null>(null);
    // The cell the AI's cursor hovers before it places a card
    const [aiBoardCell, setAiBoardCell] = useState<number | null>(null);

    const firstPlacementCell = () => {
        if (lastBoardCellRef.current !== null) {
            const row = Math.floor(lastBoardCellRef.current / 3);
            const col = lastBoardCellRef.current % 3;
            if (!board[row][col]) return lastBoardCellRef.current;
        }
        if (!board[1][1]) return 4;
        for (let index = 0; index < 9; index++) {
            if (!board[Math.floor(index / 3)][index % 3]) return index;
        }
        return 4;
    };

    const { pos, focus, setPosSilently, isFocused } = useCursorNav({
        groups: [
            { id: "hand", size: currentPlayerHand.length },
            { id: "board", size: 9 },
        ],
        initial: null,
        fallback: { group: "hand", index: 0 },
        enabled: isGameActive && turn === "blue" && !winState && !isMenuOpen && !isCardSelectionOpen && !isCardGalleryOpen && !isRewardSelectionOpen,
        resolveMove: (current, dir, { wrap }) => {
            if (current.group === "hand") {
                if ((dir === "up" || dir === "down") && currentPlayerHand.length > 0) {
                    return { group: "hand", index: wrap(current.index, (dir === "down") ? 1 : -1, currentPlayerHand.length) };
                }
                return null;
            }
            const row = Math.floor(current.index / 3);
            const col = current.index % 3;
            const nextRow = (dir === "up") ? (row + 2) % 3 : (dir === "down") ? (row + 1) % 3 : row;
            const nextCol = (dir === "left") ? (col + 2) % 3 : (dir === "right") ? (col + 1) % 3 : col;
            return { group: "board", index: nextRow * 3 + nextCol };
        },
        onFocus: (current) => {
            gameNav.setFocus(current.group === "hand" ? { player: "blue", index: current.index } : null);
        },
        onConfirm: (current) => {
            if (current.group === "hand") {
                const card = currentPlayerHand[current.index];
                if (!card) return;
                playSound("select", isSoundEnabled);
                dispatch({ type: "SET_SELECTED_CARD_ID", payload: card.uniqueId });
                lastHandIndexRef.current = current.index;
                gameNav.setFocus(null);
                setPosSilently({ group: "board", index: firstPlacementCell() });
                return;
            }
            const row = Math.floor(current.index / 3);
            const col = current.index % 3;
            if (!board[row][col] && selectedCard && selectedCard.currentOwner === turn) {
                lastBoardCellRef.current = current.index;
                handlePlayerBoardSelection(row, col);
            } else {
                playSound("error", isSoundEnabled);
            }
        },
        onCancel: () => {
            if (pos?.group !== "board") return;
            dispatch({ type: "SET_SELECTED_CARD_ID", payload: null });
            playSound("back", isSoundEnabled);
            const index = Math.min(lastHandIndexRef.current, Math.max(0, currentPlayerHand.length - 1));
            setPosSilently({ group: "hand", index });
            gameNav.setFocus({ player: "blue", index });
        },
    });

    posRef.current = pos;

    // Let mouse hover on blue hand cards move the shared cursor
    useEffect(() => {
        gameNav.actions.focusHand = (index) => focus({ group: "hand", index });
        return () => {
            gameNav.actions.focusHand = undefined;
        };
    }, [focus]);

    // After a placement (or any deselect) the cursor returns to the hand
    useEffect(() => {
        if (selectedCardId || pos?.group !== "board") return;
        if (currentPlayerHand.length === 0) {
            setPosSilently(null);
            gameNav.setFocus(null);
            return;
        }
        const index = Math.min(lastHandIndexRef.current, currentPlayerHand.length - 1);
        setPosSilently({ group: "hand", index });
        gameNav.setFocus({ player: "blue", index });
    }, [selectedCardId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Keyboard-started games begin with the cursor on the first hand card
    useEffect(() => {
        if (isGameActive) {
            if (consumeKeyboardNavIntent()) {
                setPosSilently({ group: "hand", index: 0 });
                gameNav.setFocus({ player: "blue", index: 0 });
            }
        } else {
            setPosSilently(null);
            gameNav.setFocus(null);
        }
    }, [isGameActive]); // eslint-disable-line react-hooks/exhaustive-deps


    useEffect(() => {
        if (turn === "red" && turnNumber <= ((debug) ? 1 : 9)) {
            const enemyMove = getEnemyMove(board, currentEnemyHand, "advanced", elements);
            if (enemyMove) {
                const { enemyCardId, enemyPosition, uniqueId } = enemyMove;
                if (!enemyCardId) return;

                const enemyDelay = () => Math.floor(Math.random() * 2000) + 1000;
                const enemyCard = [...currentEnemyHand].find(card => card.uniqueId === uniqueId);

                if (!enemyCard) return;

                setTimeout(() => {
                    playSound("select", isSoundEnabled);

                    // The cursor follows the AI: first onto its chosen hand card
                    const enemyHandIndex = currentEnemyHand.findIndex(card => card.uniqueId === uniqueId);
                    gameNav.setFocus({ player: "red", index: Math.max(0, enemyHandIndex) });

                    dispatch({
                        type: "SET_SELECTED_CARD_ID",
                        payload: enemyCard.uniqueId,
                    })

                    setTimeout(() => {
                        // ...then onto the target cell, before the card lands
                        gameNav.setFocus(null);
                        setAiBoardCell(enemyPosition.row * 3 + enemyPosition.col);

                        setTimeout(() => {
                            setAiBoardCell(null);
                            grabCardFromHand(enemyCard, "red");
                            placeCard(enemyPosition.row, enemyPosition.col, enemyCard);
                            playSound("place", isSoundEnabled);
                            swapTurn();
                            // Hand the cursor back to the player's hand
                            if (posRef.current?.group === "hand") {
                                gameNav.setFocus({ player: "blue", index: posRef.current.index });
                            }
                        }, 500);
                    }, enemyDelay());
                }, enemyDelay());
            }
        }
    }, [turn]);


    useEffect(() => {
        const redScore = board.flat().filter(card => card?.currentOwner === "red").length + currentEnemyHand.length;
        const blueScore = board.flat().filter(card => card?.currentOwner === "blue").length + currentPlayerHand.length;

        dispatch({ type: "SET_SCORE", payload: [redScore, blueScore] });

        setWinState([redScore, blueScore])
    }, [board]);

    const [showStartingPlayerIndicator, setShowStartingPlayerIndicator] = useState(false);


    useEffect(() => {
        if (!isGameActive) return;
        determineElementalBoardCells();
        setShowStartingPlayerIndicator(true);


        setTimeout(() => {
            setShowStartingPlayerIndicator(false);
        }, 1650);
    }, [isGameActive]);

    return (
        <>
            {showStartingPlayerIndicator && <Indicator type="STARTING_PLAYER_INDICATOR" />}
            <div className={`${styles.board} ${className || ''}`.trim()}>
                {board.map((row, rowIndex) => (
                    row.map((col, colIndex) => (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            className={styles.cell}
                            data-position={[rowIndex, colIndex]}
                            data-selectable={!board[rowIndex][colIndex] && turn === "blue" && !!selectedCardId}
                            data-focused={isFocused("board", rowIndex * 3 + colIndex) || aiBoardCell === rowIndex * 3 + colIndex}
                            data-element={(elements && String([rowIndex, colIndex]) in elements) ? elements[String([rowIndex, colIndex])] : null}
                            onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                            onClick={() => handlePlayerBoardSelection(rowIndex, colIndex)}
                        >
                            {col && (() => {
                                const cardData = cards.find(card => card.id === col.cardId);
                                let modifier = 0;
                                if (elements && String([rowIndex, colIndex]) in elements) {
                                    modifier = (elements[String([rowIndex, colIndex])] === cardData?.element) ? 1 : -1;
                                }
                                return cardData && <Card {...cardData} player={col.currentOwner as PlayerType} onBoard={true} data-state={col.action} data-flip-direction={col.flipDirection} data-modifier={modifier} />;
                            })()}
                            {elements && String([rowIndex, colIndex]) in elements && <div data-element data-sprite={elements[String([rowIndex, colIndex])]}>{elements[String([rowIndex, colIndex])]}</div>}
                        </div>
                    ))
                ))}
            </div >
            {turn === "blue" && selectedCardId && <div className={styles.selectedCardLabel}><SimpleDialog>{textToSprite(cards.find(card => card.id === selectedCard?.cardId)?.name || "", undefined, true)}</SimpleDialog></div>}
            {!winState && (sameFlag || plusFlag || comboFlag) && <BoardMessage message={(comboFlag) ? "combo" : (sameFlag) ? "same" : "plus"} />}
        </>
    );
};

export default Board;