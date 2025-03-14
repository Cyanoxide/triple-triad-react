import React from 'react';
import styles from './Card.module.scss';
import cards from '../../../data/cards.json';
import { useGameContext } from "../../context/GameContext";

interface CardProps {
    id: number;
    player: "red" | "blue";
    onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ id, player }) => {
    const { isGameActive } = useGameContext();
    const card = cards.find(card => card.id === id);

    if (!card) return;

    console.log(styles);

    return (
        <div className={`${styles.card} card relative ${(!isGameActive && player === "red") ? styles["card--hidden"] : ""}`} data-player={player} draggable="true" >
            <div className={styles.card__front}>
                {/* <img src={image} alt={`Card ${id}`} /> */}
                < p > {card.name}</p>
                <div className={`${styles.values} relative`}>
                    <span className={`${styles.topValue} absolute text-center`}>{card.top}</span>
                    <span className={`${styles.rightValue} rightValue absolute text-center`}>{card.right}</span>
                    <span className={`${styles.bottomValue} bottomValue absolute text-center`}>{card.bottom}</span>
                    <span className={`${styles.leftValue} leftValue absolute text-center`}>{card.left}</span>
                </div>
            </div>
            <div className={`${styles.card__back} absolute top-0 z-0`}></div>
        </div >
    );
};

export default Card;