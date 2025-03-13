import React, { ReactNode } from 'react';
import styles from './SimpleDialog.module.scss';

const SimpleDialog = ({ children }: { children: ReactNode }) => {

    return (
        <div className={`${styles.simpleDialog} absolute`} data-dialog="simple">
            <h4>Info.</h4>
            <p>{children}</p>
        </div>
    );
};

export default SimpleDialog;