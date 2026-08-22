import { createContext, use, useReducer, useEffect, ReactNode } from "react";
import { gameReducer, initialState } from "./GameReducer";
import { GameContextType } from "./GameTypes";
import { multiplayer } from "../hooks/multiplayerSession";
import { isStandalone } from "../utils/platform";

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

        /**
         * **Sound starts on in the installed app, off in a browser.**
         *
         * A tab is somewhere you might land without meaning to, often beside
         * other tabs and often in company, so it stays quiet until asked. An
         * app was installed on purpose and opened on purpose, and starting it
         * silent means every player has to find the options bar before the
         * game sounds like anything.
         *
         * Here rather than in `initialState`, because the server cannot know
         * the display mode: deciding it during render would make the first
         * client render disagree with the server's. It is also not persisted —
         * neither is the flag itself — so this is the default each launch,
         * which is what "by default" should mean.
         *
         * The autoplay policy is unaffected either way. Nothing is audible
         * until a gesture unlocks the context; the music simply queues itself
         * and starts on the first tap rather than needing the toggle first.
         */
        if (isStandalone()) {
            dispatch({ type: "SET_IS_SOUND_ENABLED", payload: true });
        }
    }, []);

    useEffect(() => {
        if (!state.isGameActive) return;

        /**
         * Against another player the opening turn is not ours to flip. Both
         * clients would toss their own coin and could disagree about who starts,
         * so the room decides it once and the page applies it.
         */
        if (multiplayer.get().session) return;

        if (state.turn === null) {
            dispatch({ type: "SET_TURN", payload: Math.random() < 0.5 ? "red" : "blue" });
        }
    }, [state.turn, state.isGameActive]);

    useEffect(() => {
        const currentPlayerCards = Object.fromEntries(
            Object.entries(state.playerCards).filter(([, quantity]) => quantity !== 0)
        ) as Record<number, number>;
        dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: currentPlayerCards });
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