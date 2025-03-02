import React from 'react';
import styles from './Card.module.scss';
import cards from '../../../data/cards.json';

interface CardProps {
    id: number;
    player: "red" | "blue";
    onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ id, player }) => {
    const card = cards.find(card => card.id === id);

    if (!card) return;

    return (
        <div className={`${styles.card} relative`} data-player={player} draggable="true" >
            {/* <img src={image} alt={`Card ${id}`} /> */}
            < p > {card.name}</p>
            <div className={`${styles.values} relative`}>
                <span className={`${styles.topValue} absolute text-center`}>{card.top}</span>
                <span className={`${styles.rightValue} rightValue absolute text-center`}>{card.right}</span>
                <span className={`${styles.bottomValue} bottomValue absolute text-center`}>{card.bottom}</span>
                <span className={`${styles.leftValue} leftValue absolute text-center`}>{card.left}</span>
            </div>
        </div >
    );
};

export default Card;