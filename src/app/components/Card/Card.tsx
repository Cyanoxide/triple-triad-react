import React from 'react';
import styles from './Card.module.scss';

interface CardProps {
    id: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
    image: string;
    player: "red" | "blue";
}

const Card: React.FC<CardProps> = ({ id, top, right, bottom, left, image, player }) => {
    return (
        <div className={styles.card} data-player={player} draggable="true">
            {/* <img src={image} alt={`Card ${id}`} /> */}
            <div className={`${styles.values} relative`}>
                <span className={`${styles.topValue} absolute text-center`}>{top}</span>
                <span className={`${styles.rightValue} rightValue absolute text-center`}>{right}</span>
                <span className={`${styles.bottomValue} bottomValue absolute text-center`}>{bottom}</span>
                <span className={`${styles.leftValue} leftValue absolute text-center`}>{left}</span>
            </div>
        </div>
    );
};

export default Card;