import styles from './MenuDialog.module.scss';
import { useGameContext } from "../../context/GameContext";
import playSound from "../../utils/sounds";
import EnemySelectionDialog from '../EnemySelection/EnemySelection';
import textToSprite from '../../utils/textToSprite';
import rulesList from "../../../data/rules.json";

interface MenuProps {
    rules: string[];
    tradeRules: string[];
}

const MenuDialog: React.FC<MenuProps> = ({ rules, tradeRules }) => {
    const { isMenuOpen, isSoundEnabled, dispatch } = useGameContext();

    const handlePlayClick = () => {
        dispatch({ type: "SET_IS_MENU_OPEN", payload: false });
        dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: true });
        playSound("select", isSoundEnabled);
    }

    const handleQuitClick = () => {
        playSound("error", isSoundEnabled);
    }

    const handleMouseEnter = () => {
        playSound("select", isSoundEnabled);
    }

    return (
        <>
            <div className={`${styles.menuDialog} ${(isMenuOpen) ? "" : "hidden"}`}>
                <h4 className={styles.meta} data-sprite="info.">Info.</h4>
                <p>{textToSprite("Rules:")}</p>
                <ul>
                    {rules.map((rule: string, index) => (
                        <li key={index}><span>{textToSprite(rulesList.rules[rule as keyof typeof rulesList.rules])}</span></li>
                    ))}
                </ul>
                <ul>
                    {tradeRules.map((rule: string, index) => (
                        <li key={index}><span>{textToSprite(`Trade Rule: ${rulesList.tradeRules[rule as keyof typeof rulesList.tradeRules]}`)}</span></li>
                    ))}
                </ul>
                <div className="flex flex-col items-center">
                    <button className="relative" onClick={handlePlayClick} onMouseEnter={handleMouseEnter}>{textToSprite("Play")}</button>
                    <button className="relative" onClick={handleQuitClick} onMouseEnter={handleMouseEnter}>{textToSprite("Quit")}</button>
                </div>
            </div >
            <EnemySelectionDialog />
        </>
    );
};

export default MenuDialog;