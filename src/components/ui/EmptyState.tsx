/*
 * DataConductor
 * Copyright (C) 2026
 */

import React, { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: ReactNode;
    action?: ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon,
    action,
    className = ''
}) => {
    return (
        <div className={`${styles.container} ${className}`}>
            {icon && <div className={styles.icon}>{icon}</div>}
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
            {action && <div className={styles.action}>{action}</div>}
        </div>
    );
};
