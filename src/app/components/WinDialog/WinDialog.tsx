import React, { useEffect } from "react";
import { useGameContext } from "../../context/GameContext";
import { PlayerType } from "../../context/GameTypes";
import Image from "next/image";
import styles from "./WinDialog.module.scss";
import { playLoadedSound, stopLoadedSound } from "../../utils/sounds";
import { generateCardsFromIds } from "../../utils/general";
import { finishMultiplayer, useMultiplayer } from "../../hooks/multiplayerSession";
import { reportResult, startSuddenDeath } from "../../utils/rooms";

interface WinDialogProps {
    victorySound: HTMLAudioElement;
    bgm: HTMLAudioElement | undefined;
}

const WinDialog: React.FC<WinDialogProps> = ({ victorySound, bgm }) => {
    const { winState, playerCards, currentEnemyHand, currentPlayerHand, isSoundEnabled, board, rules, tradeRule, score, dispatch } = useGameContext();
    const { session } = useMultiplayer();
    const playerCardsCopy = { ...playerCards };

    if (winState === "blue") {
        stopLoadedSound(bgm);
        playLoadedSound(victorySound, isSoundEnabled);
    }

    const getCardIdsFromBoard = (player: PlayerType) => {
        return board
            .flatMap(row => row)
            .filter(cell => cell !== null && cell.currentOwner === player)
            .map(cell => cell!.cardId);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!winState) return;
            if (winState !== "draw") {
                // The host records the outcome for the room. Reported as a seat,
                // never a colour: each client renders itself blue, so "blue won"
                // would read as the opposite thing on the other screen.
                if (session?.seat === "host") {
                    const winner = winState === "blue" ? "host" : "guest";
                    void reportResult(session.code, session.token, winner, score).catch(() => { });
                }

                /**
                 * Nothing changes hands under the "None" trade rule, so there is
                 * no reward screen to show. It has to be skipped rather than
                 * shown empty: that screen closes itself once it has finished
                 * handing cards over, and with none to hand over it would sit
                 * there for good with no way out but a refresh.
                 *
                 * The result is still reported above — the room wants to know
                 * who won whether or not anything was won.
                 */
                if (tradeRule === "none") {
                    if (session) {
                        void finishMultiplayer(winState === "blue" ? "You won that game." : "You lost that game.");
                        return;
                    }
                    dispatch({ type: "RESET_GAME" });
                    dispatch({ type: "SET_PLAYER_CARDS", payload: playerCardsCopy });
                    return;
                }

                dispatch({ type: "SET_IS_REWARD_SELECTION_OPEN", payload: true });
            } else {
                /**
                 * Against another player the room decides a sudden death round,
                 * not each client. Both reach the draw at the same instant, so
                 * the host announces it and both apply the same event —
                 * otherwise the two would restart independently and could draw
                 * different opening players.
                 */
                if (session) {
                    if (rules?.includes("suddenDeath")) {
                        // Only the host announces it, but both wait for the event
                        if (session.seat === "host") {
                            void startSuddenDeath(session.code, session.token).catch(() => { });
                        }
                        return;
                    }
                    // A draw with no sudden death simply ends the game. Without
                    // this the board sat on "Draw" with nothing to do next.
                    void finishMultiplayer("That game was a draw.");
                    return;
                }

                if (rules?.includes("suddenDeath")) {
                    const newEnemyHand = currentEnemyHand.concat(generateCardsFromIds(getCardIdsFromBoard("red"), "red"));
                    const newPlayerHand = currentPlayerHand.concat(generateCardsFromIds(getCardIdsFromBoard("blue"), "blue"));

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