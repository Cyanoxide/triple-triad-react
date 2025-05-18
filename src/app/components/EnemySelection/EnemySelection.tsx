import { useEffect, useState } from "react";
import styles from "./EnemySelection.module.scss";
import { useGameContext } from "../../context/GameContext";
import players from "../../../data/players.json";
import ruleSets from "../../../data/ruleSets.json";
import tradeRules from "../../../data/rules.json";
import DialogPagination from "../DialogPagination/DialogPagination";
import textToSprite from "../../utils/textToSprite";

const EnemySelectionDialog = () => {
    const { isMenuOpen, currentPages, slideDirection, lostCards, playerCards, dispatch } = useGameContext();
    const [lostCardMap, setLostCardMap] = useState<{ [id: string]: boolean }>({});

    useEffect(() => {
        const enemyId = currentPages.players;
        if (!enemyId) return;

        dispatch({ type: "SET_ENEMY_ID", payload: enemyId });

        if (!(enemyId in players)) return;
        const enemy = players[enemyId - 1];
        const ruleSet = enemy.rules;

        if (ruleSet && ruleSet in ruleSets) {
            dispatch({ type: "SET_RULES", payload: ruleSets[ruleSet as keyof typeof ruleSets] || [] });

            const tradeRuleKeys = Object.keys(tradeRules.tradeRules);
            dispatch({ type: "SET_TRADE_RULE", payload: tradeRuleKeys[Math.floor(Math.random() * tradeRuleKeys.length)] });
        }

    }, [currentPages.players]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const lostCardsJSON = localStorage.getItem("lostCards");
        const currentLostCards = lostCardsJSON ? JSON.parse(lostCardsJSON) : lostCards;

        const map: { [id: string]: boolean } = {};
        for (const playerId in currentLostCards) {
            if (currentLostCards[playerId]) {
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
            <div key={item.id} data-slide-direction={slideDirection}>
                <p className="opacity-50">{textToSprite(item.location, undefined, true)}</p>
                <p>{textToSprite(item.player, color, true)}</p>
                {/* <p className="italic">{textToSprite(item.additionalDesc)}</p> */}
            </div>
        );
    };

    return (
        <div className={`${styles.enemySelectionDialog} ${isMenuOpen ? "" : "hidden"} top-[80%]`}>
            <h4 className={styles.meta} data-sprite="players">Players</h4>
            <DialogPagination items={players} itemsPerPage={1} renderItem={playerContent} pagination="players" />
        </div>
    );
};

export default EnemySelectionDialog;