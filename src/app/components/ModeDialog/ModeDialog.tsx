"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import textToSprite from "../../utils/textToSprite";
import playSound from "../../utils/sounds";
import { useGameContext } from "../../context/GameContext";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import { useMenuCursor } from "../../hooks/useMenuCursor";
import styles from "./ModeDialog.module.scss";

interface Props {
    onSingle: () => void;
    onMultiplayer: () => void;
    /**
     * False while something in front of this has the cursor — the install
     * hint, on a phone. Two cursors on screen at once reads as a bug, and the
     * keys would drive both.
     */
    cursorEnabled?: boolean;
}

/**
 * Off to one side of the game itself, so they sit under the box rather than in
 * it — picking a mode is the thing this screen is for.
 */
const LINKS = [
    { id: "github", label: "Github", href: "https://github.com/Cyanoxide/triple-triad-react" },
    { id: "donate", label: "Donate", href: "https://ko-fi.com/cyanoxide" },
    { id: "jamiepates.com", label: "Jamiepates.com", href: "https://jamiepates.com" },
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
const ModeDialog: React.FC<Props> = ({ onSingle, onMultiplayer, cursorEnabled = true }) => {
    const { isSoundEnabled } = useGameContext();
    /**
     * Where the cursor is, not where the pointer is. Moving off an option
     * leaves it where it was rather than springing back — the cursor is a
     * position you moved, the same as in the rest of the menus.
     */
    const [selected, setSelected] = useState("single");

    /**
     * The links render through a portal, and a portal needs a DOM node the
     * server does not have. Mounted-only, like everything else here that
     * depends on the browser.
     */
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Moving the cursor sounds the same however it was moved
    const moveCursor = (id: string) => setSelected((current) => {
        if (current !== id) playSound("select", isSoundEnabled);
        return id;
    });

    const pointer = (id: string) => ({
        className: "relative",
        "data-focused": cursorEnabled && selected === id,
        onMouseEnter: () => moveCursor(id),
        /**
         * **A touch has to move the cursor too.**
         *
         * `mouseenter` is a pointer leaving one thing and arriving at another,
         * which is not what a finger does — it arrives already pressing. So on
         * a phone the cursor stayed wherever it was while a different option
         * was being tapped, and sat there through the wait for the next screen.
         *
         * `pointerdown` covers both: a mouse has already moved the cursor by
         * hovering, so this is a no-op there, and a touch gets it on contact.
         *
         * Set directly rather than through `moveCursor`, which sounds the
         * cursor as it moves — on a touch that would land at the same moment as
         * the confirmation sound the press itself makes.
         */
        onPointerDown: () => setSelected(id),
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
        layout: [["single"], ["multi"], LINKS.map((link) => link.id)],
        selected,
        onSelect: moveCursor,
        onConfirm: confirm,
        enabled: cursorEnabled,
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

        {/*
          * **Trial layout.** The links as boxes in the corner rather than a row
          * of bare text under the mode box. One commit, so it drops whole.
          *
          * **Through a portal, so they are a sibling of `#app`.** Left inside
          * it they were zoomed twice — once by `scaleApp` and again by
          * `data-app-scaled` — where the real corner furniture is zoomed once,
          * and every length had to be divided by `--app-scale` to compensate.
          * Safari and Firefox then disagreed about the result. Rendering them
          * where the options bar renders means the same markup as the options
          * bar produces the same size, with nothing to correct.
          *
          * The cursor still belongs to this component: a portal moves where the
          * DOM node goes, not where the React tree lives.
          */}
        {mounted && createPortal(
            <div className={`fixed left-[var(--furniture-gap)] bottom-[var(--furniture-gap)] text-3xl z-10 flex items-end ${styles.links}`} data-app-scaled>
                {LINKS.map((link) => (
                    <SimpleDialog key={link.id} metaTitle={null} dialog="quit" className={styles.linkBox}>
                        <a
                            className={styles.link}
                            href={link.href}
                            target="_blank"
                            rel="noreferrer noopener"
                            data-focused={cursorEnabled && selected === link.id}
                            onMouseEnter={() => moveCursor(link.id)}
                            onPointerDown={() => setSelected(link.id)}
                            onClick={() => playSound("select", isSoundEnabled)}
                        >
                            {textToSprite(link.label)}
                        </a>
                    </SimpleDialog>
                ))}
            </div>,
            document.body,
        )}
        </>
    );
};

export default ModeDialog;
