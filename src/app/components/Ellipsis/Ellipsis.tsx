"use client";

import React, { useEffect, useState } from "react";
import textToSprite from "../../utils/textToSprite";
import styles from "./Ellipsis.module.scss";

/**
 * A moving "..." for lines that are waiting on someone else.
 *
 * All three dots are always laid out and the unreached ones are merely
 * invisible. Growing the string instead re-centres the line on every tick, so
 * the message beside it jitters left and right as it animates.
 */
const Ellipsis: React.FC = () => {
    const [dots, setDots] = useState(3);

    useEffect(() => {
        const tick = setInterval(() => setDots((count) => (count % 3) + 1), 500);
        return () => clearInterval(tick);
    }, []);

    return (
        <span className={styles.ellipsis}>
            {[1, 2, 3].map((step) => (
                <span key={step} data-shown={step <= dots}>{textToSprite(".")}</span>
            ))}
        </span>
    );
};

export default Ellipsis;
