import React from 'react';
import styles from './Hand.module.scss';
import Card from '../Card/Card';
import { useGameContext } from "../../context/GameContext";

interface HandProps {
    className?: string;
    player: "red" | "blue";
}

const Hand: React.FC<HandProps> = ({ className, player }) => {
    const { playerCards, enemyCards, selectedCard, turn, dispatch } = useGameContext();
    const cards = (player === "red") ? enemyCards : playerCards;

    const handleSelectCard = (cardId: number, player: "red" | "blue", position: number) => {
        // if (player !== turn) return;

        dispatch({
            type: "SET_SELECTED_CARD",
            payload: [cardId, player, position],
        });
    };

    return (
        <div className={`${styles.hand} ${className || ''}`.trim()} data-player={player}>
            {cards.map((card, index) => (
                <div key={index} className="cell" onClick={() => handleSelectCard(card, player, index)} data-selected={(selectedCard && selectedCard[0] === card && selectedCard[1] === player)}>
                    <Card id={card} player={player} />
                </div>
            ))}
        </div>
    );
};

export default Hand;