import React, { useEffect } from 'react';
import { useGameContext } from "../../context/GameContext";

const WinDialog = () => {
    const { winState, dispatch } = useGameContext();
    const winMessage = (winState === "draw") ? "Draw!" : `${winState} wins!`;

    useEffect(() => {
        if (!winState) return;

        const timer = setTimeout(() => {
            if (winState !== "draw") {
                dispatch({ type: "SET_IS_REWARD_SELECTION_OPEN", payload: true });
            } else {
                dispatch({ type: "RESET_GAME" });
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [winState, dispatch]);

    if (!winState) return null;

    return (
        <h1 className="absolute top-1/2 left-1/2 text-5xl z-1 -translate-x-1/2">{winMessage}</h1>
    );
};

export default WinDialog