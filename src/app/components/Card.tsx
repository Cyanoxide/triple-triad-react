import React from 'react';

interface CardProps {
    id: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
    image: string;
}

const Card: React.FC<CardProps> = ({ id, top, right, bottom, left, image }) => {
    return (
        <div className="card">
            <img src={image} alt={`Card ${id}`} />
            <div className="values">
                <span>{top}</span>
                <span>{right}</span>
                <span>{bottom}</span>
                <span>{left}</span>
            </div>
        </div>
    );
};

export default Card;