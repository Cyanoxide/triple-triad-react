"use client"

import { useState, useEffect } from 'react';
import React from 'react';
import styles from './Board.module.scss';
import Card from '../Card/Card';

interface BoardProps {
    className?: string;
}

const Board: React.FC<BoardProps> = ({ className }) => {
    const [board, setBoard] = useState<([number, "red" | "blue"] | null)[][]>([
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ]);

    const placeCard = (row: number, col: number, cardId: number, player: "red" | "blue") => {
        if (board[row][col]) return;

        setBoard(prevBoard => {
            const newBoard = prevBoard.map(row => [...row]);
            newBoard[row][col] = [cardId, player];
            return newBoard;
        });
    };

    const flipCard = (row: number, col: number) => {
        const card = board[row][col];
        if (!card) return;

        const player = (card[1] === "red") ? "blue" : "red";

        setBoard(prevBoard => {
            const newBoard = prevBoard.map(row => [...row]);
            newBoard[row][col] = [card[0], player];
            return newBoard;
        });
    }

    const handleDebugPlaceCard = () => {
        placeCard(1, 2, 14, "blue");
    }

    const handleDebugFlipCard = () => {
        flipCard(1, 2);
    }

    return (
        <>
            <div className={`${styles.board} ${className || ''}`.trim()}>
                {board.map((row, rowIndex) => (
                    row.map((col, colIndex) => (
                        <div key={`${rowIndex}-${colIndex}`} className="cell" data-position={[rowIndex, colIndex]}>
                            {col && <Card id={col[0]} player={col[1]} onClick={() => flipCard(rowIndex, colIndex)} />}
                        </div>
                    ))
                ))}
            </div >

            <div className="absolute bottom-0 left-[50%] transform -translate-x-1/2">
                <button className="bg-gray-50 text-black p-1 m-1" onClick={handleDebugPlaceCard}>Place Card</button>
                <button className="bg-gray-50 text-black p-1 m-1" onClick={handleDebugFlipCard}>Flip Card</button>
            </div>
        </>
    );
};

export default Board;