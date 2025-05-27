import React, { ReactNode } from 'react';
import styles from './SimpleDialog.module.scss';

interface BoardProps {
    className?: string;
    children: ReactNode;
    metaTitle?: string | null;
    dialog?: string;
}

const SimpleDialog: React.FC<BoardProps> = ({ className, children, metaTitle = "info.", dialog = "simple", ...props }) => {

    return (
        <div className={`${styles.simpleDialog} ${className} absolute`} data-dialog={dialog} {...props}>
            {metaTitle && <h4 className={styles.meta} data-sprite={metaTitle}>{metaTitle}</h4>}
            {children}
        </div>
    );
};

export default SimpleDialog;