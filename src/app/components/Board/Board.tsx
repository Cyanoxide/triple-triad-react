"use client"

import { useState, useEffect, useRef } from 'react';
import React from 'react';
import styles from './Board.module.scss';
import Card from '../Card/Card';
import cards from '../../../data/cards.json';

interface BoardProps {
    className?: string;
}

const Board: React.FC<BoardProps> = ({ className }) => {
    const [board, setBoard] = useState<([number, "red" | "blue"] | null)[][]>([
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ]);
    const [lastPlacedCard, setLastPlacedCard] = useState<{ position: [number, number], player: "red" | "blue" } | null>(null);

    const placeCard = (row: number, col: number, cardId: number, player: "red" | "blue") => {
        if (board[row][col]) return;

        setBoard(prevBoard => {
            const newBoard = prevBoard.map(row => [...row]);
            newBoard[row][col] = [cardId, player];
            return newBoard;
        });

        setLastPlacedCard({ position: [row, col], player });
    };

    const flipCard = (row: number, col: number, player?: "red" | "blue") => {
        const card = board[row][col];
        if (!card) return;

        const activePlayer = player || ((card[1] === "red") ? "blue" : "red");

        setBoard(prevBoard => {
            const newBoard = prevBoard.map(row => [...row]);
            newBoard[row][col] = [card[0], activePlayer];
            return newBoard;
        });
    }

    const handleDebugPlaceCard = () => {
        placeCard(1, 2, 14, "blue");
    }

    const handleDebugPlaceSecondCard = () => {
        placeCard(1, 1, 14, "red");
    }

    const handleDebugPlaceThirdCard = () => {
        placeCard(0, 1, 14, "blue");
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

        for (const [direction, { row: row, col: col }] of Object.entries(potentialFlips) as [keyof typeof competingCardMap, { row: number, col: number }][]) {
            const competingCardData = board[row]?.[col];
            if (!competingCardData) continue;

            const [competingCardId, competingCardOwner] = competingCardData;
            if (player === competingCardOwner) continue;

            const competingCard = cards.find(card => card.id === competingCardId);
            if (!competingCard) continue;

            if (activeCard[direction] > competingCard[competingCardMap[direction]]) {
                flipCard(row, col, player);
            }
        }
    };

    useEffect(() => {
        if (lastPlacedCard) {
            determineCardFlips(lastPlacedCard.position[0], lastPlacedCard.position[1], lastPlacedCard.player);
        }
    }, [lastPlacedCard]);

    return (
        <>
            <div className={`${styles.board} ${className || ''}`.trim()}>
                {board.map((row, rowIndex) => (
                    row.map((col, colIndex) => (
                        <div key={`${rowIndex}-${colIndex}`} className="cell" data-position={[rowIndex, colIndex]}>
                            {col && (() => {
                                const cardData = cards.find(card => card.id === col[0]);
                                return cardData && <Card {...cardData} player={col[1]} onClick={() => flipCard(rowIndex, colIndex)} />;
                            })()}
                        </div>
                    ))
                ))}
            </div >

            <div className="absolute bottom-0 left-[50%] transform -translate-x-1/2">
                <button className="bg-gray-50 text-black p-1 m-1" onClick={handleDebugPlaceCard}>Place Card</button>
                <button className="bg-gray-50 text-black p-1 m-1" onClick={handleDebugPlaceSecondCard}>Place Second Card</button>
                <button className="bg-gray-50 text-black p-1 m-1" onClick={handleDebugPlaceThirdCard}>Place Third Card</button>
                {/* <button className="bg-gray-50 text-black p-1 m-1" onClick={handleDebugFlipCard}>Flip Card</button> */}
            </div>
        </>
    );
};

export default Board;