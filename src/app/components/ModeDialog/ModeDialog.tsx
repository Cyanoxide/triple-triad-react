"use client";

import React, { useState } from "react";
import textToSprite from "../../utils/textToSprite";
import playSound from "../../utils/sounds";
import { useGameContext } from "../../context/GameContext";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import { useMenuCursor } from "../../hooks/useMenuCursor";
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
    /**
     * Where the cursor is, not where the pointer is. Moving off an option
     * leaves it where it was rather than springing back — the cursor is a
     * position you moved, the same as in the rest of the menus.
     */
    const [selected, setSelected] = useState("single");

    const pointer = (id: string) => ({
        className: "relative",
        "data-focused": selected === id,
        onMouseEnter: () => setSelected(id),
    });

    const confirm = (id: string) => {
        playSound("select", isSoundEnabled);
        if (id === "single") onSingle(); else onMultiplayer();
    };

    useMenuCursor({
        layout: [["single"], ["multi"]],
        selected,
        onSelect: (id) => { playSound("select", isSoundEnabled); setSelected(id); },
        onConfirm: confirm,
    });

    return (
        <SimpleDialog className={styles.modeDialog}>
            <p className={styles.question}>{textToSprite("Want to play a game of cards?")}</p>
            <div className={styles.options}>
                <button {...pointer("single")} onClick={() => confirm("single")}>
                    {textToSprite("Single Player")}
                </button>
                <button {...pointer("multi")} onClick={() => confirm("multi")}>
                    {textToSprite("Multiplayer")}
                </button>
            </div>
        </SimpleDialog>
    );
};

export default ModeDialog;
