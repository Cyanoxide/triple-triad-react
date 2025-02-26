import React from 'react';
import styles from './Hand.module.scss';
import Card from '../Card/Card';

interface HandProps {
    className?: string;
    player: "red" | "blue";
}

const Hand: React.FC<HandProps> = ({ className, player }) => {
    return (
        <div className={`${styles.hand} ${className || ''} player-${player}`.trim()}>
            <div className="cell"></div>
            <div className="cell"></div>
            <div className="cell"><Card id={26} player={player} /></div>
            <div className="cell"></div>
            <div className="cell"></div>
        </div>
    );
};

export default Hand;