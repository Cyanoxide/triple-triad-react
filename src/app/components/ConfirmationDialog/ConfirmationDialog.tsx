import React from 'react';
import styles from './ConfirmationDialog.module.scss';



interface MenuProps {
    handleConfirmation: () => void;
    handleDenial: () => void;
}

const ConfirmationDialog: React.FC<MenuProps> = ({ handleConfirmation, handleDenial }) => {

    return (
        <div className={`${styles.confirmationDialog} absolute`} data-dialog="confirmation">
            <h4>Choice.</h4>
            <h3>Are you sure?</h3>
            <div className="flex flex-col items-center">
                <button className="relative" onClick={handleConfirmation}>Yes</button>
                <button className="relative" onClick={handleDenial}>No</button>
            </div>
        </div>
    );
};

export default ConfirmationDialog;