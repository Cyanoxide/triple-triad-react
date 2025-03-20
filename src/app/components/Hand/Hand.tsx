import React from 'react';
import styles from './Hand.module.scss';
import Card from '../Card/Card';
import Indicator from '../Indicator/Indicator';
import { useGameContext } from "../../context/GameContext";
import playSound from "../../utils/sounds";

interface HandProps {
    className?: string;
    player: "red" | "blue";
}

const Hand: React.FC<HandProps> = ({ className, player }) => {
    const { currentPlayerHand, currentEnemyHand, selectedCard, turn, turnNumber, score, isMenuOpen, isSoundEnabled, dispatch } = useGameContext();
    const cards = (player === "red") ? currentEnemyHand : currentPlayerHand;

    const handleSelectCard = (cardId: number, player: "red" | "blue", position: number) => {
        playSound("select", isSoundEnabled);
        if (player === "red") return;

        const activeSelection: [number, "red" | "blue", number] | null = (selectedCard && cardId === selectedCard[0]) ? null : [cardId, player, position];

        dispatch({
            type: "SET_SELECTED_CARD",
            payload: activeSelection,
        });
    };

    const handleMouseEnter = () => {
        if (player === "blue" && turn === "blue") {
            playSound("select", isSoundEnabled);
        }
    }

    return (

        <div className={`${className?.trim() || ''} ${(isMenuOpen) ? "hidden" : ""} relative`}>
            {turnNumber < 10 && <Indicator className={(player === turn && turn === player) ? "" : "hidden"} type="TURN_INDICATOR" />}
            <div className={styles.hand} data-player={player} data-selectable={player === turn && turn === "blue"}>
                {cards.map((card, index) => (
                    <div key={index} className="cell" onClick={() => handleSelectCard(card, player, index)} onMouseEnter={handleMouseEnter} data-selected={(selectedCard && selectedCard[0] === card && selectedCard[1] === player && index === selectedCard[2])}>
                        <Card id={card} player={player} />
                    </div>
                ))}
            </div>

            <div className={styles.score}>
                <svg width="128" height="80">
                    <defs>
                        <linearGradient id="textGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#a0a3ae" />
                            <stop offset="50%" stopColor="#ffffff" />
                            <stop offset="100%" stopColor="#6b6e7e" />
                        </linearGradient>
                    </defs>
                    <text x="39" y="70" fontSize="80" fontWeight="bold" fill="url(#textGradient)" stroke="black" filter="url(#shadow)">
                        {(player === "red") ? score[0] : score[1]}
                    </text>
                    <filter id="shadow">
                        <feDropShadow dx="3" dy="3" stdDeviation="2" floodColor="black" />
                    </filter>
                </svg>
            </div>
        </div>
    );
};

export default Hand;