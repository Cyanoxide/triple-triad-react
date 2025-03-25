import { useEffect } from "react";
import styles from './EnemySelection.module.scss';
import { useGameContext } from "../../context/GameContext";
import players from '../../../data/players.json';
import DialogPagination from '../DialogPagination/DialogPagination';

const EnemySelectionDialog = () => {
    const { isMenuOpen, currentPages, slideDirection, dispatch } = useGameContext();

    useEffect(() => {
        dispatch({ type: "SET_ENEMY_ID", payload: currentPages.players });
    }, [currentPages.players])

    const playerContent = (item: { id: string, location: string, player: string, additionalDesc: string }) => (
        <div key={item.id} data-slide-direction={slideDirection}>
            <p className="opacity-50">{item.location}</p>
            <p>{item.player}</p>
            {/* <p className="italic">{item.additionalDesc}</p> */}
        </div>
    );

    return (
        <div className={`${styles.enemySelectionDialog} ${(isMenuOpen) ? "" : "hidden"} top-[80%]`}>
            <h4>Players</h4>
            <DialogPagination items={players} itemsPerPage={1} renderItem={playerContent} pagination="players" />
        </div>
    );
};

export default EnemySelectionDialog;