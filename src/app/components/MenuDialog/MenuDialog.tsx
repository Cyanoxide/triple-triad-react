import React from 'react';
import styles from './MenuDialog.module.scss';
import { useGameContext } from "../../context/GameContext";


interface MenuProps {
    rules: string[];
}

const MenuDialog: React.FC<MenuProps> = ({ rules }) => {
    const { isMenuOpen, dispatch } = useGameContext();

    const handlePlayClick = () => {
        dispatch({ type: "SET_IS_MENU_OPEN", payload: false });
        dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: true });
    }

    return (
        <div className={`${styles.menuDialog} ${(isMenuOpen) ? "" : "hidden"}`}>
            <h4>Info.</h4>
            <h3>Rules:</h3>
            <ul>
                {rules.map((rule, index) => (
                    <li key={index}>{rule}</li>
                ))}
            </ul>
            <div className="flex flex-col items-center">
                <button className="relative" onClick={handlePlayClick}>Play</button>
                <button className="relative">Quit</button>
            </div>
        </div>
    );
};

export default MenuDialog;