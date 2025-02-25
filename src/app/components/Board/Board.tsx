import React from 'react';
import styles from './Board.module.scss';

interface BoardProps {
    className?: string;
}

const Board: React.FC<BoardProps> = ({ className }) => {
    return (
        <div className={`${styles.board} ${className || ''}`.trim()}>
            <div className="item"><div className="content">1</div></div>
            <div className="item"><div className="content">2</div></div>
            <div className="item"><div className="content">3</div></div>
            <div className="item"><div className="content">4</div></div>
            <div className="item"><div className="content">5</div></div>
            <div className="item"><div className="content">6</div></div>
            <div className="item"><div className="content">7</div></div>
            <div className="item"><div className="content">8</div></div>
            <div className="item"><div className="content">9</div></div>
        </div>
    );
};

export default Board;