import React from 'react';
import styles from './Board.module.scss';
import Card from '../Card/Card';

interface BoardProps {
    className?: string;
}

const Board: React.FC<BoardProps> = ({ className }) => {
    return (
        <div className={`${styles.board} ${className || ''}`.trim()}>
            <div className="item"><div className="content">1</div></div>
            <div className="item"><div className="content"><Card id={1} top={9} right={4} bottom={1} left={1} image="" /></div></div>
            <div className="item"><div className="content">3</div></div>
            <div className="item"><div className="content">4</div></div>
            <div className="item"><div className="content">5</div></div>
            <div className="item"><div className="content"><Card id={2} top={9} right={9} bottom={9} left={9} image="" /></div></div>
            <div className="item"><div className="content">7</div></div>
            <div className="item"><div className="content">8</div></div>
            <div className="item"><div className="content"><Card id={3} top={3} right={7} bottom={1} left={10} image="" /></div></div>
        </div >
    );
};

export default Board;