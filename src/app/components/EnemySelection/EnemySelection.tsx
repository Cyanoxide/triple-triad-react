import { useEffect, useState } from "react";
import styles from "./EnemySelection.module.scss";
import { useGameContext } from "../../context/GameContext";
import locations from "../../../data/locations.json";
import players from "../../../data/players.json";
import ruleSets from "../../../data/ruleSets.json";
import tradeRules from "../../../data/rules.json";
import DialogPagination from "../DialogPagination/DialogPagination";
import textToSprite from "../../utils/textToSprite";

const EnemySelectionDialog = () => {
    const { isMenuOpen, currentPages, slideDirection, lostCards, playerCards, dispatch } = useGameContext();
    const [lostCardMap, setLostCardMap] = useState<{ [id: string]: boolean }>({});

    const filteredPlayers = players.filter(player => player.location === locations[currentPages.locations - 1].location && player.active);

    useEffect(() => {
        const enemy = filteredPlayers[currentPages.players - 1];
        if (!enemy) return;
        dispatch({ type: "SET_ENEMY_ID", payload: enemy.id });

        if (enemy.rules in ruleSets) {
            dispatch({ type: "SET_RULES", payload: ruleSets[enemy.rules as keyof typeof ruleSets] || [] });

            const tradeRuleKeys = Object.keys(tradeRules.tradeRules);
            dispatch({ type: "SET_TRADE_RULE", payload: tradeRuleKeys[Math.floor(Math.random() * tradeRuleKeys.length)] });
        }

    }, [currentPages.players, currentPages.locations]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const lostCardsJSON = localStorage.getItem("lostCards");
        const currentLostCards = lostCardsJSON ? JSON.parse(lostCardsJSON) : lostCards;

        const map: { [id: string]: boolean } = {};
        for (const playerId in currentLostCards) {
            if (currentLostCards[playerId].length) {
                map[playerId] = true;
            }
        }
        setLostCardMap(map);
    }, []);

    const playerContent = (item: { id: string, location: string, player: string, additionalDesc: string, rareCard: number }) => {
        let color: string | undefined = undefined;

        if (lostCardMap[item.id]) {
            color = "yellow";
        } else if (item.rareCard && !Object.keys(playerCards).includes(String(item.rareCard))) {
            color = "blue";
        }

        return (
            <div key={item.id} data-slide-direction={(slideDirection && ["players", "locations"].includes(slideDirection[0])) ? slideDirection[1] : null}>
                <p>{textToSprite(item.player, color, true)}</p>
                <p className="opacity-50">{textToSprite(item.additionalDesc, "white", true)}</p>
            </div>
        );
    };

    return (
        <div className={`${styles.enemySelectionDialog} ${isMenuOpen ? "" : "hidden"} top-[80%]`}>
            <h4 className={styles.meta} data-sprite="players">Players</h4>
            <DialogPagination items={filteredPlayers} itemsPerPage={1} renderItem={playerContent} pagination="players" />
        </div>
    );
};

export default EnemySelectionDialog;