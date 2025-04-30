import { useState, useEffect, useRef } from "react";
import styles from './RewardSelectionDialog.module.scss';
import { useGameContext } from "../../context/GameContext";
import { PlayerType, CardType } from "../../context/GameTypes";
import Card from '../Card/Card';
import cards from '../../../data/cards.json';
import ConfirmationDialog from "../ConfirmationDialog/ConfirmationDialog";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import playSound, { stopLoadedSound } from "../../utils/sounds";
import textToSprite from "../../utils/textToSprite";

interface RewardSelectionDialogProps {
    victorySound: HTMLAudioElement;
    bgm: HTMLAudioElement | undefined;
}

const RewardSelectionDialog: React.FC<RewardSelectionDialogProps> = ({ victorySound, bgm }) => {
    const { playerCards, playerHand, enemyId, enemyHand, lostCards, winState, score, tradeRule, isSoundEnabled, board, dispatch } = useGameContext();

    type RewardType = { id: number; level: number, player: PlayerType, position: number }

    const isManualSelect = (winState === "blue" && ["one", "diff"].includes(tradeRule as string));

    const [playerRewardSelection, setPlayerRewardSelection] = useState<RewardType[]>(enemyHand.map((card, index) => ({ id: +card[0], level: cards.find(currentCard => card && currentCard.id === card[0])?.level ?? 0, player: "red", position: index })));
    const [enemyRewardSelection, setEnemyRewardSelection] = useState<RewardType[]>(playerHand.map((card, index) => ({ id: +card[0], level: cards.find(currentCard => card && currentCard.id === card[0])?.level ?? 0, player: "blue", position: index })));

    const [isSelectionConfirmed, setIsSelectionConfirmed] = useState(false);
    const [selectedRewards, setSelectedRewards] = useState<RewardType[]>([]);
    const [selectedReward, setSelectedReward] = useState<RewardType>();
    const [confirmedCards, setConfirmedCards] = useState<RewardType[]>([]);

    const scoreSorted = score.sort((a, b) => b - a);
    const [winningScore] = scoreSorted;
    const scoreDifference = winningScore - 5;

    let winAmount = 0;
    switch (tradeRule) {
        case "one":
            winAmount = 1;
            break;

        case "all":
            winAmount = 5;
            break;

        case "diff":
        case "direct":
            winAmount = scoreDifference;
            break;
    }


    const handleSelectReward = (id: number, player: PlayerType, position: number) => {
        if (player === winState || !isManualSelect) return;
        playSound("flip", isSoundEnabled);
        if (winAmount > 0 && winState === "blue" && selectedRewards.length < winAmount) {
            const currentSelectedRewards = [...selectedRewards];
            const cardData = cards.find(card => card.id === id);
            if (!cardData) return;

            currentSelectedRewards.push({ id, level: cardData.level, player: winState, position });

            setPlayerRewardSelection((prevCards) =>
                prevCards.map((card) =>
                    (card.id === Number(id)) ? { ...card, player: "blue" } : { ...card }
                )
            );

            setSelectedRewards(currentSelectedRewards);
        }
    };
    const handleConfirmation = () => {
        if (selectedRewards.length < winAmount) return;
        playSound("select", isSoundEnabled);


        setIsSelectionConfirmed(true);
    }

    const handleDenial = () => {
        playSound("back", isSoundEnabled);
        setPlayerRewardSelection((prevCards) =>
            prevCards.map((card) => ({
                ...card,
                player: "red"
            }))
        );

        setSelectedRewards([]);
    }

    const [hoveredReward, setHoveredReward] = useState<RewardType | undefined>(undefined);

    const handleMouseEnter = (id: number, position: number) => {
        if (winState === "blue" && !isSelectionConfirmed) playSound("select", isSoundEnabled);
        const cardData = cards.find(card => card.id === id);
        if (!cardData) return;

        setHoveredReward({ id, level: cardData.level, player: (winState === "red") ? "blue" : "red", position });
    }

    const handleMouseLeave = () => {
        setHoveredReward(undefined);
    }


    const autoSelectRewards = (method: "best" | "sequential") => {
        const selectedRewards: RewardType[] = [];
        let selectedReward: RewardType | undefined;
        let availableCards: RewardType[] = ((winState === "red") ? [...enemyRewardSelection] : [...playerRewardSelection]);

        if (tradeRule === "direct") {
            const boardCards: CardType[] = board.flat().filter((cell): cell is CardType => cell !== null);
            const flippedCards = boardCards.filter(card =>
                card[1] === winState && card[4] !== winState
            );

            const mappedFlippedCards = flippedCards.map(([id, player, position]) => ({ id, player, position }));
            availableCards = availableCards.filter(availableCard =>
                mappedFlippedCards.some(flippedCard => flippedCard.id === +availableCard.id)
            );
        }

        while (winAmount) {
            if (method === "best") {
                const maxLevel = Math.max(...availableCards.map((card) => card.level));
                const highestLevelCards = availableCards.filter((card) => card.level === maxLevel);
                selectedReward = highestLevelCards[Math.floor(Math.random() * highestLevelCards.length)];

                selectedRewards.push(selectedReward);
            } else if (method === "sequential") {
                selectedReward = availableCards.shift();
                if (!selectedReward) continue;

                selectedRewards.push(selectedReward);
            }

            winAmount--;
        }

        const setRewardSelection = (winState === "red") ? setEnemyRewardSelection : setPlayerRewardSelection;

        setRewardSelection((prevCards) =>
            prevCards.map((card) =>
                selectedRewards.some((reward) => reward.id === card.id && reward.position === card.position)
                    ? { ...card, player: winState as PlayerType }
                    : { ...card }
            )
        );

        return selectedRewards;
    }

    const areRewardsConfirmed = useRef(false);
    useEffect(() => {
        if (areRewardsConfirmed.current || isManualSelect) return;

        const selectionMethod = (["all", "direct"].includes(tradeRule as string) || winState === "blue") ? "sequential" : "best";
        const autoRewards = autoSelectRewards(selectionMethod);
        setSelectedRewards(autoRewards);
        setIsSelectionConfirmed(true);

        playSound("flip", isSoundEnabled);

        areRewardsConfirmed.current = true;
    }, [winState]);

    const processRewards = () => {
        const rewardsList = [...selectedRewards];
        const confirmedList = [...confirmedCards];

        const reward = rewardsList.shift();
        if (!reward) return;

        const updatedPlayerCards = { ...playerCards };
        const currentLostCards = { ...lostCards };

        if (winState === "blue") {
            if (reward.id in updatedPlayerCards) {
                updatedPlayerCards[reward.id]++
            } else {
                updatedPlayerCards[reward.id] = 1;
            }

            if (currentLostCards[enemyId] === reward.id) {
                delete currentLostCards[enemyId];
            }
        }

        if (winState === "red") {
            if (reward.id in updatedPlayerCards && updatedPlayerCards[reward.id] > 1) {
                updatedPlayerCards[reward.id]--;
            } else {
                delete updatedPlayerCards[reward.id];
            }

            currentLostCards[enemyId] = reward.id;
        }

        dispatch({ type: "SET_PLAYER_CARDS", payload: updatedPlayerCards });
        dispatch({ type: "SET_LOST_CARDS", payload: currentLostCards });

        if (typeof window !== 'undefined') {
            localStorage.setItem("playerCards", JSON.stringify(updatedPlayerCards));
            localStorage.setItem("lostCards", JSON.stringify(currentLostCards));
        }

        setSelectedReward(reward);
        setSelectedRewards(rewardsList);

        setTimeout(() => {
            playSound((winState === "blue") ? "success" : "place", isSoundEnabled);
        }, (winState === "blue") ? 2500 : 5000);

        confirmedList.push(reward);
        setConfirmedCards(confirmedList);

        if (rewardsList.length === 0) {
            setTimeout(() => {
                stopLoadedSound(victorySound, isSoundEnabled);
                stopLoadedSound(bgm, isSoundEnabled);

                dispatch({ type: "RESET_GAME" });

                dispatch({ type: "SET_PLAYER_CARDS", payload: updatedPlayerCards });
                if (typeof window !== 'undefined') {
                    localStorage.setItem("playerCards", JSON.stringify(updatedPlayerCards));
                }
            }, 6000);
        }
    }


    useEffect(() => {
        if (!isSelectionConfirmed) return;
        setTimeout(processRewards, (confirmedCards.length) ? 5000 : 1500);
    }, [isSelectionConfirmed, confirmedCards]);


    const recentCard = selectedReward || hoveredReward;
    const recentCardName = recentCard && cards.find(card => card.id === recentCard.id)?.name;
    const selectedRewardName = selectedReward && cards.find(card => card.id === selectedReward.id)?.name;

    const infoMessage = (winState === "red") ? "lost" : "acquired";

    return (
        <div className={`${styles.rewardSelectionContainer} flex flex-col items-center justify-center top-0 z-10 w-screen h-screen`}>{isSelectionConfirmed}
            <div className={`${styles.rewardSelectionDialog} ${(isSelectionConfirmed && !selectedRewardName) ? "invisible" : ""}`} data-dialog="rewardSelectionInfo" data-animation={selectedRewardName} data-player={winState}>
                <h4 className={styles.meta} data-sprite="info.">Info.</h4>
                <h3>{textToSprite((isSelectionConfirmed || (winState === "red")) ? `${selectedRewardName} card ${infoMessage}` : `Select ${winAmount} card(s) you want`)}</h3>
            </div>

            <div className="flex justify-center mb-7">
                {playerRewardSelection.map((card, index) => (
                    <div className={styles.cell} key={index} onClick={() => handleSelectReward(card.id, card.player, card.position)}>
                        <Card id={card.id} player={card.player} onMouseEnter={() => handleMouseEnter(card.id, index)} onMouseLeave={handleMouseLeave} data-selected={selectedRewards.some((reward) => reward.id === card.id && reward.position === card.position)} data-confirmed={isSelectionConfirmed && confirmedCards.some((reward) => reward.id === card.id && reward.position === card.position)} data-index={index} />
                    </div>
                ))}
            </div>

            <div className="flex justify-center">
                {enemyRewardSelection.map((card, index) => (
                    <div className={styles.cell} key={index}>
                        <Card id={card.id} player={card.player} data-enemy-selected={selectedRewards.some((reward) => reward.id === card.id && reward.position === card.position)} data-confirmed={isSelectionConfirmed && confirmedCards.some((reward) => reward.id === card.id && reward.position === card.position)} data-index={index} />
                    </div>
                ))}
            </div>

            <div className={`${styles.dialogContainer} ${recentCardName ? "" : "invisible"}`}>
                <div className={`${styles.rewardSelectionDialog} ${(isSelectionConfirmed || winState !== "blue") ? "invisible" : ""}`} data-dialog="rewardCardNameInfo">
                    <h4 className={styles.meta} data-sprite="info.">Info.</h4>
                    <h3>{textToSprite(recentCardName || "", (recentCard && recentCard.id == lostCards[enemyId]) ? "yellow" : (recentCard && !(recentCard.id in playerCards)) ? "blue" : "")}</h3>
                </div>
            </div>

            {selectedRewards.length === winAmount && !isSelectionConfirmed && winState === "blue" && <ConfirmationDialog handleConfirmation={handleConfirmation} handleDenial={handleDenial} />}
            {winState === "red" && Object.keys(playerCards).length <= 5 &&
                <SimpleDialog>
                    <div className="mb-2">{textToSprite("Your opponent took pity on you and decided not")}</div>
                    <div className="mb-2">{textToSprite("to take any of your remaining cards.")}</div>
                </SimpleDialog>
            }
        </div>
    );
};

export default RewardSelectionDialog;