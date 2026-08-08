import { useState, useEffect, useRef, useCallback } from "react";
import styles from './RewardSelectionDialog.module.scss';
import { useGameContext } from "../../context/GameContext";
import { PlayerType, CardType } from "../../context/GameTypes";
import Card from '../Card/Card';
import cards from '../../../data/cards.json';
import ConfirmationDialog from "../ConfirmationDialog/ConfirmationDialog";
import playSound, { stopLoadedSound } from "../../utils/sounds";
import { finishMultiplayer, multiplayer, useMultiplayer } from "../../hooks/multiplayerSession";
import { sendRewards } from "../../utils/rooms";
import textToSprite from "../../utils/textToSprite";
import Ellipsis from "../Ellipsis/Ellipsis";
import { useCursorNav, markKeyboardNavigation } from "../../hooks/useCursorNav";

interface RewardSelectionDialogProps {
    victorySound: HTMLAudioElement;
    bgm: HTMLAudioElement | undefined;
}

/**
 * Everything on this screen runs at this fraction of its written time.
 *
 * **`$speed` in `RewardSelectionDialog.module.scss` has to match.** The waits
 * below are counted against those animations — when a card is centred, when it
 * has gone — so if the two drift the sounds land on the wrong beat and the
 * screen closes over a card still moving.
 */
const REWARD_SPEED = 0.85;
const beat = (ms: number) => Math.round(ms * REWARD_SPEED);

/** Where in the card's travel it is centred and holding, as a fraction of the
 *  `card-preview-*` keyframes — the 40% mark. Tapping skips ahead to here. */
const CENTRED_AT = 0.4;

const RewardSelectionDialog: React.FC<RewardSelectionDialogProps> = ({ victorySound, bgm }) => {
    const { playerCards, playerHand, enemyId, enemyHand, lostCards, winState, score, tradeRule, isSoundEnabled, isCardGalleryOpen, board, dispatch } = useGameContext();

    type RewardType = { id: number; uniqueId: string | null | undefined, level: number, player: PlayerType, position: number }

    const { session, incomingRewards } = useMultiplayer();

    const isManualSelect = (winState === "blue" && ["one", "diff"].includes(tradeRule as string));

    /**
     * Only "one" and "diff" need anything sent. "all" and "direct" are decided
     * by the board, so both clients reach the same answer on their own and an
     * exchange would be pure ceremony.
     */
    const tradeNeedsExchange = !!session && ["one", "diff"].includes(tradeRule as string);

    /** Waiting to be told which cards were taken, rather than inventing them */
    const awaitingOpponentPicks = tradeNeedsExchange && winState === "red";

    const [playerRewardSelection, setPlayerRewardSelection] = useState<RewardType[]>(enemyHand.map((card, index) => ({ id: card.cardId, uniqueId: card.uniqueId, level: cards.find(currentCard => card && currentCard.id === card.cardId)?.level ?? 0, player: "red", position: index })));
    const [enemyRewardSelection, setEnemyRewardSelection] = useState<RewardType[]>(playerHand.map((card, index) => ({ id: card.cardId, uniqueId: card.uniqueId, level: cards.find(currentCard => card && currentCard.id === card.cardId)?.level ?? 0, player: "blue", position: index })));

    /**
     * Waits that can be brought forward.
     *
     * A tap skips the card to the middle of the screen, which means every
     * animation *and* every pending wait has to move by the same amount or the
     * sounds and the hand-over drift out of step with what is on screen. So the
     * waits are registered rather than fired and forgotten.
     */
    const rewardScreen = useRef<HTMLDivElement>(null);

    const pending = useRef<{ id: number; run: () => void; fireAt: number }[]>([]);

    const after = useCallback((ms: number, run: () => void) => {
        const entry = { id: 0, run, fireAt: performance.now() + ms };
        entry.id = window.setTimeout(() => {
            pending.current = pending.current.filter((p) => p !== entry);
            run();
        }, ms);
        pending.current.push(entry);
    }, []);

    useEffect(() => () => {
        pending.current.forEach((p) => window.clearTimeout(p.id));
        pending.current = [];
    }, []);

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

    /**
     * Tap to bring the card straight to the middle.
     *
     * The card's own animation says how far there is left to go: its
     * `card-preview-*` keyframes reach the centre at `CENTRED_AT`, so the gap
     * between that and where it has got to is the amount to skip. **Every
     * running animation on the screen is moved by that same amount**, not just
     * the card — the label slides in on its own timeline and would otherwise
     * arrive late — and so is every pending wait.
     *
     * Nothing is cut short: the card still holds in the middle and still leaves
     * the way it would have. Only the wait to get there goes.
     */
    const skipToCentre = useCallback(() => {
        if (!isSelectionConfirmed) return;
        const screen = rewardScreen.current;
        if (!screen) return;

        /**
         * Only the ones still going. A finished animation stays on the element
         * because these are all `forwards`, so asking for the first
         * `card-preview` finds the *last card's* spent one, whose time is
         * already past the centre — and every card after the first stopped
         * being skippable.
         */
        const running = screen.getAnimations({ subtree: true }).filter((a) => a.playState === "running");
        const preview = running.find((a) => (a as CSSAnimation).animationName?.includes("card-preview"));
        if (!preview) return;

        const timing = preview.effect?.getComputedTiming();
        const duration = Number(timing?.duration ?? 0);
        const delay = Number(timing?.delay ?? 0);
        if (!duration) return;

        const centred = delay + duration * CENTRED_AT;
        const jump = centred - Number(preview.currentTime ?? 0);
        if (jump <= 0) return;

        running.forEach((animation) => {
            animation.currentTime = Number(animation.currentTime ?? 0) + jump;
        });

        pending.current.forEach((p) => {
            window.clearTimeout(p.id);
            p.fireAt -= jump;
            p.id = window.setTimeout(() => {
                pending.current = pending.current.filter((q) => q !== p);
                p.run();
            }, Math.max(0, p.fireAt - performance.now()));
        });
    }, [isSelectionConfirmed]);

    const resetGame = (updatedPlayerCards: Record<number, number>) => {
        stopLoadedSound(victorySound);
        stopLoadedSound(bgm);

        // The cards have changed hands, so the room has done its job. Ending it
        // here returns both players to the lobby able to start another game,
        // rather than leaving a finished room polling in the background.
        if (session) {
            void finishMultiplayer(winState === "blue" ? "You won that game." : "You lost that game.");
        }

        dispatch({ type: "RESET_GAME" });

        dispatch({ type: "SET_PLAYER_CARDS", payload: updatedPlayerCards });
        dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: updatedPlayerCards });
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

        // Position travels with the id: the winner picked from the opponent's
        // hand, and index i there is index i of the hand they submitted, so the
        // loser can find exactly the same cards
        if (tradeNeedsExchange && session) {
            void sendRewards(session.code, session.token,
                selectedRewards.won.map((reward) => ({ id: reward.id, position: reward.position }))
            ).catch(() => { });
        }

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

    const setRewardPreview = (id: number, position: number) => {
        const cardData = cards.find(card => card.id === id);
        if (!cardData) return;

        setHoveredReward({ id, uniqueId: null, level: cardData.level, player: (winState === "red") ? "blue" : "red", position });
    }

    const { focus, isFocused } = useCursorNav({
        groups: [{ id: "rewards", size: playerRewardSelection.length }],
        initial: null,
        fallback: { group: "rewards", index: 0 },
        enabled: isManualSelect && !isSelectionConfirmed && selectedRewards.won.length < winAmount && !isCardGalleryOpen,
        resolveMove: (current, dir, { wrap }) => {
            if ((dir === "left" || dir === "right") && playerRewardSelection.length > 0) {
                return { group: "rewards", index: wrap(current.index, (dir === "right") ? 1 : -1, playerRewardSelection.length) };
            }
            return null;
        },
        onFocus: (current) => {
            const card = playerRewardSelection[current.index];
            if (card) setRewardPreview(card.id, current.index);
        },
        onConfirm: (current) => {
            const card = playerRewardSelection[current.index];
            if (!card) return;
            if (card.player === winState) {
                playSound("error", isSoundEnabled);
                return;
            }
            if (selectedRewards.won.length === winAmount - 1) {
                // The final pick opens the confirmation dialog focused on Yes
                markKeyboardNavigation();
            }
            handleSelectReward(card, card.position);
        },
        onCancel: () => {
            if (selectedRewards.won.length > 0) handleDenial();
        },
    });


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

    /**
     * The loser applies what the winner actually chose. Without this the local
     * "best card" routine would pick for them, and the two players would
     * disagree about which cards changed hands.
     */
    const areRewardsConfirmed = useRef(false);
    useEffect(() => {
        if (!awaitingOpponentPicks || areRewardsConfirmed.current || !incomingRewards) return;

        const taken = enemyRewardSelection.filter((card) =>
            incomingRewards.some((pick) => pick.id === card.id && pick.position === card.position));
        if (!taken.length) return;

        areRewardsConfirmed.current = true;
        setEnemyRewardSelection((previous) => previous.map((card) =>
            taken.some((pick) => pick.id === card.id && pick.position === card.position)
                ? { ...card, player: "red" } : card));
        setSelectedRewards({ won: [], lost: taken });
        setIsSelectionConfirmed(true);
        playSound("flip", isSoundEnabled);
        multiplayer.setIncomingRewards(null);
    }, [incomingRewards, awaitingOpponentPicks, enemyRewardSelection, isSoundEnabled]);

    useEffect(() => {
        if (areRewardsConfirmed.current || isManualSelect || awaitingOpponentPicks) return;

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

            if (reward.id in updatedPlayerCards && updatedPlayerCards[reward.id] > 0) {
                updatedPlayerCards[reward.id]--;
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

        after(beat((playerWinState === "lost") ? 500 : 0), () => {
            playSound("place", isSoundEnabled);
        });

        after(beat((playerWinState === "lost") ? 3000 : 2500), () => {
            playSound((playerWinState === "won") ? "success" : "place", isSoundEnabled);
        });

        confirmedList.push(reward);
        setConfirmedCards(confirmedList);

        after(beat(2800), () => {
            setSelectedReward(undefined);
        });

        if (!rewardsList.won.length && !rewardsList.lost.length) {
            after(beat(4500), () => {
                resetGame(updatedPlayerCards);
            });
        }
    }


    useEffect(() => {
        if (!isSelectionConfirmed) return;
        after(beat((confirmedCards.length) ? 3000 : 1500), processRewards);
    }, [isSelectionConfirmed, confirmedCards]);


    const recentCard = selectedReward || hoveredReward;
    const recentCardName = recentCard && cards.find(card => card.id === recentCard.id)?.name;
    const selectedRewardName = selectedReward && cards.find(card => card.id === selectedReward.id)?.name;

    const infoMessage = (rewardType === "lost") ? "lost" : "acquired";

    /**
     * Which way the label flies in, matched to the card it is naming rather
     * than to who won overall.
     *
     * A card you gain leaves upwards and drops back in from the top, so the
     * label drops in with it; one you lose leaves downwards and rises back, so
     * the label rises. Keyed to the winner they agreed by luck in a plain win
     * or loss, and disagreed the moment a trade sent cards both ways — the
     * direct rule does exactly that — leaving the label sliding one way while
     * the card it belonged to went the other.
     */
    const labelDirection = rewardType === "lost" ? "red" : rewardType === "won" ? "blue" : winState;

    /**
     * Nothing has been taken yet when the loser arrives here, so naming a card
     * gives "undefined card lost". Against another player the wait is real —
     * the winner is still choosing — so say that instead. On your own it is
     * only the beat before the automatic pick lands, so the line stays blank
     * rather than flashing a message that is gone again immediately.
     */
    const waitingForPicks = (isSelectionConfirmed || winState === "red") && !selectedRewardName && awaitingOpponentPicks;

    const headingText = (isSelectionConfirmed || winState === "red")
        ? (selectedRewardName
            ? `${selectedRewardName} card ${infoMessage}`
            : awaitingOpponentPicks ? "Waiting for your opponent to choose" : "")
        : `Select ${winAmount} card(s) you want`;

    return (
        <div
            ref={rewardScreen}
            onClick={skipToCentre}
            className={`${styles.rewardSelectionContainer} flex flex-col items-center justify-center top-0 z-10 w-screen h-screen`}
        >
            <div className={`${styles.rewardSelectionDialog} ${(isSelectionConfirmed && !selectedRewardName) ? "invisible" : ""}`} data-dialog="rewardSelectionInfo" data-animation={selectedRewardName} data-player={labelDirection}>
                <h4 className={styles.meta} data-sprite="info.">Info.</h4>
                <h3 className={styles.headingLine}>{textToSprite(headingText)}{waitingForPicks && <Ellipsis />}</h3>
            </div>

            <div className="flex justify-center mb-7">
                {playerRewardSelection.map((card, index) => (
                    <div className={styles.cell} key={index} data-focused={isFocused("rewards", index) && !isSelectionConfirmed && selectedRewards.won.length < winAmount} onClick={() => handleSelectReward(card, card.position)}>
                        <Card id={card.id} player={card.player} onMouseEnter={() => { if (winState === "blue" && !isSelectionConfirmed) focus({ group: "rewards", index }); }} data-selected={selectedRewards.won.some((reward) => reward.id === card.id && reward.position === card.position)} data-confirmed={isSelectionConfirmed && confirmedCards.some((reward) => reward.id === card.id && reward.position === card.position)} data-index={index} />
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
                    <h3>{textToSprite(recentCardName || "", (recentCard && lostCards[enemyId] && lostCards[enemyId].includes(recentCard.id)) ? "yellow" : (recentCard && (!(recentCard.id in playerCards) || playerCards[recentCard.id] === 0) ? "blue" : ""))}</h3>
                </div>
            </div>

            {selectedRewards.won.length === winAmount && !isSelectionConfirmed && winState === "blue" && <ConfirmationDialog handleConfirmation={handleConfirmation} handleDenial={handleDenial} />}
        </div>
    );
};

export default RewardSelectionDialog;