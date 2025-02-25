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
            <div className="cell"><Card id={1} top={9} right={4} bottom={1} left={1} image="" player="red" /></div>
            <div className="cell"></div>
            <div className="cell"></div>
            <div className="cell"></div>
            <div className="cell"><Card id={2} top={9} right={9} bottom={9} left={9} image="" player="blue" /></div>
            <div className="cell"></div>
            <div className="cell"></div>
            <div className="cell"><Card id={3} top={3} right={7} bottom={1} left={10} image="" player="red" /></div>
        </div >
    );
};

export default Board;