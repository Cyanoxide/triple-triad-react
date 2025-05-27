import Image from "next/image";
import styles from './CardGallery.module.scss';
import { useGameContext } from "../../context/GameContext";
import Card from '../Card/Card';
import cards from '../../../data/cards.json';
import players from '../../../data/players.json';
import textToSprite from "../../utils/textToSprite";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import CardSelectionDialog from "../CardSelectionDialog/CardSelectionDialog";
import CardValues from "../CardValues/CardValues";

const CardGallery = () => {
    const { playerCards, currentPlayerCards, previewCardId, currentPages, lostCards } = useGameContext();

    const previewCardData = cards.find(card => card.id === previewCardId);
    let previewCardLocation;

    if (previewCardId && !(previewCardId in currentPlayerCards) && (previewCardId > 78 || previewCardId === 48)) {
        const lostCardPlayerId = Object.entries(lostCards).find(([, cardIds]) => cardIds.includes(previewCardId))?.[0];
        const lostCardPlayer = players.find(player => player.id === Number(lostCardPlayerId));
        const rareCardPlayer = players.find(player => player.rareCard === previewCardId);

        previewCardLocation = (lostCardPlayerId) ? textToSprite(lostCardPlayer!.location, "yellow") : (rareCardPlayer) ? textToSprite(rareCardPlayer!.location, "blue") : null;
    }

    const cardTotals = {
        monster: Object.entries(playerCards).filter(([id]) => Number(id) <= 55).length,
        boss: Object.entries(playerCards).filter(([id]) => Number(id) >= 56 && Number(id) <= 77).length,
        gf: Object.entries(playerCards).filter(([id]) => Number(id) >= 78 && Number(id) <= 99).length,
        player: Object.entries(playerCards).filter(([id]) => Number(id) >= 100).length,
        total: Object.entries(playerCards).length
    }

    const titleType = currentPages.cardGallery < 6 ? "Monster" : currentPages.cardGallery < 8 ? "Boss" : currentPages.cardGallery < 10 ? "GF" : "Player";
    const currentPageTitle = `Level ${currentPages.cardGallery} ${titleType} Cards`;

    return (
        <div className={`${styles.cardGalleryContainer} flex flex-col items-center justify-center top-0 z-10 w-screen h-screen`}>
            <div className="m-20 relative h-full flex flex-col justify-center">
                <div className="flex w-full gap-1 p-1">
                    <SimpleDialog className={styles.currentPageTitle} metaTitle={"help"}><p>{textToSprite(`${currentPageTitle}`)}</p></SimpleDialog>
                    <SimpleDialog className={styles.galleryTitle} metaTitle={null}><p className="flex">{textToSprite("Card")}<span className={(cardTotals.total === 110) ? "" : "hidden"}>⭐️</span></p></SimpleDialog>
                </div>
                <div className="flex justify-between gap-1 my-1">
                    <div className="w-1/2 ml-4">
                        <CardSelectionDialog showPreview={false} showMissingCards={true} modifier="card-gallery" pagination="cardGallery" />
                    </div>
                    <div className="w-1/2 mr-4 flex flex-col gap-1">
                        <SimpleDialog className={`${styles.cardDetails} flex justify-between`} metaTitle={null}>
                            <div className={`${(previewCardData) ? "" : "invisible"} flex flex-col justify-between`}>
                                {previewCardId && <CardValues cardId={previewCardId} isGallery={true} />}
                                <div>
                                    <p>{textToSprite("Elemental")}</p>
                                    <p className="ml-2 mt-2">{textToSprite(previewCardData?.element ? previewCardData.element.charAt(0).toUpperCase() + previewCardData.element.slice(1) : "N/A")}</p>
                                </div>
                            </div>
                            {previewCardData && <Card id={previewCardData?.id} player="blue" displayValues={false} /> || <Image src="/assets/cardback.png" alt="Card Back" height={163} width={128} />}
                        </SimpleDialog>
                        <SimpleDialog className={`${styles.cardStatistics} flex flex-col justify-between`} metaTitle={null}>
                            <p className="flex justify-between"><span>{textToSprite("MONSTER")}</span><span>{textToSprite(`${cardTotals.monster}`)}</span></p>
                            <p className="flex justify-between"><span>{textToSprite("BOSS")}</span><span>{textToSprite(`${cardTotals.boss}`)}</span></p>
                            <p className="flex justify-between"><span>{textToSprite("GF")}</span><span>{textToSprite(`${cardTotals.gf}`)}</span></p>
                            <p className="flex justify-between"><span>{textToSprite("PLAYER")}</span><span>{textToSprite(`${cardTotals.player}`)}</span></p>
                            <p className="flex justify-between"><span>{textToSprite("TOTAL")}</span><span>{textToSprite(`${cardTotals.total}`)}</span></p>
                        </SimpleDialog>
                    </div>
                </div >
                <div className="flex w-full p-1">
                    <SimpleDialog className={styles.selectedCardMeta} metaTitle={null}>
                        <div className="flex justify-between">
                            <p>{previewCardData && (previewCardLocation) ? textToSprite("AREA") : textToSprite(titleType.toUpperCase())}</p>
                            <p>{previewCardData && (previewCardLocation) ? previewCardLocation : textToSprite(previewCardData?.name || "")}</p>
                        </div>
                    </SimpleDialog>
                </div>
            </div>
        </div>
    );
};

export default CardGallery;