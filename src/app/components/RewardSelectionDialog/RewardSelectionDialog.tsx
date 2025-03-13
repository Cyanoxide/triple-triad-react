import { useState, useEffect } from "react";
import styles from './RewardSelectionDialog.module.scss';
import { useGameContext } from "../../context/GameContext";
import Card from '../Card/Card';
import cards from '../../../data/cards.json';
import ConfirmationDialog from "../ConfirmationDialog/ConfirmationDialog";

const RewardSelectionDialog = () => {
    const { playerCards, playerHand, enemyHand, selectedReward, winState, dispatch } = useGameContext();

    const winAmount = 1;
    const selectedRewardName = cards.find(card => card.id === selectedReward)?.name;

    const [rewardCards, setRewardCards] = useState<{ id: number; level: number, player: "red" | "blue" }[]>(enemyHand.map((card) => ({ id: card, level: cards.find(card => card.id === selectedReward)?.level ?? 0, player: "red" })));
    const [enemyRewardCards, setEnemyRewardCards] = useState<{ id: number; level: number, player: "red" | "blue" }[]>(playerHand.map((card) => ({ id: card, level: cards.find(card => card.id === selectedReward)?.level ?? 0, player: "blue" })));

    const updatedPlayerCards = { ...playerCards };
    const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

    useEffect(() => {
        if (winAmount > 0 && winState === "red" && selectedReward === null) {
            dispatch({ type: "SET_IS_GAME_ACTIVE", payload: false });

            const updatedPlayerCardsCopy = { ...updatedPlayerCards };

            setEnemyRewardCards((prevCards) => {
                if (prevCards.length === 0) return prevCards;

                const maxLevel = Math.max(...prevCards.map((card) => card.level));
                const highestLevelCards = prevCards.filter((card) => card.level === maxLevel);
                const selectedCard = highestLevelCards[Math.floor(Math.random() * highestLevelCards.length)];

                if (updatedPlayerCardsCopy[selectedCard.id] > 1) {
                    updatedPlayerCardsCopy[selectedCard.id]--;
                } else {
                    delete updatedPlayerCardsCopy[selectedCard.id];
                }

                setSelectedCardId(selectedCard.id);

                return prevCards.map((card) => ({
                    ...card,
                    player: card.id === selectedCard.id ? "red" : "blue",
                }));
            });

            setTimeout(() => {
                dispatch({ type: "RESET_GAME" });
                dispatch({ type: "SET_PLAYER_CARDS", payload: updatedPlayerCardsCopy });

                if (typeof window !== "undefined") {
                    localStorage.setItem("playerCards", JSON.stringify(updatedPlayerCardsCopy));
                }
            }, 3000);
        }
    }, []);

    useEffect(() => {
        if (selectedCardId !== null) {
            dispatch({ type: "SET_SELECTED_REWARD", payload: selectedCardId });
        }
    }, [selectedCardId]);


    const handleSelectReward = (id: number) => {
        if (winAmount > 0 && winState !== "blue" && selectedReward === null) {
            setRewardCards((prevCards) =>
                prevCards.map((card) =>
                    (card.id === Number(id)) ? { ...card, player: "blue" } : { ...card, player: "red" }
                )
            );

            dispatch({ type: "SET_SELECTED_REWARD", payload: id })
        }
    };

    const handleConfirmation = () => {
        if (!selectedReward) return;

        const updatedPlayerCards = { ...playerCards };

        if (selectedReward in updatedPlayerCards) updatedPlayerCards[selectedReward]++
        else updatedPlayerCards[selectedReward] = 1;

        dispatch({ type: "RESET_GAME" });
        dispatch({ type: "SET_PLAYER_CARDS", payload: updatedPlayerCards });
        if (typeof window !== 'undefined') {
            localStorage.setItem("playerCards", JSON.stringify(updatedPlayerCards));
        }
    }

    const handleDenial = () => {
        setRewardCards((prevCards) =>
            prevCards.map((card) => ({
                ...card,
                player: "red"
            }))
        );

        dispatch({ type: "SET_SELECTED_REWARD", payload: null })
    }

    return (
        <div className={`${styles.rewardSelectionContainer} flex flex-col items-center justify-center absolute top-0 z-10 w-screen h-screen`}>
            <div className={styles.rewardSelectionDialog} data-dialog="rewardSelectionInfo">
                <h4>Info.</h4>
                <h3>Select 1 card(s) you want</h3>
            </div>

            <div className="flex justify-center mb-7">
                {rewardCards.map((card, index) => (
                    <div key={index} onClick={() => handleSelectReward(card.id)}>
                        <Card id={card.id} player={card.player} />
                    </div>
                ))}
            </div>

            <div className="flex justify-center">
                {enemyRewardCards.map((card, index) => (
                    <Card key={index} id={card.id} player={card.player} />
                ))}
            </div>

            <div className={styles.rewardSelectionDialog} data-dialog="rewardCardNameInfo">
                <h4>Info.</h4>
                <h3>{selectedRewardName}</h3>
            </div>

            {selectedReward && winState === "blue" && <ConfirmationDialog handleConfirmation={handleConfirmation} handleDenial={handleDenial} />}
        </div>
    );
};

export default RewardSelectionDialog;