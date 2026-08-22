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
import { multiplayer, useMultiplayer } from "../../hooks/multiplayerSession";
import { sendMove } from "../../utils/rooms";
import textToSprite from '../../utils/textToSprite';
import elementsList from "../../../data/elements.json";
import BoardMessage from "../BoardMessage/BoardMessage";
import { useCursorNav, consumeKeyboardNavIntent } from "../../hooks/useCursorNav";
import { gameNav } from "../../hooks/gameNav";

interface BoardProps {
    className?: string;
}

/** How long a player has before a move is made for them */
const MOVE_TIMEOUT = 120000;

/** The pause between the clock showing 0:00 and the card actually going down */
const AUTOPLAY_GRACE_MS = 1000;

/**
 * Development can shorten it with `window.__moveTimeout = 5000`, because
 * waiting two minutes to find out whether a two-minute timer works is not a
 * practical way to test it.
 */
const moveTimeout = () => {
    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
        const override = (window as unknown as { __moveTimeout?: number }).__moveTimeout;
        if (typeof override === "number" && override > 0) return override;
    }
    return MOVE_TIMEOUT;
};

/**
 * Mulberry32. Small, and identical in both tabs for a given seed, which is the
 * only property that matters here — this is for agreeing on a board, not for
 * anything that has to be unguessable.
 */
const seededRandom = (seed: number) => {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const Board: React.FC<BoardProps> = ({ className }) => {
    const debug = false;
    const { session, pendingMoves } = useMultiplayer();
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

        /**
         * Against another player the squares come from the room's seed rather
         * than from Math.random. Each client used to roll its own, so the two
         * boards had elements in different places — and since the modifier
         * changes a card's values, the same move flipped different cards on
         * each screen and the scores drifted apart. Same and Plus made it
         * obvious, because they turn on values matching exactly.
         */
        const seed = multiplayer.get().seed;
        const random = seed === null ? Math.random : seededRandom(seed);

        const position = new Set<string>();

        for (let i = 0; i <= 2; i++) {
            if (position.size && random() < 0.6) continue;

            const row = Math.floor(random() * 3);
            const col = Math.floor(random() * 3);
            const pos = `${row},${col}`;
            position.add(pos);
        }

        const result: { [key: string]: (typeof elementsList)[number] } = {};
        position.forEach((pos) => {
            const element = elementsList[Math.floor(random() * elementsList.length)];
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
        playSound("place", isSoundEnabled);
        placeCard(rowIndex, colIndex, selectedCard);
        swapTurn();

        // Tell the other player. Sent after it has been played locally, so the
        // board never waits on the network to respond to your own move.
        if (session) {
            void sendMove(session.code, session.token, {
                cardId: selectedCard.cardId,
                row: rowIndex,
                col: colIndex,
            }).catch(() => playSound("error", isSoundEnabled));
        }
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

    // After a placement (or any deselect) the cursor returns to the hand;
    // the visible hand cursor only renders on the player's own turn
    useEffect(() => {
        if (selectedCardId || pos?.group !== "board") return;
        if (currentPlayerHand.length === 0) {
            setPosSilently(null);
            gameNav.setFocus(null);
            return;
        }
        const index = Math.min(lastHandIndexRef.current, currentPlayerHand.length - 1);
        setPosSilently({ group: "hand", index });
        gameNav.setFocus((turn === "blue") ? { player: "blue", index } : null);
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
        // Red is another person in a multiplayer game, not the computer
        if (multiplayer.get().session) return;

        if (turn === "red" && turnNumber <= ((debug) ? 1 : 9)) {
            // The player's cursor hides while the AI takes its turn
            gameNav.setFocus(null);
            const enemyMove = getEnemyMove(board, currentEnemyHand, "advanced", elements);
            if (enemyMove) {
                const { enemyCardId, enemyPosition, uniqueId } = enemyMove;
                if (!enemyCardId) return;

                const enemyCard = [...currentEnemyHand].find(card => card.uniqueId === uniqueId);

                if (!enemyCard) return;

                const targetIndex = Math.max(0, currentEnemyHand.findIndex(card => card.uniqueId === uniqueId));
                const handSize = currentEnemyHand.length;

                // The AI's cursor starts on its top card and walks down to its
                // pick, sometimes lingering on a decoy as though changing its mind
                const walk: number[] = [0];
                const pushWalk = (from: number, to: number) => {
                    const step = (to >= from) ? 1 : -1;
                    for (let i = from + step; (step > 0) ? i <= to : i >= to; i += step) walk.push(i);
                };

                let decoyIndex: number | null = null;
                if (handSize > 1 && Math.random() < 0.6) {
                    const candidates = Array.from({ length: handSize }, (_, index) => index).filter(index => index !== targetIndex && index !== 0);
                    if (candidates.length) decoyIndex = candidates[Math.floor(Math.random() * candidates.length)];
                }

                if (decoyIndex !== null) {
                    pushWalk(0, decoyIndex);
                    pushWalk(decoyIndex, targetIndex);
                } else {
                    pushWalk(0, targetIndex);
                }

                let delay = Math.floor(Math.random() * 800) + 700;
                walk.forEach((index) => {
                    setTimeout(() => {
                        playSound("select", isSoundEnabled);
                        gameNav.setFocus({ player: "red", index });
                    }, delay);
                    // a longer beat on the decoy card sells the hesitation
                    delay += (index === decoyIndex)
                        ? Math.floor(Math.random() * 400) + 550
                        : Math.floor(Math.random() * 120) + 220;
                });

                delay += Math.floor(Math.random() * 500) + 400;
                setTimeout(() => {
                    dispatch({
                        type: "SET_SELECTED_CARD_ID",
                        payload: enemyCard.uniqueId,
                    })
                }, delay);

                delay += Math.floor(Math.random() * 900) + 700;
                setTimeout(() => {
                    // ...then onto the target cell, before the card lands
                    gameNav.setFocus(null);
                    setAiBoardCell(enemyPosition.row * 3 + enemyPosition.col);
                }, delay);

                delay += 500;
                setTimeout(() => {
                    setAiBoardCell(null);
                    grabCardFromHand(enemyCard, "red");
                    playSound("place", isSoundEnabled);
                    placeCard(enemyPosition.row, enemyPosition.col, enemyCard);
                    swapTurn();
                    // Hand the cursor back to the player's hand
                    if (posRef.current?.group === "hand") {
                        gameNav.setFocus({ player: "blue", index: posRef.current.index });
                    }
                }, delay);
            }
        }
    }, [turn]);


    /**
     * Nobody waits forever for a turn.
     *
     * After MOVE_TIMEOUT a move is played for whoever is holding things up.
     * Only the player whose turn it is runs this clock and only for their own
     * move — if both sides timed out independently they would each play a card
     * and the boards would diverge. The opponent simply receives it as a normal
     * move, so nothing else needs to know a timeout happened.
     *
     * The card and cell are chosen at random rather than well: this is a
     * nudge for someone who has walked away, not a substitute player.
     */
    useEffect(() => {
        // Off unless the host switched it on. Without the rule a game simply
        // waits, which is what someone playing at their own pace would want.
        if (!rules?.includes("autoplay")) { multiplayer.setAutoplayAt(null); return; }
        if (!session || winState || !isGameActive) {
            multiplayer.setAutoplayAt(null);
            return;
        }

        const wait = moveTimeout();

        /**
         * The clock is shown on the opponent's turn as well, so the wait always
         * has a number against it rather than only when you are the one
         * holding things up. Only their own client will actually play for them
         * — this side is display alone, started from the moment the turn
         * arrived here, so it can run a beat behind theirs over a slow link.
         */
        if (turn !== "blue") {
            multiplayer.setAutoplayAt(Date.now() + wait);
            return;
        }

        if (!currentPlayerHand.length) {
            multiplayer.setAutoplayAt(null);
            return;
        }

        multiplayer.setAutoplayAt(Date.now() + wait);

        /**
         * A beat between the clock reaching zero and the card being played, so
         * the move does not land in the same instant the number hits 0:00 —
         * there is nothing to read in a countdown whose end you never see.
         */
        const timeout = setTimeout(() => {
            multiplayer.setAutoplayAt(null);
            const empty: [number, number][] = [];
            board.forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
                if (!cell) empty.push([rowIndex, colIndex]);
            }));
            if (!empty.length) return;

            const card = currentPlayerHand[Math.floor(Math.random() * currentPlayerHand.length)];
            const [row, col] = empty[Math.floor(Math.random() * empty.length)];
            if (!card) return;

            grabCardFromHand(card, "blue");
            playSound("place", isSoundEnabled);
            placeCard(row, col, card);
            swapTurn();

            void sendMove(session.code, session.token, { cardId: card.cardId, row, col })
                .catch(() => { });
        }, wait + AUTOPLAY_GRACE_MS);

        return () => clearTimeout(timeout);
    }, [turn, session, winState, isGameActive, turnNumber, rules]); // eslint-disable-line react-hooks/exhaustive-deps


    /**
     * A move from the other player.
     *
     * It runs through grabCardFromHand and placeCard exactly as a local move
     * does, so the flips, the sounds and the timing are the ones already built
     * — nothing about a remote move is drawn differently.
     *
     * The card is matched by id rather than by uniqueId: each client generates
     * its own uniqueIds when it builds the opponent's hand, so they never agree
     * across the wire. Two copies of the same card are interchangeable anyway.
     *
     * The timer is held in a ref and deliberately *not* cleared when the effect
     * re-runs. Consuming the move updates the store, which re-renders this
     * component and changes these dependencies — a cleanup that cleared the
     * timeout would cancel the very move it had just scheduled, and the move
     * would disappear with nothing to show for it.
     */
    const remoteMoveTimer = useRef<number | null>(null);

    useEffect(() => () => {
        if (remoteMoveTimer.current) clearTimeout(remoteMoveTimer.current);
    }, []);

    useEffect(() => {
        if (!session || turn !== "red" || winState) return;
        if (remoteMoveTimer.current) return;

        // Looked at before it is taken: if the card cannot be found yet — the
        // opponent's hand may not have been applied — leaving it queued means
        // the next render tries again rather than dropping it
        const move = multiplayer.peekMove();
        if (!move) return;

        const card = currentEnemyHand.find((candidate) => candidate.cardId === move.cardId);
        if (!card) return;

        multiplayer.takeMove();
        gameNav.setFocus(null);

        // A short beat, so the card does not appear the instant a poll returns
        remoteMoveTimer.current = window.setTimeout(() => {
            remoteMoveTimer.current = null;
            grabCardFromHand(card, "red");
            playSound("place", isSoundEnabled);
            placeCard(move.row, move.col, card);
            swapTurn();
            if (posRef.current?.group === "hand") {
                gameNav.setFocus({ player: "blue", index: posRef.current.index });
            }
        }, 400);
    }, [pendingMoves, turn, session, winState, currentEnemyHand]); // eslint-disable-line react-hooks/exhaustive-deps


    useEffect(() => {
        const redScore = board.flat().filter(card => card?.currentOwner === "red").length + currentEnemyHand.length;
        const blueScore = board.flat().filter(card => card?.currentOwner === "blue").length + currentPlayerHand.length;

        dispatch({ type: "SET_SCORE", payload: [redScore, blueScore] });

        setWinState([redScore, blueScore])
        /**
         * Recomputed when a game starts as well as when the board changes.
         *
         * On `board` alone it was never recomputed at kickoff — the board does
         * not change, it is nine empty cells before and after — so the score on
         * screen was whatever card selection had left in the array. That screen
         * used to add to it as you picked, one per card, straight into the
         * state object: invisible at the time, since the score is hidden until
         * a game is on, and then shown as the opening score. Those writes are
         * gone and this no longer depends on them.
         */
    }, [board, isGameActive]);

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