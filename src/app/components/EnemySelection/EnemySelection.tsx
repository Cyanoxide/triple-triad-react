import { useEffect } from "react";
import styles from './EnemySelection.module.scss';
import { useGameContext } from "../../context/GameContext";
import players from '../../../data/players.json';
import DialogPagination from '../DialogPagination/DialogPagination';
import textToSprite from "../../utils/textToSprite";

const EnemySelectionDialog = () => {
    const { isMenuOpen, currentPages, slideDirection, dispatch } = useGameContext();

    useEffect(() => {
        dispatch({ type: "SET_ENEMY_ID", payload: currentPages.players });
    }, [currentPages.players])

    const playerContent = (item: { id: string, location: string, player: string, additionalDesc: string }) => (
        <div key={item.id} data-slide-direction={slideDirection}>
            <p className="opacity-50">{textToSprite(item.location, undefined, true)}</p>
            <p>{textToSprite(item.player, undefined, true)}</p>
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