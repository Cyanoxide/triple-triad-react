import React, { useState, useEffect, useRef } from "react";
import styles from "./CardSelectionDialog.module.scss";
import { useGameContext } from "../../context/GameContext";
import { CardType } from "../../context/GameTypes";
import cardList from "../../../data/cards.json";
import ConfirmationDialog from "../ConfirmationDialog/ConfirmationDialog";
import Card from "../Card/Card";
import Image from "next/image";
import playSound from "../../utils/sounds";
import { finishMultiplayer, multiplayer, useMultiplayer } from "../../hooks/multiplayerSession";
import { submitHand } from "../../utils/rooms";
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

    const { session, handSent, room } = useMultiplayer();

    // The random draw is a one-off. Its effect can re-run — the rules arrive
    // over the network, so they can land after the screen has already opened —
    // and without this the second run would deal a second hand.
    const drawnRandomly = useRef(false);

    const cardsTotal = Object.values(playerCards).reduce((acc, quantity) => acc + quantity, 0);
    const [addedStartingCardsFlag, setAddedStartingCardsFlag] = useState(false);
    const [sendFailed, setSendFailed] = useState(false);
    const hasPlayedBefore = localStorage.getItem("playerCards");

    // Random deals the hand, so there is nothing on this screen to use
    const randomDraw = !!session && !!rules?.includes("random") && !isCardGalleryOpen;

    const waitingMessage = !session || isCardGalleryOpen ? null
        : sendFailed ? "Could not send your hand. Try again."
            : handSent ? "Waiting for your opponent..."
                : randomDraw ? "Your hand has been dealt at random..."
                    : null;

    const gameStart = () => {
        /**
         * Against another player nobody deals for anybody: the five cards just
         * chosen are sent, and the opponent sends theirs. The board opens when
         * the room says both are in, which the page watches for — so this stops
         * here rather than starting the game itself.
         */
        if (session) {
            /**
             * The room only takes a hand while it is asking for one. The rules
             * reach this client as soon as it is in the room, which is before
             * the guest has accepted them, so a random draw can be ready to
             * send while the room is still in the lobby — and that submission
             * comes back rejected. Waiting for the phase means the draw sits
             * here until it is wanted instead of being thrown away.
             */
            if (room?.phase !== "hands") return false;

            dispatch({ type: "SET_PLAYER_HAND", payload: hand });
            playSound("spin", isSoundEnabled);
            void submitHand(session.code, session.token, hand.map((card) => card.cardId))
                // Marked only once the room has it. Marking up front meant a
                // rejected hand still showed "waiting for your opponent", with
                // nothing on its way and no way out but a refresh.
                .then(() => multiplayer.markHandSent())
                .catch(() => {
                    playSound("error", isSoundEnabled);
                    setSendFailed(true);
                });
            return true;
        }

        const enemyCards = setAiPlayerCards(enemyId, lostCards, cards);
        dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: false });
        dispatch({ type: "SET_IS_GAME_ACTIVE", payload: true });
        dispatch({ type: "SET_PLAYER_HAND", payload: hand });
        dispatch({ type: "SET_ENEMY_HAND", payload: enemyCards || [] })
        dispatch({ type: "SET_CURRENT_ENEMY_HAND", payload: enemyCards || [] })
        playSound("spin", isSoundEnabled);
        return true;
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
        setSendFailed(false);
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

            /**
             * Backing all the way out of a hand you are choosing for another
             * player means leaving the room — there is no half-way state where
             * you are in a game but not dealing into it.
             *
             * Opening the title menu instead, which is what this used to do
             * whoever was playing, left the screen empty: the app was in
             * multiplayer, so the single player menu it asked for was not
             * rendered and the lobby had already stood aside for the deal.
             */
            if (session) {
                void finishMultiplayer("You left that game.");
                return;
            }

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
    }, [currentPage]);

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
                <Image src="/assets/cardicon.png" alt="Card Icon" width="18" height="18" className="object-contain mr-3" />
                {textToSprite(cardList.find(card => card.id === item.id)?.name || "")}
            </div>
            <div>
                {textToSprite(String(quantity))}
            </div>
        </div >
    );


    useEffect(() => {
        if (rules && rules.includes("random") && isCardSelectionOpen && !drawnRandomly.current) {
            const held = { ...cards };
            const drawable = Object.keys(held).filter((id) => held[Number(id)] > 0);

            /**
             * Bounded rather than "until the hand is full". The draw only counts
             * a card once the selection accepts it, so a collection that cannot
             * fill five — or one that disagrees with what is actually held —
             * used to leave this spinning with the tab locked up.
             */
            while (hand.length < 5 && drawable.length) {
                const index = Math.floor(Math.random() * drawable.length);
                const cardId = Number(drawable[index]);

                handleCardSelection(cardId, held[cardId]);
                held[cardId]--;
                if (held[cardId] <= 0) drawable.splice(index, 1);
            }

            if (hand.length === 5 && gameStart()) drawnRandomly.current = true;
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
    }, [isCardSelectionOpen, rules, room?.phase, currentPlayerCards]);


    return (
        <>
            <div className={`${styles.cardSelectionDialog} cardSelection ${((isCardSelectionOpen || isCardGalleryOpen) && !waitingMessage) ? "" : "hidden"}`} data-dialog={modifier || "cardSelection"}>
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

                {/* Once a hand is away there is nothing to confirm or undo — it
                    is with the other player, so say so rather than offering a
                    button that would send it twice */}
                {!waitingMessage && currentPlayerHand.length === 5 && !isCardGalleryOpen &&
                    <ConfirmationDialog handleConfirmation={handleConfirmation} handleDenial={handleDenial} />}
                {showPreview && previewCardId && <div key={previewCardId} className={`${styles.cardSelectionPreview} absolute`}>
                    <Card id={previewCardId} player="blue" />
                </div>}
            </div>
            {waitingMessage &&
                <SimpleDialog className={styles.handStatus}>
                    {textToSprite(waitingMessage)}
                </SimpleDialog>
            }
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