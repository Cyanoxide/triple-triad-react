import styles from "./Indicator.module.scss";
import { useGameContext } from "../../context/GameContext";

interface IndicatorProps {
    type: string,
    className?: string,
}

const Indicator: React.FC<IndicatorProps> = ({ type, className }) => {
    const { turn, turnNumber } = useGameContext();

    if (type === "TURN_INDICATOR") {
        return (
            <div className={`${styles.indicatorContainer} ${className?.trim() || ''}`} data-type="turn-indicator" data-turn-number={turnNumber}>
                <div className={styles.indicator}>
                    <div className={styles.indicatorFace}></div>
                    <div className={styles.indicatorFace}></div>
                    <div className={styles.indicatorFace}></div>
                </div>
            </div>
        );
    }

    if (type === "STARTING_PLAYER_INDICATOR") {
        return (
            <div className={`${styles.indicatorContainer} ${className?.trim() || ''}`} data-type="starting-player-indicator" data-starting-player={turn}>
                <div className={styles.indicator}>
                    <div className={styles.indicatorFace}></div>
                    <div className={styles.indicatorFace}></div>
                    <div className={styles.indicatorFace}></div>
                </div>
            </div>
        );
    }
};

export default Indicator