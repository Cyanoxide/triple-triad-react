import React, { useSyncExternalStore } from 'react';
import styles from './Hand.module.scss';
import Card from '../Card/Card';
import Indicator from '../Indicator/Indicator';
import { useGameContext } from "../../context/GameContext";
import { CardType, PlayerType } from "../../context/GameTypes";
import playSound from "../../utils/sounds";
import { gameNav } from "../../hooks/gameNav";

interface HandProps {
    className?: string;
    player: PlayerType;
}

const Hand: React.FC<HandProps> = ({ className, player }) => {
    const { currentPlayerHand, currentEnemyHand, currentPlayerCards, turn, turnNumber, selectedCardId, score, isMenuOpen, isCardSelectionOpen, isGameActive, isSoundEnabled, dispatch } = useGameContext();
    const cards = (player === "red") ? currentEnemyHand : currentPlayerHand;
    const handFocus = useSyncExternalStore(gameNav.subscribe, gameNav.getFocus, () => null);

    const handleSelectCard = (card: CardType, player: PlayerType) => {
        if (player === "red") return;

        /**
         * While the hand is being chosen, a card in it is one you have already
         * picked, and tapping it puts it back. Cancel does the same thing, but
         * only from a keyboard — there is no way to reach it on a phone, and no
         * other way to change your mind.
         */
        if (isCardSelectionOpen) {
            const index = currentPlayerHand.findIndex((held) =>
                held.uniqueId ? held.uniqueId === card.uniqueId : held.cardId === card.cardId);
            if (index === -1) return;

            const remaining = currentPlayerHand.filter((_, at) => at !== index);
            const returned = { ...currentPlayerCards };
            returned[card.cardId] = (returned[card.cardId] ?? 0) + 1;

            playSound("back", isSoundEnabled);
            dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: remaining });
            dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: returned });
            return;
        }

        /**
         * Only on your own turn. A card picked up out of turn could not be
         * played, but it still lit up and made the select sound, which read as
         * the game having accepted something it had not.
         */
        if (turn !== "blue" || !isGameActive) return;

        playSound("select", isSoundEnabled);

        dispatch({
            type: "SET_SELECTED_CARD_ID",
            payload: card.uniqueId,
        });
    };

    const handleMouseEnter = (index: number) => {
        if (player === "blue" && turn === "blue" && isGameActive) {
            gameNav.actions.focusHand?.(index);
        }
    }

    return (
        <div className={`${styles.handContainer} ${className?.trim() || ''} ${(isMenuOpen) ? "hidden" : ""} relative`}>
            <div className="flex flex-end items-center flex-col relative">
                {turnNumber < 10 && <Indicator className={(player === turn && turn === player) ? "flex" : "hidden"} type="TURN_INDICATOR" />}
                <div className={`${styles.hand} flex flex-col ${(isGameActive) ? "justify-end" : "justify-start"}`} data-player={player} data-selectable={player === turn && turn === "blue"}>
                    {cards.map((card, index) => (
                        <div key={index} className="cell" onClick={() => handleSelectCard(card, player)} onMouseEnter={() => handleMouseEnter(index)} data-selected={(card.uniqueId && selectedCardId === card.uniqueId)} data-focused={handFocus?.player === player && handFocus.index === index}>
                            <Card id={card.cardId} player={card.currentOwner as PlayerType} />
                        </div>
                    ))}
                </div>
                <div className={`${styles.score} ${(!isGameActive) ? "invisible" : ""}`} data-sprite={(player === "red") ? score[0] : score[1]}></div>
            </div>
        </div >
    );
};

export default Hand;
