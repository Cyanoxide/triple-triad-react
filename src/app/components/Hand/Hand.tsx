import React from 'react';
import styles from './Hand.module.scss';
import Card from '../Card/Card';
import { useGameContext } from "../../context/GameContext";

interface HandProps {
    className?: string;
    player: "red" | "blue";
}

const Hand: React.FC<HandProps> = ({ className, player }) => {
    const { playerCards, enemyCards } = useGameContext();
    const cards = (player === "red") ? playerCards : enemyCards;

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