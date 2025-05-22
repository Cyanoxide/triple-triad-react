import { useState, useEffect, useRef } from "react";
import styles from './RewardSelectionDialog.module.scss';
import { useGameContext } from "../../context/GameContext";
import { PlayerType, CardType } from "../../context/GameTypes";
import Card from '../Card/Card';
import cards from '../../../data/cards.json';
import ConfirmationDialog from "../ConfirmationDialog/ConfirmationDialog";
import playSound, { stopLoadedSound } from "../../utils/sounds";
import textToSprite from "../../utils/textToSprite";

interface RewardSelectionDialogProps {
    victorySound: HTMLAudioElement;
    bgm: HTMLAudioElement | undefined;
}

const RewardSelectionDialog: React.FC<RewardSelectionDialogProps> = ({ victorySound, bgm }) => {
    const { playerCards, playerHand, enemyId, enemyHand, lostCards, winState, score, tradeRule, isSoundEnabled, board, dispatch } = useGameContext();

    type RewardType = { id: number; uniqueId: string | null | undefined, level: number, player: PlayerType, position: number }

    const isManualSelect = (winState === "blue" && ["one", "diff"].includes(tradeRule as string));

    const [playerRewardSelection, setPlayerRewardSelection] = useState<RewardType[]>(enemyHand.map((card, index) => ({ id: card.cardId, uniqueId: card.uniqueId, level: cards.find(currentCard => card && currentCard.id === card.cardId)?.level ?? 0, player: "red", position: index })));
    const [enemyRewardSelection, setEnemyRewardSelection] = useState<RewardType[]>(playerHand.map((card, index) => ({ id: card.cardId, uniqueId: card.uniqueId, level: cards.find(currentCard => card && currentCard.id === card.cardId)?.level ?? 0, player: "blue", position: index })));

    const [isSelectionConfirmed, setIsSelectionConfirmed] = useState(false);
    const [selectedRewards, setSelectedRewards] = useState<Record<'won' | 'lost', RewardType[]>>({ "won": [], "lost": [] });
    const [selectedReward, setSelectedReward] = useState<RewardType>();
    const [confirmedCards, setConfirmedCards] = useState<RewardType[]>([]);
    const [rewardType, setRewardType] = useState<"won" | "lost" | null>(null);

    const scoreSorted = score.sort((a, b) => b - a);
    const [winningScore] = scoreSorted;
    const scoreDifference = winningScore - 5;

    const determineFlippedCards = () => {
        const boardCards: CardType[] = board.flat().filter((cell): cell is CardType => cell !== null);
        const flippedCards = boardCards.filter(card => card.initialOwner !== card.currentOwner);

        return flippedCards;
    }
    const flippedCards = determineFlippedCards();

    let winAmount = 0;
    switch (tradeRule) {
        case "one":
            winAmount = 1;
            break;

        case "all":
            winAmount = 5;
            break;

        case "diff":
            winAmount = scoreDifference;
            break;
    }

    const resetGame = (updatedPlayerCards: Record<number, number>) => {
        stopLoadedSound(victorySound, isSoundEnabled);
        stopLoadedSound(bgm, isSoundEnabled);

        dispatch({ type: "RESET_GAME" });

        dispatch({ type: "SET_PLAYER_CARDS", payload: updatedPlayerCards });
        if (typeof window !== "undefined") {
            localStorage.setItem("playerCards", JSON.stringify(updatedPlayerCards));
        }
    }


    const handleSelectReward = (card: RewardType, position: number) => {
        if (!card || card.player === winState || !isManualSelect) return;
        playSound("flip", isSoundEnabled);
        if (winAmount > 0 && winState === "blue" && selectedRewards.won.length < winAmount) {
            const currentSelectedRewards = { ...selectedRewards };

            currentSelectedRewards.won.push({
                id: card.id,
                uniqueId: card.uniqueId,
                level: cards.find(currentCard => card && currentCard.id === card.id)?.level ?? 0,
                player: "blue",
                position,
            });

            setPlayerRewardSelection((prevCards) =>
                prevCards.map((reward) =>
                    (reward.id === card.id) ? { ...reward, player: "blue" } : { ...reward }
                )
            );

            setSelectedRewards(currentSelectedRewards);
        }
    };
    const handleConfirmation = () => {
        if (selectedRewards.won.length < winAmount) return;

        if (selectedRewards.won.length === 0) resetGame(playerCards);
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

        const currentSelectedRewards = { ...selectedRewards };
        currentSelectedRewards.won = [];

        setSelectedRewards(currentSelectedRewards);
    }

    const [hoveredReward, setHoveredReward] = useState<RewardType | undefined>(undefined);

    const handleMouseEnter = (id: number, position: number) => {
        if (winState === "blue" && !isSelectionConfirmed) playSound("select", isSoundEnabled);
        const cardData = cards.find(card => card.id === id);
        if (!cardData) return;

        setHoveredReward({ id, uniqueId: null, level: cardData.level, player: (winState === "red") ? "blue" : "red", position });
    }

    const handleMouseLeave = () => {
        setHoveredReward(undefined);
    }


    const autoSelectRewards = (method: "best" | "sequential") => {
        const selectedCards: Record<'won' | 'lost', RewardType[]> = {
            "won": [],
            "lost": [],
        };

        let selectedCard: RewardType | undefined;
        const selectedCardsKey = (winState === "red") ? "lost" : "won";

        if (tradeRule === "direct") {
            selectedCards.won = [...playerRewardSelection].filter(handCard =>
                flippedCards.some(flippedCard =>
                    handCard.player !== flippedCard.currentOwner && handCard.id === flippedCard.cardId
                )
            );

            selectedCards.lost = [...enemyRewardSelection].filter(handCard =>
                flippedCards.some(flippedCard =>
                    handCard.player !== flippedCard.currentOwner && handCard.id === flippedCard.cardId
                )
            );
        } else {
            const availableCards: RewardType[] = ((winState === "red") ? [...enemyRewardSelection] : [...playerRewardSelection]);

            while (winAmount) {
                if (method === "best") {
                    const maxLevel = Math.max(...availableCards.map((card) => card.level));
                    const highestLevelCards = availableCards.filter((card) => card.level === maxLevel);
                    selectedCard = highestLevelCards[Math.floor(Math.random() * highestLevelCards.length)];
                    selectedCards[selectedCardsKey].push(selectedCard);
                } else if (method === "sequential") {
                    selectedCard = availableCards.shift();
                    if (selectedCard) selectedCards[selectedCardsKey].push(selectedCard);
                }

                winAmount--;
            }
        }

        setPlayerRewardSelection((prevCards) =>
            prevCards.map((card) =>
                selectedCards.won.some((reward) => reward.id === card.id && reward.position === card.position)
                    ? { ...card, player: "blue" }
                    : { ...card }
            )
        );
        setEnemyRewardSelection((prevCards) =>
            prevCards.map((card) =>
                selectedCards.lost.some((reward) => reward.id === card.id && reward.position === card.position)
                    ? { ...card, player: "red" }
                    : { ...card }
            )
        );

        return selectedCards;
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
        const rewardsList = { ...selectedRewards };
        const confirmedList = [...confirmedCards];

        const updatedPlayerCards = { ...playerCards };
        const currentLostCards = { ...lostCards };
        let reward = null;
        let playerWinState: "won" | "lost" | null = null;

        if (rewardsList.won.length) {
            playerWinState = "won";

            reward = rewardsList.won.shift();
            if (!reward) return;

            if (reward.id in updatedPlayerCards) {
                updatedPlayerCards[reward.id]++
            } else {
                updatedPlayerCards[reward.id] = 1;
            }
            if (currentLostCards[enemyId]) {
                const lostCardIndex: number = currentLostCards[enemyId].indexOf(reward.id);
                if (lostCardIndex !== -1) {
                    currentLostCards[enemyId].splice(lostCardIndex, 1);
                }
            }
        } else if (rewardsList.lost.length) {
            playerWinState = "lost";
            reward = rewardsList.lost.shift();
            if (!reward) return;

            if (reward.id in updatedPlayerCards && updatedPlayerCards[reward.id] > 1) {
                updatedPlayerCards[reward.id]--;
            } else {
                delete updatedPlayerCards[reward.id];
            }

            if (!currentLostCards[enemyId]) currentLostCards[enemyId] = [];
            currentLostCards[enemyId].push(reward.id);
        }
        if (!reward) return;

        setRewardType(playerWinState);
        dispatch({ type: "SET_PLAYER_CARDS", payload: updatedPlayerCards });
        dispatch({ type: "SET_LOST_CARDS", payload: currentLostCards });

        if (typeof window !== "undefined") {
            localStorage.setItem("playerCards", JSON.stringify(updatedPlayerCards));
            localStorage.setItem("lostCards", JSON.stringify(currentLostCards));
        }

        setSelectedReward(reward);
        setSelectedRewards(rewardsList);

        setTimeout(() => {
            playSound("place", isSoundEnabled);
        }, (playerWinState === "lost") ? 500 : 0);

        setTimeout(() => {
            playSound((playerWinState === "won") ? "success" : "place", isSoundEnabled);
        }, (playerWinState === "lost") ? 3000 : 2500);

        confirmedList.push(reward);
        setConfirmedCards(confirmedList);

        setTimeout(() => {
            setSelectedReward(undefined);
        }, 2800);

        if (!rewardsList.won.length && !rewardsList.lost.length) {
            setTimeout(() => {
                resetGame(updatedPlayerCards);
            }, 6000);
        }
    }


    useEffect(() => {
        if (!isSelectionConfirmed) return;
        setTimeout(processRewards, (confirmedCards.length) ? 3000 : 1500);
    }, [isSelectionConfirmed, confirmedCards]);


    const recentCard = selectedReward || hoveredReward;
    const recentCardName = recentCard && cards.find(card => card.id === recentCard.id)?.name;
    const selectedRewardName = selectedReward && cards.find(card => card.id === selectedReward.id)?.name;

    const infoMessage = (rewardType === "lost") ? "lost" : "acquired";

    return (
        <div className={`${styles.rewardSelectionContainer} flex flex-col items-center justify-center top-0 z-10 w-screen h-screen`}>
            <div className={`${styles.rewardSelectionDialog} ${(isSelectionConfirmed && !selectedRewardName) ? "invisible" : ""}`} data-dialog="rewardSelectionInfo" data-animation={selectedRewardName} data-player={winState}>
                <h4 className={styles.meta} data-sprite="info.">Info.</h4>
                <h3>{textToSprite((isSelectionConfirmed || (winState === "red")) ? `${selectedRewardName} card ${infoMessage}` : `Select ${winAmount} card(s) you want`)}</h3>
            </div>

            <div className="flex justify-center mb-7">
                {playerRewardSelection.map((card, index) => (
                    <div className={styles.cell} key={index} onClick={() => handleSelectReward(card, card.position)}>
                        <Card id={card.id} player={card.player} onMouseEnter={() => handleMouseEnter(card.id, index)} onMouseLeave={handleMouseLeave} data-selected={selectedRewards.won.some((reward) => reward.id === card.id && reward.position === card.position)} data-confirmed={isSelectionConfirmed && confirmedCards.some((reward) => reward.id === card.id && reward.position === card.position)} data-index={index} />
                    </div>
                ))}
            </div>

            <div className="flex justify-center">
                {enemyRewardSelection.map((card, index) => (
                    <div className={styles.cell} key={index}>
                        <Card id={card.id} player={card.player} data-enemy-selected={selectedRewards.lost.some((reward) => reward.id === card.id && reward.position === card.position)} data-confirmed={isSelectionConfirmed && confirmedCards.some((reward) => reward.id === card.id && reward.position === card.position)} data-index={index} />
                    </div>
                ))}
            </div>

            <div className={`${styles.dialogContainer} ${recentCardName ? "" : "invisible"}`}>
                <div className={`${styles.rewardSelectionDialog} ${(isSelectionConfirmed || winState !== "blue") ? "invisible" : ""}`} data-dialog="rewardCardNameInfo">
                    <h4 className={styles.meta} data-sprite="info.">Info.</h4>
                    <h3>{textToSprite(recentCardName || "", (recentCard && lostCards[enemyId] && lostCards[enemyId].includes(recentCard.id)) ? "yellow" : (recentCard && !(recentCard.id in playerCards)) ? "blue" : "")}</h3>
                </div>
            </div>

            {selectedRewards.won.length === winAmount && !isSelectionConfirmed && winState === "blue" && <ConfirmationDialog handleConfirmation={handleConfirmation} handleDenial={handleDenial} />}
        </div>
    );
};

export default RewardSelectionDialog;