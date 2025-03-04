import { createContext, use, useReducer, useEffect, ReactNode } from "react";
import { gameReducer, initialState } from "./GameReducer";
import { GameContextType } from "./GameTypes";

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    // Ensure the starting turn is only set after hydration
    useEffect(() => {
        if (state.isMenuOpen) return;

        if (state.turn === null) {
            dispatch({ type: "SET_TURN", payload: Math.random() < 0.5 ? "red" : "blue" });
        }
    }, [state.turn, state.isMenuOpen]);

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