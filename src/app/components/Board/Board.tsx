import React from 'react';
import styles from './Board.module.scss';
import Card from '../Card/Card';

interface BoardProps {
    className?: string;
}

const Board: React.FC<BoardProps> = ({ className }) => {
    return (
        <div className={`${styles.board} ${className || ''}`.trim()}>
            <div className="cell"></div>
            <div className="cell"><Card id={11} player="red" /></div>
            <div className="cell"></div>
            <div className="cell"></div>
            <div className="cell"></div>
            <div className="cell"><Card id={2} player="blue" /></div>
            <div className="cell"></div>
            <div className="cell"></div>
            <div className="cell"><Card id={6} player="red" /></div>
        </div >
    );
};

export default Board;