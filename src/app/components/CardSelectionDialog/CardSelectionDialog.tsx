import React, { useState, useEffect } from "react";
import styles from "./CardSelectionDialog.module.scss";
import { useGameContext } from "../../context/GameContext";
import { CardType } from "../../context/GameTypes";
import cardList from "../../../data/cards.json";
import ConfirmationDialog from "../ConfirmationDialog/ConfirmationDialog";
import Card from "../Card/Card";
import playSound from "../../utils/sounds";
import { setAiPlayerCards } from "../../utils/aiCardSelection";
import DialogPagination from "../DialogPagination/DialogPagination";
import textToSprite from "../../utils/textToSprite";
import { generateCardFromId } from "../../utils/general";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import { useCursorNav, markKeyboardNavigation } from "../../hooks/useCursorNav";
import { paginationNav } from "../../hooks/paginationNav";

interface CardSelectionDialogProps {
    showPreview?: boolean;
    showMissingCards?: boolean;
    modifier?: string;
    pagination?: string;
    onCancel?: () => void;
}

const ITEMS_PER_PAGE = 11;

const CardSelectionDialog: React.FC<CardSelectionDialogProps> = ({ showPreview = true, showMissingCards = false, modifier, pagination = "cards", onCancel }) => {
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

    const setCardPreview = (id: number) => {
        const previewValue = !(Object.keys(playerCards).find(cardId => cardId === String(id))) ? null : id;
        dispatch({ type: "SET_PREVIEW_CARD_ID", payload: previewValue });
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

    const isGalleryInstance = pagination === "cardGallery";
    const currentPage = currentPages[pagination];
    const pageItems = Object.entries(cards).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const isItemUnowned = (index: number) => {
        const entry = pageItems[index];
        return !entry || !(Object.keys(playerCards).find(cardId => cardId === entry[0]));
    };

    const { pos, focus, isFocused } = useCursorNav({
        groups: [{ id: "list", size: pageItems.length, isDisabled: isGalleryInstance ? isItemUnowned : undefined }],
        initial: null,
        fallback: { group: "list", index: 0 },
        enabled: isGalleryInstance
            ? isCardGalleryOpen
            : (isCardSelectionOpen && !isCardGalleryOpen && currentPlayerHand.length < 5),
        resolveMove: (current, dir, { wrap }) => {
            if (dir === "left" || dir === "right") {
                paginationNav.flip(pagination, (dir === "left") ? "prev" : "next");
                return "handled";
            }
            const size = pageItems.length;
            if (size === 0) return null;
            const delta = (dir === "down") ? 1 : -1;
            let index = current.index;
            for (let step = 0; step < size; step++) {
                index = wrap(index, delta, size);
                if (!isGalleryInstance || !isItemUnowned(index)) return { group: "list", index };
            }
            return null;
        },
        resolvePageJump: (_, dir) => {
            paginationNav.flip(pagination, (dir === "pageUp") ? "prev" : "next");
            return "handled";
        },
        onFocus: (current) => {
            const entry = pageItems[current.index];
            if (entry) setCardPreview(Number(entry[0]));
        },
        onConfirm: (current) => {
            if (isGalleryInstance) return;
            const entry = pageItems[current.index];
            if (!entry) return;
            const [cardId, quantity] = entry;
            if (currentPlayerHand.length === 4 && cards[Number(cardId)] > 0) {
                // The 5th pick opens the confirmation dialog focused on Yes
                markKeyboardNavigation();
            }
            handleCardSelection(Number(cardId), quantity);
        },
        onCancel: () => {
            if (isGalleryInstance) {
                onCancel?.();
                return;
            }
            if (currentPlayerHand.length > 0) {
                // FF8: cancel takes back the most recently picked card
                const newHand = [...currentPlayerHand];
                const removed = newHand.pop();
                const newCards = { ...currentPlayerCards };
                if (removed) newCards[removed.cardId] = (newCards[removed.cardId] ?? 0) + 1;
                score[1] -= 1;
                playSound("back", isSoundEnabled);
                dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: newHand });
                dispatch({ type: "SET_CURRENT_PLAYER_CARDS", payload: newCards });
                return;
            }
            playSound("back", isSoundEnabled);
            markKeyboardNavigation();
            dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: false });
            dispatch({ type: "SET_IS_MENU_OPEN", payload: true });
        },
    });

    // Keep the preview in sync with the card under the cursor after a page flip
    useEffect(() => {
        if (!pos || pos.group !== "list") return;
        const entry = pageItems[Math.min(pos.index, pageItems.length - 1)];
        if (entry) setCardPreview(Number(entry[0]));
    }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

    const cardContent = (item: { id: number, location: string, player: string, additionalDesc: string }, quantity: number, pageIndex: number) => (
        <div
            key={item.id}
            onClick={() => handleCardSelection(item.id, quantity)}
            onMouseEnter={() => focus({ group: "list", index: pageIndex })}
            data-focused={isFocused("list", pageIndex) && (isGalleryInstance || currentPlayerHand.length < 5)}
            className={`${styles.cardListItem} flex justify-between ${!(Object.keys(playerCards).find(cardId => cardId === String(item.id))) ? "opacity-0" : quantity ? "cursor-pointer" : "opacity-50"}`}
            data-slide-direction={(slideDirection && slideDirection[0] === pagination) ? slideDirection[1] : null}
            style={isCardGalleryOpen ? { zoom: 1.27 } : undefined}
        >
            <div className="flex">
                <img src="https://res.cloudinary.com/dnbsag1cp/image/upload/v1759174757/cardicon_sbsxqu.png" alt="Card Icon" width="18" height="18" className="object-contain mr-3" />
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
                <DialogPagination items={Object.entries(cards)} itemsPerPage={ITEMS_PER_PAGE} renderItem={([cardId, quantity]: [number, number], globalIndex: unknown) =>
                    cardContent({ id: Number(cardId), location: '', player: '', additionalDesc: '' }, quantity, Number(globalIndex) - (currentPage - 1) * ITEMS_PER_PAGE)} pagination={pagination} />

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