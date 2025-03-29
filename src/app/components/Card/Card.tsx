import React from 'react';
import styles from './Card.module.scss';
import cards from '../../../data/cards.json';
import { useGameContext } from "../../context/GameContext";

interface CardProps {
    id: number;
    player: "red" | "blue";
    onBoard: boolean;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

const Card: React.FC<CardProps> = ({ id, player, onBoard, ...props }) => {
    const { isGameActive, rules } = useGameContext();
    const card = cards.find(card => card.id === id);

    const renderCardValue = (number: number) => (number === 10) ? "A" : number;

    if (!card) return;

    return (
        <div className={`${styles.card} ${(player === "red" && !onBoard && (!isGameActive || !rules?.includes("open"))) ? styles["card--hidden"] : ""} card relative`} data-player={player} {...props} >
            <div className={styles.card__front} data-card-id={card.id} data-level={card.level}>
                <div className={`${styles.values} relative`}>
                    <span className={`${styles.topValue} absolute text-center`} data-sprite={card.top}>{renderCardValue(card.top)}</span>
                    <span className={`${styles.rightValue} rightValue absolute text-center`} data-sprite={card.right}>{renderCardValue(card.right)}</span>
                    <span className={`${styles.bottomValue} bottomValue absolute text-center`} data-sprite={card.bottom}>{renderCardValue(card.bottom)}</span>
                    <span className={`${styles.leftValue} leftValue absolute text-center`} data-sprite={card.left}>{renderCardValue(card.left)}</span>
                </div>
                {card.element && <div className={`${styles.element} relative`} data-sprite={card.element}>{card.element}</div>}
            </div>
        </div>
    );
};

export default Card;