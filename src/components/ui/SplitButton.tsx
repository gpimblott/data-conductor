/*
 * DataConductor
 * Copyright (C) 2026
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import styles from './SplitButton.module.css';

interface SplitButtonProps {
    label: React.ReactNode;
    onClick: () => void;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    isLoading?: boolean;
    disabled?: boolean;
}

export const SplitButton: React.FC<SplitButtonProps> = ({
    label,
    onClick,
    children,
    variant = 'primary',
    isLoading = false,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={styles.splitButtonContainer} ref={containerRef}>
            <Button
                variant={variant}
                onClick={onClick}
                isLoading={isLoading}
                disabled={disabled}
                className={styles.mainButton}
            >
                {label}
            </Button>
            <Button
                variant={variant}
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled || isLoading}
                className={styles.toggleButton}
            >
                ▼
            </Button>

            {isOpen && (
                <div className={styles.dropdownMenu} onClick={() => setIsOpen(false)}>
                    {/* We can reuse DropdownItem logic or just render children directly */}
                    {children}
                </div>
            )}
        </div>
    );
};
