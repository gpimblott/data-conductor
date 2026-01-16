/*
 * DataConductor
 * Copyright (C) 2026
 */

import React, { HTMLAttributes } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    noPadding?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ children, className = '', noPadding = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`${styles.card} ${noPadding ? styles.noPadding : ''} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';
