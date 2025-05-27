import React from 'react';
import styles from './Card.module.scss';
import cards from '../../../data/cards.json';
import { useGameContext } from "../../context/GameContext";
import { PlayerType } from "../../context/GameTypes";
import CardValues from "../../components/CardValues/CardValues";

interface CardProps {
    id: number;
    player: PlayerType;
    onBoard?: boolean;
    displayValues?: boolean;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

const Card: React.FC<CardProps> = ({ id, player, onBoard, displayValues = true, ...props }) => {
    const { isGameActive, rules, winState, isCardGalleryOpen } = useGameContext();
    const card = cards.find(card => card.id === id);

    if (!card) return;

    return (
        <div className={`${styles.card} ${(player === "red" && !winState && !onBoard && (!isGameActive || !rules?.includes("open"))) ? styles["card--hidden"] : ""} card relative`} data-player={player} {...props} >
            <div className={styles.card__front} data-card-id={card.id} data-level={card.level} data-gallery={(isCardGalleryOpen) ? true : false}>
                {displayValues && <CardValues cardId={id} />}
                {displayValues && card.element && <div className={`${styles.element} relative`} data-sprite={card.element}>{card.element}</div>}
            </div>
        </div>
    );
};

export default Card;