import styles from "./Indicator.module.scss";
import { useGameContext } from "../../context/GameContext";
import Image from "next/image";

interface IndicatorProps {
    type: string,
    className?: string,
}

const Indicator: React.FC<IndicatorProps> = ({ type, className }) => {
    const { turn, turnNumber } = useGameContext();

    if (type === "TURN_INDICATOR") {
        return (
            <div className={`${styles.indicatorContainer} ${className || ""}`.trim()} data-type="turn-indicator" data-turn-number={turnNumber}>
                <Image src="/assets/indicator.gif" alt="turn indicator" width="55" height="55" />
            </div>
        );
    }

    if (type === "STARTING_PLAYER_INDICATOR") {
        return (
            <div className={`${styles.indicatorContainer} ${className || ""}`.trim()} data-type="starting-player-indicator" data-starting-player={turn}>
                <Image src="/assets/indicator.gif" alt="turn indicator" width="55" height="55" />
            </div>
        );
    }
};

export default Indicator