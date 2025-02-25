import React from 'react';
import styles from './Hand.module.scss';

interface HandProps {
    className?: string;
}

const Hand: React.FC<HandProps> = ({ className }) => {
    return (
        <div className={`${styles.hand} ${className || ''}`.trim()}>
            <div className="item"><div className="content">1</div></div>
            <div className="item"><div className="content">2</div></div>
            <div className="item"><div className="content">3</div></div>
            <div className="item"><div className="content">4</div></div>
            <div className="item"><div className="content">5</div></div>
        </div>
    );
};

export default Hand;