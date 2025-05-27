import React from 'react';
import styles from './CardValues.module.scss';
import cards from '../../../data/cards.json';

interface CardProps {
    cardId: number;
    isGallery?: boolean;
}

const Card: React.FC<CardProps> = ({ cardId, isGallery = false }) => {
    const card = cards.find(card => card.id === cardId);

    const renderCardValue = (number: number) => (number === 10) ? "A" : number;

    if (!card) return;

    return (
        <div className={`${(isGallery) ? styles.galleryValues : styles.values} relative`}>
            <span className={`${styles.topValue} absolute text-center`} data-sprite={card.top}>{renderCardValue(card.top)}</span>
            <span className={`${styles.rightValue} rightValue absolute text-center`} data-sprite={card.right}>{renderCardValue(card.right)}</span>
            <span className={`${styles.bottomValue} bottomValue absolute text-center`} data-sprite={card.bottom}>{renderCardValue(card.bottom)}</span>
            <span className={`${styles.leftValue} leftValue absolute text-center`} data-sprite={card.left}>{renderCardValue(card.left)}</span>
        </div>
    );
};

export default Card;