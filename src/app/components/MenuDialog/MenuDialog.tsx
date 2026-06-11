import { useEffect } from "react";
import styles from './MenuDialog.module.scss';
import { useGameContext } from "../../context/GameContext";
import playSound from "../../utils/sounds";
import LocationSelectionDialog from '../LocationSelection/LocationSelection';
import EnemySelectionDialog from '../EnemySelection/EnemySelection';
import textToSprite from '../../utils/textToSprite';
import rulesList from "../../../data/rules.json";
import { useCursorNav, markKeyboardNavigation } from "../../hooks/useCursorNav";
import type { CursorPos } from "../../hooks/useCursorNav";
import { paginationNav } from "../../hooks/paginationNav";
import { optionsNav } from "../../hooks/optionsNav";

const OPTIONS_SIZE = 4;

// Vertical cursor chain: Play, Quit, location row, enemy row, options panel
const CHAIN: CursorPos[] = [
    { group: "buttons", index: 0 },
    { group: "buttons", index: 1 },
    { group: "location", index: 0 },
    { group: "enemy", index: 0 },
    { group: "options", index: 0 },
];

const MenuDialog = () => {
    const { isMenuOpen, isCardGalleryOpen, isSoundEnabled, rules, tradeRule, dispatch } = useGameContext();

    const handlePlayClick = () => {
        dispatch({ type: "SET_IS_MENU_OPEN", payload: false });
        dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: true });
        playSound("select", isSoundEnabled);
    }

    const handleQuitClick = () => {
        playSound("error", isSoundEnabled);
    }

    const isOptionEnabled = (index: number) => index === 0 || !!optionsNav.actions.isOpen?.();

    const chainIndexOf = (pos: CursorPos) => {
        if (pos.group === "buttons") return pos.index;
        if (pos.group === "location") return 2;
        if (pos.group === "enemy") return 3;
        return 4;
    };

    const { focus, isFocused } = useCursorNav({
        groups: [
            { id: "buttons", size: 2 },
            { id: "location", size: 1 },
            { id: "enemy", size: 1 },
            { id: "options", size: OPTIONS_SIZE, isDisabled: (index) => !isOptionEnabled(index) },
        ],
        initial: null,
        fallback: { group: "buttons", index: 0 },
        enabled: isMenuOpen && !isCardGalleryOpen,
        resolveMove: (current, dir) => {
            if (dir === "left" || dir === "right") {
                if (current.group === "location") {
                    paginationNav.flip("locations", (dir === "left") ? "prev" : "next");
                    return "handled";
                }
                if (current.group === "enemy") {
                    paginationNav.flip("players", (dir === "left") ? "prev" : "next");
                    return "handled";
                }
                if (current.group === "options") {
                    for (let step = 1; step < OPTIONS_SIZE; step++) {
                        const index = (current.index + ((dir === "right") ? step : -step) + OPTIONS_SIZE * 4) % OPTIONS_SIZE;
                        if (isOptionEnabled(index)) return { group: "options", index };
                    }
                    return null;
                }
                return null;
            }
            const delta = (dir === "down") ? 1 : -1;
            return CHAIN[(chainIndexOf(current) + delta + CHAIN.length) % CHAIN.length];
        },
        onFocus: (current) => {
            optionsNav.setFocus(current.group === "options" ? current.index : null);
        },
        onConfirm: (current) => {
            if (current.group === "buttons") {
                if (current.index === 0) {
                    markKeyboardNavigation();
                    handlePlayClick();
                } else {
                    handleQuitClick();
                }
                return;
            }
            if (current.group === "location") {
                paginationNav.flip("locations", "next");
                return;
            }
            if (current.group === "enemy") {
                paginationNav.flip("players", "next");
                return;
            }
            if (!isOptionEnabled(current.index)) return;
            if (current.index === 0) optionsNav.actions.toggleOptions?.();
            else if (current.index === 1) optionsNav.actions.toggleCRT?.();
            else if (current.index === 2) {
                markKeyboardNavigation();
                optionsNav.actions.toggleGallery?.();
            }
            else optionsNav.actions.toggleSound?.();
        },
    });

    // Let mouse hover on the options panel move the menu cursor
    useEffect(() => {
        optionsNav.actions.focusOption = (index) => focus({ group: "options", index });
        return () => {
            optionsNav.actions.focusOption = undefined;
            optionsNav.setFocus(null);
        };
    }, [focus]);

    return (
        <>
            <div className={`${styles.menuDialog} ${(isMenuOpen) ? "" : "hidden"}`}>
                <h4 className={styles.meta} data-sprite="info.">Info.</h4>
                <p>{textToSprite("Rules:")}</p>
                <ul>
                    {rules && rules.map((rule: string, index) => (
                        <li key={index}><span>{textToSprite(`• ${rulesList.rules[rule as keyof typeof rulesList.rules]}`)}</span></li>
                    ))}
                </ul>
                <p>{textToSprite(`• Trade Rule: ${(tradeRule) ? rulesList.tradeRules[tradeRule as keyof typeof rulesList.tradeRules] : "None"}`)}</p>
                <div className="flex flex-col items-center">
                    <button className="relative" data-focused={isFocused("buttons", 0)} onClick={handlePlayClick} onMouseEnter={() => focus({ group: "buttons", index: 0 })}>{textToSprite("Play")}</button>
                    <button className="relative" data-focused={isFocused("buttons", 1)} onClick={handleQuitClick} onMouseEnter={() => focus({ group: "buttons", index: 1 })}>{textToSprite("Quit")}</button>
                </div>
            </div>
            <LocationSelectionDialog focused={isFocused("location", 0)} />
            <EnemySelectionDialog focused={isFocused("enemy", 0)} />
        </>
    );
};

export default MenuDialog;
