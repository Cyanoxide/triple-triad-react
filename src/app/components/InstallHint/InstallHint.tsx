"use client";

import { useEffect, useState } from "react";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import textToSprite from "../../utils/textToSprite";
import playSound from "../../utils/sounds";
import { useGameContext } from "../../context/GameContext";
import { isIOS, isStandalone } from "../../utils/platform";
import styles from "./InstallHint.module.scss";

const DISMISSED_KEY = "installHintDismissed";

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
const InstallHint = () => {
    const { isSoundEnabled } = useGameContext();

    /**
     * Starts hidden and is turned on after mount.
     *
     * Everything it depends on — the user agent, the display mode, localStorage
     * — exists only in the browser, so deciding during render would make the
     * first client render disagree with the server's.
     */
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!isIOS()) return;
        // Already installed: this is the app, and it has nothing to advertise
        if (isStandalone()) return;
        if (localStorage.getItem(DISMISSED_KEY) === "true") return;

        setVisible(true);
    }, []);

    const dismiss = () => {
        playSound("back", isSoundEnabled);
        localStorage.setItem(DISMISSED_KEY, "true");
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className={styles.installHint} data-app-scaled>
            <SimpleDialog metaTitle={null} dialog="install">
                <p>{textToSprite("Play fullscreen", "yellow")}</p>
                <p className={styles.instruction}>{textToSprite("Tap Share, then")}</p>
                <p className={styles.instruction}>{textToSprite("Add to Home Screen")}</p>
                <button onClick={dismiss}>{textToSprite("Close")}</button>
            </SimpleDialog>
        </div>
    );
};

export default InstallHint;
