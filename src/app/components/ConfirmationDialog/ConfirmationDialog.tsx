import React from 'react';
import { createPortal } from "react-dom";
import styles from './ConfirmationDialog.module.scss';
import { useGameContext } from '../../context/GameContext';
import textToSprite from '../../utils/textToSprite';
import { useCursorNav, markKeyboardNavigation } from "../../hooks/useCursorNav";

interface MenuProps {
    handleConfirmation: () => void;
    handleDenial: () => void;
}

const ConfirmationDialog: React.FC<MenuProps> = ({ handleConfirmation, handleDenial }) => {
    const { isCardGalleryOpen } = useGameContext();

    const { focus, isFocused } = useCursorNav({
        groups: [{ id: "choice", size: 2 }],
        initial: null,
        fallback: { group: "choice", index: 0 },
        enabled: !isCardGalleryOpen,
        resolveMove: (current, dir, { wrap }) => {
            if (dir === "up" || dir === "down") {
                return { group: "choice", index: wrap(current.index, (dir === "down") ? 1 : -1, 2) };
            }
            return null;
        },
        onFocus: () => { },
        onConfirm: (current) => {
            if (current.index === 0) {
                markKeyboardNavigation();
                handleConfirmation();
            } else {
                handleDenial();
            }
        },
        onCancel: () => handleDenial(),
    });

    const modalElement = document.getElementById("modal");

    if (!modalElement) return null;

    return createPortal(
        <div className="w-full h-full absolute left-0 top-0 z-10">
            <div className={`${styles.confirmationDialog} absolute`} data-dialog="confirmation">
                <h4 className={styles.meta} data-sprite="choice">Choice</h4>
                <h3 className="text-center">{textToSprite("Are you sure?")}</h3>
                <div className="flex flex-col items-center">
                    <button className="relative" data-focused={isFocused("choice", 0)} onClick={handleConfirmation} onMouseEnter={() => focus({ group: "choice", index: 0 })}>{textToSprite("Yes")}</button>
                    <button className="relative" data-focused={isFocused("choice", 1)} onClick={handleDenial} onMouseEnter={() => focus({ group: "choice", index: 1 })}>{textToSprite("No")}</button>
                </div>
            </div>
        </div>,
        modalElement
    );
};

export default ConfirmationDialog;
