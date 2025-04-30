import { createContext, use, useReducer, useEffect, ReactNode } from "react";
import { gameReducer, initialState } from "./GameReducer";
import { GameContextType } from "./GameTypes";

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const storedCardsJSON = localStorage.getItem("playerCards");
        if (storedCardsJSON) {
            try {
                const storedCards = JSON.parse(storedCardsJSON);
                dispatch({ type: "SET_PLAYER_CARDS", payload: storedCards });
            } catch (error) {
                console.error("Failed to parse playerCards from localStorage", error);
            }
        }

        const lostCardsJSON = localStorage.getItem("lostCards");
        if (lostCardsJSON) {
            try {
                const lostCards = JSON.parse(lostCardsJSON);
                dispatch({ type: "SET_LOST_CARDS", payload: lostCards });
            } catch (error) {
                console.error("Failed to parse playerCards from localStorage", error);
            }
        }
    }, []);

    useEffect(() => {
        if (!state.isGameActive) return;

        if (state.turn === null) {
            dispatch({ type: "SET_TURN", payload: Math.random() < 0.5 ? "red" : "blue" });
        }
    }, [state.turn, state.isGameActive]);

    useEffect(() => {
        dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: state.playerCards });
    }, [state.isCardSelectionOpen, state.playerCards])

    return (
        <GameContext value={{ ...state, dispatch }}>
            {children}
        </GameContext>
    );
};

export const useGameContext = () => {
    const context = use(GameContext);
    if (!context) {
        throw new Error("useGameContext must be used within a GameProvider");
    }
    return context;
};