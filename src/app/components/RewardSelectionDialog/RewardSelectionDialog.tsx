import { useState, useEffect } from "react";
import styles from './RewardSelectionDialog.module.scss';
import { useGameContext } from "../../context/GameContext";
import Card from '../Card/Card';
import cards from '../../../data/cards.json';
import ConfirmationDialog from "../ConfirmationDialog/ConfirmationDialog";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import playSound, { stopLoadedSound } from "../../utils/sounds";

interface RewardSelectionDialogProps {
    victorySound: HTMLAudioElement;
    bgm: HTMLAudioElement | undefined;
}

const RewardSelectionDialog: React.FC<RewardSelectionDialogProps> = ({ victorySound, bgm }) => {
    const { playerCards, playerHand, enemyId, enemyHand, lostCards, selectedReward, winState, isSoundEnabled, dispatch } = useGameContext();

    const winAmount = 1;

    const [rewardCards, setRewardCards] = useState<{ id: number; level: number, player: "red" | "blue" }[]>(enemyHand.map((card) => ({ id: card, level: cards.find(currentCard => currentCard.id === card)?.level ?? 0, player: "red" })));
    const [enemyRewardCards, setEnemyRewardCards] = useState<{ id: number; level: number, player: "red" | "blue" }[]>(playerHand.map((card) => ({ id: card, level: cards.find(currentCard => currentCard.id === card)?.level ?? 0, player: "blue" })));

    const updatedPlayerCards = { ...playerCards };
    const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

    useEffect(() => {
        if (winAmount > 0 && winState === "red" && selectedReward === null) {
            const updatedPlayerCardsCopy = { ...updatedPlayerCards };

            setEnemyRewardCards((prevCards) => {
                if (prevCards.length === 0 || Object.keys(playerCards).length <= 5) return prevCards;

                const maxLevel = Math.max(...prevCards.map((card) => card.level));
                const highestLevelCards = prevCards.filter((card) => card.level === maxLevel);
                const selectedCard = highestLevelCards[Math.floor(Math.random() * highestLevelCards.length)];

                if (updatedPlayerCardsCopy[selectedCard.id] > 1) {
                    updatedPlayerCardsCopy[selectedCard.id]--;
                } else {
                    delete updatedPlayerCardsCopy[selectedCard.id];
                }

                setSelectedCardId(selectedCard.id);

                playSound("flip", isSoundEnabled);
                setTimeout(() => {
                    playSound("place", isSoundEnabled);
                }, 5000);

                const cardIndex = prevCards.findIndex((card) => card.id === selectedCard.id);
                return prevCards.map((card, index) => ({
                    ...card,
                    player: (card.id === selectedCard.id && index === cardIndex) ? "red" : "blue",
                }));
            });

            setTimeout(() => {
                stopLoadedSound(bgm, isSoundEnabled);
                dispatch({ type: "RESET_GAME" });
                dispatch({ type: "SET_PLAYER_CARDS", payload: updatedPlayerCardsCopy });

                if (typeof window !== "undefined") {
                    localStorage.setItem("playerCards", JSON.stringify(updatedPlayerCardsCopy));
                }
            }, 7000);
        }
    }, []);

    useEffect(() => {
        if (selectedCardId !== null) {
            dispatch({ type: "SET_SELECTED_REWARD", payload: selectedCardId });
        }

        if (winState === "red") {
            const currentLostCards = { ...lostCards };
            if (selectedCardId) currentLostCards[enemyId] = selectedCardId;

            dispatch({ type: "SET_LOST_CARDS", payload: currentLostCards });
            localStorage.setItem("lostCards", JSON.stringify(currentLostCards));
        }
    }, [selectedCardId]);


    const handleSelectReward = (id: number) => {
        playSound("flip", isSoundEnabled);
        if (winAmount > 0 && winState === "blue" && selectedReward === null) {
            setRewardCards((prevCards) =>
                prevCards.map((card) =>
                    (card.id === Number(id)) ? { ...card, player: "blue" } : { ...card, player: "red" }
                )
            );

            dispatch({ type: "SET_SELECTED_REWARD", payload: id })
        }
    };

    const [isRewardConfirmed, setIsRewardConfirmed] = useState(false);

    const handleConfirmation = () => {
        if (!selectedReward) return;
        playSound("select", isSoundEnabled);

        setTimeout(() => {
            playSound("success", isSoundEnabled);
        }, 2500);

        const updatedPlayerCards = { ...playerCards };

        if (selectedReward in updatedPlayerCards) updatedPlayerCards[selectedReward]++
        else updatedPlayerCards[selectedReward] = 1;

        setIsRewardConfirmed(true);

        const currentLostCards = { ...lostCards };
        if (currentLostCards[enemyId] === selectedReward) {
            delete currentLostCards[enemyId]
        }

        dispatch({ type: "SET_LOST_CARDS", payload: currentLostCards });
        localStorage.setItem("lostCards", JSON.stringify(currentLostCards));

        setTimeout(() => {
            stopLoadedSound(victorySound, isSoundEnabled);


            dispatch({ type: "RESET_GAME" });
            dispatch({ type: "SET_PLAYER_CARDS", payload: updatedPlayerCards });
            if (typeof window !== 'undefined') {
                localStorage.setItem("playerCards", JSON.stringify(updatedPlayerCards));
            }
        }, 5000);
    }

    const handleDenial = () => {
        playSound("back", isSoundEnabled);
        setRewardCards((prevCards) =>
            prevCards.map((card) => ({
                ...card,
                player: "red"
            }))
        );

        dispatch({ type: "SET_SELECTED_REWARD", payload: null })
    }

    const [hoveredReward, setHoveredReward] = useState<number | undefined>(undefined);

    const handleMouseEnter = (cardId: number) => {
        if (winState === "blue" && !isRewardConfirmed) playSound("select", isSoundEnabled);
        setHoveredReward(cardId);
    }

    const handleMouseLeave = () => {
        setHoveredReward(undefined);
    }

    const recentCard = selectedReward || hoveredReward;
    const recentCardName = cards.find(card => card.id === recentCard)?.name;
    const selectedRewardName = cards.find(card => card.id === selectedReward)?.name;

    const infoMessage = (winState === "red") ? "lost" : "acquired";

    return (
        <div className={`${styles.rewardSelectionContainer} flex flex-col items-center justify-center top-0 z-10 w-screen h-screen`}>
            <div className={styles.rewardSelectionDialog} data-dialog="rewardSelectionInfo">
                <h4 className={styles.meta} data-sprite="info.">Info.</h4>
                <h3>{(isRewardConfirmed || (winState === "red" && selectedReward)) ? `${selectedRewardName} card ${infoMessage}` : `Select ${winAmount} card(s) you want`}</h3>
            </div>

            <div className="flex justify-center mb-7">
                {rewardCards.map((card, index) => (
                    <div key={index} onClick={() => handleSelectReward(card.id)}>
                        <Card id={card.id} player={card.player} onMouseEnter={() => handleMouseEnter(card.id)} onMouseLeave={handleMouseLeave} data-selected={card.id === selectedReward} data-confirmed={isRewardConfirmed} data-index={index} />
                    </div>
                ))}
            </div>

            <div className="flex justify-center">
                {enemyRewardCards.map((card, index) => (
                    <Card key={index} id={card.id} player={card.player} data-enemy-selected={card.id === selectedReward} data-index={index} />
                ))}
            </div>

            <div className={`${styles.dialogContainer} ${recentCardName ? "" : "invisible"}`}>
                {!isRewardConfirmed && winState === "blue" && <div className={styles.rewardSelectionDialog} data-dialog="rewardCardNameInfo">
                    <h4 className={styles.meta} data-sprite="info.">Info.</h4>
                    <h3 className={recentCard && !(recentCard in playerCards) ? "blue-text" : ""}>{recentCardName}</h3>
                </div>}
            </div>

            {selectedReward && !isRewardConfirmed && winState === "blue" && <ConfirmationDialog handleConfirmation={handleConfirmation} handleDenial={handleDenial} />}
            {winState === "red" && Object.keys(playerCards).length <= 5 && <SimpleDialog>Your opponent took pity on you and decided not to take any of your remaining cards.</SimpleDialog>}
        </div>
    );
};

export default RewardSelectionDialog;