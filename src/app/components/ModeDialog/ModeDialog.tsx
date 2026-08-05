"use client";

import React, { useState } from "react";
import textToSprite from "../../utils/textToSprite";
import playSound from "../../utils/sounds";
import { useGameContext } from "../../context/GameContext";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import styles from "./ModeDialog.module.scss";

interface Props {
    onSingle: () => void;
    onMultiplayer: () => void;
}

/**
 * The first thing you see: which kind of game.
 *
 * Multiplayer used to be a VS box wedged in beside the title menu, which put a
 * whole second way of playing in the margin of the first one. Asking up front
 * means neither mode has to make room for the other — the single player screen
 * goes back to being only itself, and multiplayer gets a screen without the
 * location and player panels it never used.
 */
const ModeDialog: React.FC<Props> = ({ onSingle, onMultiplayer }) => {
    const { isSoundEnabled } = useGameContext();
    const [hovered, setHovered] = useState<string | null>(null);

    const pointer = (id: string) => ({
        className: "relative",
        "data-focused": hovered === id,
        onMouseEnter: () => setHovered(id),
        onMouseLeave: () => setHovered((current) => (current === id ? null : current)),
    });

    const choose = (go: () => void) => () => {
        playSound("select", isSoundEnabled);
        go();
    };

    return (
        <SimpleDialog className={styles.modeDialog}>
            <p className={styles.question}>{textToSprite("Want to play a game of cards?")}</p>
            <div className={styles.options}>
                <button {...pointer("single")} onClick={choose(onSingle)}>
                    {textToSprite("Single Player")}
                </button>
                <button {...pointer("multi")} onClick={choose(onMultiplayer)}>
                    {textToSprite("Multiplayer")}
                </button>
            </div>
        </SimpleDialog>
    );
};

export default ModeDialog;
