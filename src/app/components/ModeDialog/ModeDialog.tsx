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
 * Off to one side of the game itself, so they sit under the box rather than in
 * it — picking a mode is the thing this screen is for.
 */
const LINKS = [
    { id: "github", label: "Github", href: "https://github.com/Cyanoxide/triple-triad-react" },
    { id: "jamiepates.com", label: "Jamiepates.com", href: "https://jamiepates.com" },
    { id: "donate", label: "Donate", href: "https://ko-fi.com/cyanoxide" },
] as const;

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

    // Moving the cursor sounds the same however it was moved
    const moveCursor = (id: string) => setSelected((current) => {
        if (current !== id) playSound("select", isSoundEnabled);
        return id;
    });

    const pointer = (id: string) => ({
        className: "relative",
        "data-focused": selected === id,
        onMouseEnter: () => moveCursor(id),
    });

    const confirm = (id: string) => {
        playSound("select", isSoundEnabled);

        const link = LINKS.find((entry) => entry.id === id);
        if (link) {
            // Opened the same way a click would, so the keyboard is not a
            // second path with its own behaviour
            window.open(link.href, "_blank", "noreferrer,noopener");
            return;
        }

        if (id === "single") onSingle(); else onMultiplayer();
    };

    useMenuCursor({
        layout: [["single"], ["multi"], ["github", "donate"]],
        selected,
        onSelect: moveCursor,
        onConfirm: confirm,
    });

    return (
        <>
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

        <div className={styles.links}>
            {LINKS.map((link) => (
                <a
                    key={link.id}
                    className={styles.link}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    data-focused={selected === link.id}
                    onMouseEnter={() => moveCursor(link.id)}
                    onClick={() => playSound("select", isSoundEnabled)}
                >
                    {textToSprite(link.label)}
                </a>
            ))}
        </div>
        </>
    );
};

export default ModeDialog;
