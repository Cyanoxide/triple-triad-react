import React from 'react';
import styles from './Hand.module.scss';

const Hand: React.FC = () => {
    return (
        <div className={styles.hand}>
            <div className="item"><div className="content">1</div></div>
            <div className="item"><div className="content">2</div></div>
            <div className="item"><div className="content">3</div></div>
            <div className="item"><div className="content">4</div></div>
            <div className="item"><div className="content">5</div></div>
        </div>
    );
};

export default Hand;