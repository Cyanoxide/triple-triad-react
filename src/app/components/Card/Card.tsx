import React from 'react';
import styles from './Card.module.scss';
import cards from '../../../data/cards.json';
import { useGameContext } from "../../context/GameContext";
import Image from 'next/image';

interface CardProps {
    id: number;
    player: "red" | "blue";
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

const Card: React.FC<CardProps> = ({ id, player, ...props }) => {
    const { isGameActive } = useGameContext();
    const card = cards.find(card => card.id === id);

    const renderCardValue = (number: number) => (number === 10) ? "A" : number;

    if (!card) return;

    return (
        <div className={`${styles.card} card relative ${(!isGameActive && player === "red") ? styles["card--hidden"] : ""}`} data-player={player} {...props} >
            <div className={styles.card__front} data-card-id={card.id} data-level={card.level}>
                <div className={`${styles.values} relative`}>
                    <span className={`${styles.topValue} absolute text-center`}>{renderCardValue(card.top)}</span>
                    <span className={`${styles.rightValue} rightValue absolute text-center`}>{renderCardValue(card.right)}</span>
                    <span className={`${styles.bottomValue} bottomValue absolute text-center`}>{renderCardValue(card.bottom)}</span>
                    <span className={`${styles.leftValue} leftValue absolute text-center`}>{renderCardValue(card.left)}</span>
                </div>
            </div>
            <div className={`${styles.card__back} absolute top-0 z-0`}>
                <Image src="/assets/cardback.png" alt="Card back" layout="fill" objectFit="cover" />
            </div>
        </div>
    );
};

export default Card;