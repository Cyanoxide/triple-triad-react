import React from 'react';
import styles from './Hand.module.scss';
import Card from '../Card/Card';

interface HandProps {
    className?: string;
    player: "red" | "blue";
    cards: number[];
}

const Hand: React.FC<HandProps> = ({ className, player, cards }) => {
    return (
        <div className={`${styles.hand} ${className || ''} player-${player}`.trim()}>
            {cards.map((card, index) => (
                <div key={index} className="cell">
                    <Card id={card} player={player} />
                </div>
            ))}
        </div>
    );
};

export default Hand;