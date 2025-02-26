"use client"

import { useState, useEffect } from 'react';
import React from 'react';
import styles from './Board.module.scss';
import Card from '../Card/Card';

interface BoardProps {
    className?: string;
}

const Board: React.FC<BoardProps> = ({ className }) => {
    const [board, setBoard] = useState([
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ]);

    const placeCard = (row: number, col: number, cardId: number, player: "red" | "blue") => {
        setBoard(prevBoard => {
            const newBoard = prevBoard.map(row => [...row]);
            console.log(newBoard);
            newBoard[row][col] = [cardId, player];
            return newBoard;
        });
    };

    useEffect(() => {
        placeCard(1, 2, 14, "blue");
    }, [setBoard]);

    return (
        <div className={`${styles.board} ${className || ''}`.trim()}>
            {board.map((row, rowIndex) => (
                row.map((col, colIndex) => (
                    <div key={`${rowIndex}-${colIndex}`} className="cell" data-position={[rowIndex, colIndex]}>
                        {col && <Card id={col[0]} player={col[1]} />}
                    </div>
                ))
            ))}
        </div >
    );
};

export default Board;