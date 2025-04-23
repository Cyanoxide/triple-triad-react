import React from 'react';
import styles from './Hand.module.scss';
import Card from '../Card/Card';
import Indicator from '../Indicator/Indicator';
import { useGameContext } from "../../context/GameContext";
import { CardType, PlayerType } from "../../context/GameTypes";
import playSound from "../../utils/sounds";

interface HandProps {
    className?: string;
    player: PlayerType;
}

const Hand: React.FC<HandProps> = ({ className, player }) => {
    const { currentPlayerHand, currentEnemyHand, selectedCard, turn, turnNumber, score, isMenuOpen, isGameActive, isSoundEnabled, dispatch } = useGameContext();
    const cards = (player === "red") ? currentEnemyHand : currentPlayerHand;

    const handleSelectCard = (card: CardType, player: PlayerType, position: number) => {
        playSound("select", isSoundEnabled);
        if (player === "red") return;

        const activeSelection: CardType | null = (selectedCard && card[0] === selectedCard[0]) ? null : [card[0], player, position, ""];

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
        <div className={`${styles.handContainer} ${className?.trim() || ''} ${(isMenuOpen) ? "hidden" : ""} relative`}>
            <div className="flex flex-end items-center flex-col relative">
                {turnNumber < 10 && <Indicator className={(player === turn && turn === player) ? "flex" : "hidden"} type="TURN_INDICATOR" />}
                <div className={`${styles.hand} flex flex-col ${(isGameActive) ? "justify-end" : "justify-start"}`} data-player={player} data-selectable={player === turn && turn === "blue"}>
                    {cards.map((card, index) => (
                        <div key={index} className="cell" onClick={() => handleSelectCard(card, player, index)} onMouseEnter={handleMouseEnter} data-selected={(selectedCard && selectedCard[0] === card[0] && selectedCard[1] === player && index === selectedCard[2])}>
                            <Card id={card[0]} player={card[1]} />
                        </div>
                    ))}
                </div>
                <div className={`${styles.score} ${(!isGameActive) ? "invisible" : ""}`} data-sprite={(player === "red") ? score[0] : score[1]}></div>
            </div>
        </div >
    );
};

export default Hand;