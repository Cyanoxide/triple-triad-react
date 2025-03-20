import React, { useEffect } from "react";
import { useGameContext } from "../../context/GameContext";
import Image from "next/image";
import styles from "./WinDialog.module.scss";
import { playLoadedSound, stopLoadedSound } from "../../utils/sounds";

interface WinDialogProps {
    victorySound: HTMLAudioElement;
    bgm: HTMLAudioElement;
}

const WinDialog: React.FC<WinDialogProps> = ({ victorySound, bgm }) => {
    const { winState, playerCards, isSoundEnabled, dispatch } = useGameContext();
    const playerCardsCopy = { ...playerCards };

    if (winState === "blue") {
        stopLoadedSound(bgm, isSoundEnabled);
        playLoadedSound(victorySound, isSoundEnabled);
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!winState) return;
            if (winState !== "draw") {
                dispatch({ type: "SET_IS_REWARD_SELECTION_OPEN", payload: true });
            } else {
                dispatch({ type: "RESET_GAME" });
                dispatch({ type: "SET_PLAYER_CARDS", payload: playerCardsCopy });
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, []);


    return (
        <Image src="/assets/finishmsg.png" alt="Finish Message" width="500" height="84" className={`${styles.finishMsg}`} data-win-state={winState} />
    );
};

export default WinDialog