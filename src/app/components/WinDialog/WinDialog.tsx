import React from 'react';
import { useGameContext } from "../../context/GameContext";

const WinDialog = () => {
    const { winState, dispatch } = useGameContext();
    const winMessage = (winState === "draw") ? "It's a draw!" : `${winState} wins!`;

    if (!winState) return;

    setTimeout(() => {
        dispatch({ type: "RESET_GAME" });
    }, 8000);

    return <h1 className={`${(winState) ? "" : "hidden"} absolute top-1/2 left-1/2 text-5xl z-1 -translate-x-1/2`}>{winMessage}</h1>;
};

export default WinDialog;