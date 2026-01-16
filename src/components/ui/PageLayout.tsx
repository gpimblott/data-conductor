/*
 * DataConductor
 * Copyright (C) 2026
 */

import React, { HTMLAttributes } from 'react';
import styles from './PageLayout.module.css';

interface PageLayoutProps extends HTMLAttributes<HTMLDivElement> { }

export const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
    ({ children, className = '', ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`${styles.container} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

PageLayout.displayName = 'PageLayout';
