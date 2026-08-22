"use client";

import { useEffect, useState } from "react";
import { useMenuCursor } from "../../hooks/useMenuCursor";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import textToSprite from "../../utils/textToSprite";
import playSound from "../../utils/sounds";
import { useGameContext } from "../../context/GameContext";
import { isIOS, isStandalone } from "../../utils/platform";
import styles from "./InstallHint.module.scss";

const DISMISSED_KEY = "installHintDismissed";

/**
 * **Session storage, not local.**
 *
 * Dismissing this says "not now", not "never" — the offer is worth making
 * again next time the game is opened, since the reason to install has not gone
 * away. Session storage is exactly that scope: it survives navigation within
 * the tab and is dropped when the tab closes.
 *
 * It also keeps the two states honest. Once installed, the app is standalone
 * and the hint never renders at all, so the only person who sees it a second
 * time is someone still in a browser.
 */

/**
 * A nudge towards installing, shown to iOS browsers only.
 *
 * **Why only iOS.** Android fires `beforeinstallprompt` and offers installing
 * by itself, so a hint there is the browser's job being done twice. iOS has no
 * such event and no prompt of any kind — Add to Home Screen is buried in the
 * share sheet, and nothing on the page is allowed to open it or even ask. A
 * player who never goes looking never finds out the app exists, which is the
 * gap this fills.
 *
 * **Why it can only be instructions.** There is no API to call. The most any
 * page can do on iOS is say where the button is.
 */
type Props = {
    /** Told when the hint appears and when it goes, so the screen behind it
     *  can stand its own cursor down while this one has it. */
    onOpenChange?: (open: boolean) => void;
};

const InstallHint = ({ onOpenChange }: Props) => {
    const { isSoundEnabled } = useGameContext();

    /**
     * Starts hidden and is turned on after mount.
     *
     * Everything it depends on — the user agent, the display mode, session
     * — exists only in the browser, so deciding during render would make the
     * first client render disagree with the server's.
     */
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!isIOS()) return;
        // Already installed: this is the app, and it has nothing to advertise
        if (isStandalone()) return;
        if (sessionStorage.getItem(DISMISSED_KEY) === "true") return;

        setVisible(true);
        onOpenChange?.(true);
    }, []);

    const dismiss = () => {
        playSound("back", isSoundEnabled);
        sessionStorage.setItem(DISMISSED_KEY, "true");
        setVisible(false);
        onOpenChange?.(false);
    };

    /*
     * One option, so the layout is a single cell. It exists for Enter and
     * Escape: the cursor is already on Close and there is nowhere to move it,
     * but both should dismiss rather than doing nothing.
     */
    useMenuCursor({
        layout: [["close"]],
        selected: "close",
        onSelect: () => { },
        onConfirm: dismiss,
        onBack: dismiss,
        enabled: visible,
    });

    if (!visible) return null;

    return (
        <div className={styles.installHint} data-app-scaled>
            <SimpleDialog dialog="install">
                {/*
                  * Two lines because sprite text does not wrap — one string
                  * this long would run out of the panel rather than break.
                  */}
                {/*
                  * The third argument is the centring. `textToSprite` wraps its
                  * glyphs in a flex span, so `text-align` on an ancestor cannot
                  * reach them — the flag is what adds `justify-center`.
                  */}
                <p className={styles.heading}>
                    {textToSprite("iOS Device Detected", "yellow", true)}
                </p>
                {/*
                  * Single quotes, not double: the sprite font has an apostrophe
                  * and no `"` at all, so a double quote renders as a gap.
                  */}
                <p className={styles.body}>
                    {textToSprite("For the best mobile experience,", "white", true)}
                </p>
                <p className={styles.body}>
                    {textToSprite("tap 'Share', then 'Add to Home Screen'", "white", true)}
                </p>
                <button className="relative" data-focused onClick={dismiss}>
                    {textToSprite("Close")}
                </button>
            </SimpleDialog>
        </div>
    );
};

export default InstallHint;
