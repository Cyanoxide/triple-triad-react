import React from 'react';
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

    return (
        <div className={`${styles.confirmationDialog} absolute`} data-dialog="confirmation">
            <h4>Choice.</h4>
            <h3>Are you sure?</h3>
            <div className="flex flex-col items-center">
                <button className="relative" onClick={handleConfirmation} onMouseEnter={handleMouseEnter}>Yes</button>
                <button className="relative" onClick={handleDenial} onMouseEnter={handleMouseEnter}>No</button>
            </div>
        </div>
    );
};

export default ConfirmationDialog;