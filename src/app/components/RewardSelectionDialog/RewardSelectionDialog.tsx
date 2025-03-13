import { useState } from "react";
import styles from './RewardSelectionDialog.module.scss';
import { useGameContext } from "../../context/GameContext";
import Card from '../Card/Card';
import cards from '../../../data/cards.json';

const RewardSelectionDialog = () => {
    const { isRewardSelectionOpen, playerCards, playerHand, enemyHand, selectedReward, winState, dispatch } = useGameContext();
    console.log("rewardSelection", isRewardSelectionOpen);

    const winAmount = 1;
    const selectedRewardName = cards.find(card => card.id === selectedReward)?.name;

    const [rewardCards, setRewardCards] = useState<{ id: number; player: "red" | "blue" }[]>(enemyHand.map((card) => ({ id: card, player: "red" })));

    const handleSelectReward = (id: number) => {
        if (winAmount > 0 && winState == "blue" && selectedReward === null) {
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
        localStorage.setItem("playerCards", JSON.stringify(updatedPlayerCards));
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
                {playerHand.map((card, index) => (
                    <Card key={index} id={card} player="blue" />
                ))}
            </div>

            <div className={styles.rewardSelectionDialog} data-dialog="rewardCardNameInfo">
                <h4>Info.</h4>
                <h3>{selectedRewardName}</h3>
            </div>

            {selectedReward && <ConfirmationDialog handleConfirmation={handleConfirmation} handleDenial={handleDenial} />}
        </div>
    );
};

export default RewardSelectionDialog;