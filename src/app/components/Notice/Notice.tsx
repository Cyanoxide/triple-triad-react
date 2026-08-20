"use client";

import React, { useEffect } from "react";
import textToSprite from "../../utils/textToSprite";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import { multiplayer, useMultiplayer } from "../../hooks/multiplayerSession";
import styles from "./Notice.module.scss";

/**
 * "Your opponent left the game", and the like.
 *
 * These used to live only inside the lobby, which meant the one person who
 * needed to read them — the player still sitting there when the other walked
 * off — was taken to a screen that did not show them. It says its piece
 * wherever you land, then takes itself away.
 */

/** Long enough to read twice, short enough not to need dismissing */
const LINGER_MS = 4000;

const Notice: React.FC = () => {
    const { notice } = useMultiplayer();

    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => multiplayer.clearNotice(), LINGER_MS);
        return () => clearTimeout(timer);
    }, [notice]);

    if (!notice) return null;

    return (
        <div className={styles.notice}>
            <SimpleDialog>
                {textToSprite(notice)}
            </SimpleDialog>
        </div>
    );
};

export default Notice;
