import React, { useState, useEffect } from "react";
import styles from "./CardSelectionDialog.module.scss";
import { useGameContext } from "../../context/GameContext";
import { CardType } from "../../context/GameTypes";
import cardList from "../../../data/cards.json";
import ConfirmationDialog from "../ConfirmationDialog/ConfirmationDialog";
import Card from "../Card/Card";
import Image from "next/image";
import playSound from "../../utils/sounds";
import { setAiPlayerCards } from "../../utils/aiCardSelection";
import DialogPagination from "../DialogPagination/DialogPagination";
import textToSprite from "../../utils/textToSprite";
import { generateCardFromId } from "../../utils/general";
import SimpleDialog from "../SimpleDialog/SimpleDialog";

interface CardSelectionDialogProps {
    showPreview?: boolean;
    showMissingCards?: boolean;
    modifier?: string;
    pagination?: string;
}

const CardSelectionDialog: React.FC<CardSelectionDialogProps> = ({ showPreview = true, showMissingCards = false, modifier, pagination = "cards" }) => {
    const { playerCards, currentPlayerCards, previewCardId, currentPlayerHand, enemyId, lostCards, score, isCardSelectionOpen, isCardGalleryOpen, isSoundEnabled, currentPages, slideDirection, rules, dispatch } = useGameContext();

    const hand: CardType[] = [...currentPlayerHand];
    const allCards: Record<number, number> = Object.fromEntries(
        cardList.map(card => [card.id, 0])
    );
    const cards: Record<number, number> = { ...currentPlayerCards };

    if (showMissingCards) {
        for (const id of Object.keys(allCards)) {
            if (!(id in cards)) {
                cards[Number(id)] = 0;
            }
        }
    }

    const cardsTotal = Object.values(playerCards).reduce((acc, quantity) => acc + quantity, 0);
    const [addedStartingCardsFlag, setAddedStartingCardsFlag] = useState(false);
    const hasPlayedBefore = localStorage.getItem("playerCards");

    const gameStart = () => {
        const enemyCards = setAiPlayerCards(enemyId, lostCards, cards);
        dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: false });
        dispatch({ type: "SET_IS_GAME_ACTIVE", payload: true });
        dispatch({ type: "SET_PLAYER_HAND", payload: hand });
        dispatch({ type: "SET_ENEMY_HAND", payload: enemyCards || [] })
        dispatch({ type: "SET_CURRENT_ENEMY_HAND", payload: enemyCards || [] })
        playSound("spin", isSoundEnabled);
    }

    const handleCardSelection = (cardId: number, quantity: number) => {
        if (isCardGalleryOpen) return;

        if (cards[cardId] > 0 && hand.length < 5) {
            const card = generateCardFromId(cardId, "blue");
            if (card) hand.push(card);

            score[1] += 1;
            cards[cardId] -= 1;
        }
        if (currentPlayerHand.length < 5) {
            const sound = (quantity) ? "place" : "error";
            playSound(sound, isSoundEnabled);
        }

        dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: hand });
        dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: cards });
    }

    const handleCardHover = (id: number) => {
        const previewValue = !(Object.keys(playerCards).find(cardId => cardId === String(id))) ? null : id;
        dispatch({ type: "SET_PREVIEW_CARD_ID", payload: previewValue });

        if (currentPlayerHand.length < 5) playSound("select", isSoundEnabled);
    };

    const handleConfirmation = () => {
        playSound("select", isSoundEnabled);
        gameStart();
    }

    const handleDenial = () => {
        hand.length = 0;
        score[1] = 0;

        playSound("back", isSoundEnabled);

        dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: hand });
        dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: playerCards });
    }

    const cardContent = (item: { id: number, location: string, player: string, additionalDesc: string }, quantity: number) => (
        <div
            key={item.id}
            onClick={() => handleCardSelection(item.id, quantity)}
            onMouseEnter={() => handleCardHover(item.id)}
            className={`${styles.cardListItem} flex justify-between ${!(Object.keys(playerCards).find(cardId => cardId === String(item.id))) ? "opacity-0" : quantity ? "cursor-pointer" : "opacity-50"}`}
            data-slide-direction={(slideDirection && slideDirection[0] === pagination) ? slideDirection[1] : null}
            style={isCardGalleryOpen ? { zoom: 1.27 } : undefined}
        >
            <div className="flex">
                <Image src="/assets/cardicon.png" alt="Card Icon" width="18" height="18" className="object-contain mr-3" />
                {textToSprite(cardList.find(card => card.id === item.id)?.name || "")}
            </div>
            <div>
                {textToSprite(String(quantity))}
            </div>
        </div >
    );


    useEffect(() => {
        if (rules && rules.includes("random") && isCardSelectionOpen) {
            const currentPlayerCards = { ...playerCards };

            while (hand.length < 5) {
                const cardIdIndex = Math.floor(Math.random() * Object.keys(currentPlayerCards).length);
                const cardId: number = Number(Object.keys(currentPlayerCards)[cardIdIndex]);

                if (currentPlayerCards[cardId] > 0) {
                    handleCardSelection(cardId, currentPlayerCards[cardId]);
                    currentPlayerCards[cardId]--;
                }
            }
            gameStart();
        }


        if (cardsTotal < 5 && !isCardGalleryOpen) {
            const startingCardIds = [1, 2, 3, 4, 5, 6, 7];

            const newCards = { ...playerCards };
            startingCardIds.forEach((cardId) => {
                newCards[cardId] = 1;
            });

            dispatch({ type: "SET_PLAYER_CARDS", payload: newCards });
            dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: newCards });
            if (typeof window !== "undefined") {
                localStorage.setItem("playerCards", JSON.stringify(newCards));
            }

            setAddedStartingCardsFlag(true)
            setTimeout(() => {
                setAddedStartingCardsFlag(false);
            }, 3000);
        }
    }, [isCardSelectionOpen]);


    return (
        <>
            <div className={`${styles.cardSelectionDialog} cardSelection ${(isCardSelectionOpen || isCardGalleryOpen) ? "" : "hidden"}`} data-dialog={modifier || "cardSelection"}>
                <div className="flex justify-between">
                    <h4 className={styles.meta} data-sprite="cards">Cards
                        <span className={`${styles.meta} ml-2 ${(Object.entries(playerCards).length > 1) ? "" : "hidden"}`.trim()} data-sprite="p.">P.
                            <span className={`${styles.meta} ml-1`} data-sprite={currentPages[pagination]}>{currentPages[pagination]}</span>
                        </span>
                    </h4>
                    <h4 className={`${styles.meta} mr-3`} data-sprite="num.">Num.</h4>
                </div>
                <DialogPagination items={Object.entries(cards)} itemsPerPage={11} renderItem={([cardId, quantity]: [number, number]) =>
                    cardContent({ id: Number(cardId), location: '', player: '', additionalDesc: '' }, quantity)} pagination={pagination} />

                {currentPlayerHand.length === 5 && !isCardGalleryOpen && <ConfirmationDialog handleConfirmation={handleConfirmation} handleDenial={handleDenial} />}
                {showPreview && previewCardId && <div key={previewCardId} className={`${styles.cardSelectionPreview} absolute`}>
                    <Card id={previewCardId} player="blue" />
                </div>}
            </div>
            {hasPlayedBefore && addedStartingCardsFlag && !isCardGalleryOpen &&
                <SimpleDialog>
                    <div className="mb-2">{textToSprite("You don't have enough cards to play.")}</div>
                    <div>{textToSprite("Starting cards have been re-added to your deck.")}</div>
                </SimpleDialog>
            }
        </>
    );
};

export default CardSelectionDialog;