/*
 * DataConductor
 * Copyright (C) 2026
 */

import React from 'react';
import Link from 'next/link';
import styles from './Breadcrumb.module.css';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
    return (
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <div key={index} className={styles.item}>
                        {item.href && !isLast ? (
                            <Link href={item.href} className={styles.link}>
                                {item.label}
                            </Link>
                        ) : (
                            <span className={isLast ? styles.current : styles.link}>
                                {item.label}
                            </span>
                        )}
                        {!isLast && (
                            <span className={styles.separator} aria-hidden="true">
                                /
                            </span>
                        )}
                    </div>
                );
            })}
        </nav>
    );
};
