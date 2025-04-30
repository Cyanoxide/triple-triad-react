import { useEffect } from "react";
import styles from './EnemySelection.module.scss';
import { useGameContext } from "../../context/GameContext";
import players from '../../../data/players.json';
import DialogPagination from '../DialogPagination/DialogPagination';
import textToSprite from "../../utils/textToSprite";

const EnemySelectionDialog = () => {
    const { isMenuOpen, currentPages, slideDirection, lostCards, dispatch } = useGameContext();

    useEffect(() => {
        dispatch({ type: "SET_ENEMY_ID", payload: currentPages.players });
    }, [currentPages.players]);


    const hasLostCard = (enemyPlayer: { id: string }) => {
        if (typeof window === "undefined") return;
        
        const lostCardsJSON = localStorage.getItem("lostCards");
        const currentLostCards = (lostCardsJSON) ? JSON.parse(lostCardsJSON) : lostCards;

        if (enemyPlayer.id && currentLostCards[enemyPlayer.id]) return true;

        return false;
    }

    const playerContent = (item: { id: string, location: string, player: string, additionalDesc: string, rareCard: number }) => (
        <div key={item.id} data-slide-direction={slideDirection}>
            <p className="opacity-50">{textToSprite(item.location, undefined, true)}</p>
            <p>{textToSprite(item.player, (hasLostCard(item)) ? "yellow" : (item.rareCard) ? "blue" : undefined, true)}</p>
            {/* <p className="italic">{textToSprite(item.additionalDesc)}</p> */}
        </div>
    );

    return (
        <div className={`${styles.enemySelectionDialog} ${(isMenuOpen) ? "" : "hidden"} top-[80%]`}>
            <h4 className={styles.meta} data-sprite="players">Players</h4>
            <DialogPagination items={players} itemsPerPage={1} renderItem={playerContent} pagination="players" />
        </div>
    );
};

export default EnemySelectionDialog;