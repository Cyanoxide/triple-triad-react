import React from 'react';
import { createPortal } from "react-dom";
import styles from './ConfirmationDialog.module.scss';
import { useGameContext } from '../../context/GameContext';
import playSound from "../../utils/sounds";

interface MenuProps {
    handleConfirmation: () => void;
    handleDenial: () => void;
}

const ConfirmationDialog: React.FC<MenuProps> = ({ handleConfirmation, handleDenial }) => {
    const { isSoundEnabled } = useGameContext();

    const handleMouseEnter = () => {
        playSound("select", isSoundEnabled);
    }

    const modalElement = document.getElementById("modal");

    if (!modalElement) return null;

    return createPortal(
        <div className="w-full h-screen absolute left-0 top-0 z-10">
            <div className={`${styles.confirmationDialog} absolute`} data-dialog="confirmation">
                <h4 className={styles.meta} data-sprite="choice">Choice</h4>
                <h3 className="text-center">Are you sure?</h3>
                <div className="flex flex-col items-center">
                    <button className="relative" onClick={handleConfirmation} onMouseEnter={handleMouseEnter}>Yes</button>
                    <button className="relative" onClick={handleDenial} onMouseEnter={handleMouseEnter}>No</button>
                </div>
            </div>
        </div>,
        modalElement
    );
};

export default ConfirmationDialog;