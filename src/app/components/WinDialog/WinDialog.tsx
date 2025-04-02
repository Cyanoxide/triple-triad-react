import React, { useEffect } from "react";
import { useGameContext } from "../../context/GameContext";
import Image from "next/image";
import styles from "./WinDialog.module.scss";
import { playLoadedSound, stopLoadedSound } from "../../utils/sounds";

interface WinDialogProps {
    victorySound: HTMLAudioElement;
    bgm: HTMLAudioElement | undefined;
}

const WinDialog: React.FC<WinDialogProps> = ({ victorySound, bgm }) => {
    const { winState, playerCards, currentEnemyHand, currentPlayerHand, isSoundEnabled, board, rules, dispatch } = useGameContext();
    const playerCardsCopy = { ...playerCards };

    if (winState === "blue") {
        stopLoadedSound(bgm, isSoundEnabled);
        playLoadedSound(victorySound, isSoundEnabled);
    }

    const getCardIdsFromBoard = (player: "red" | "blue") => {
        return board
            .flatMap(row => row)
            .filter(cell => cell !== null && cell[1] === player)
            .map(cell => cell![0]);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!winState) return;
            if (winState !== "draw") {
                dispatch({ type: "SET_IS_REWARD_SELECTION_OPEN", payload: true });
            } else {
                if (rules?.includes("suddenDeath")) {
                    const newEnemyHand = currentEnemyHand.concat(getCardIdsFromBoard("red"));
                    const newPlayerHand = currentPlayerHand.concat(getCardIdsFromBoard("blue"));

                    dispatch({ type: "SET_BOARD", payload: board.map(() => Array(3).fill(null)) });
                    dispatch({ type: "SET_WIN_STATE", payload: null });
                    dispatch({ type: "SET_TURN", payload: null });
                    dispatch({ type: "RESET_TURN" });
                    dispatch({ type: "SET_SCORE", payload: [5, 5] });

                    dispatch({ type: "SET_CURRENT_ENEMY_HAND", payload: newEnemyHand });
                    dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: newPlayerHand });
                } else {
                    dispatch({ type: "RESET_GAME" });
                    dispatch({ type: "SET_PLAYER_CARDS", payload: playerCardsCopy });
                }
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [winState]);


    return (
        <Image src="/assets/finishmsg.png" alt="Finish Message" width="500" height="84" className={`${styles.finishMsg}`} data-win-state={winState} />
    );
};

export default WinDialog