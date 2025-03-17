import React, { useEffect } from "react";
import { useGameContext } from "../../context/GameContext";
import Image from "next/image";
import styles from "./WinDialog.module.scss"

const WinDialog = () => {
    const { winState, playerCards, dispatch } = useGameContext();
    const playerCardsCopy = { ...playerCards };

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