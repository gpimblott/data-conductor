/*
 * DataConductor
 * Copyright (C) 2026
 */

import React, { useState, useRef, useEffect } from 'react';
import styles from './Dropdown.module.css';
import { Button } from './Button';

interface DropdownProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
    align?: 'left' | 'right';
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, children, align = 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
        <div className={styles.dropdown} ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

            {isOpen && (
                <div className={styles.menu} style={{ [align]: 0 }}>
                    {React.Children.map(children, child => {
                        // In case we need to pass props or close on click
                        if (React.isValidElement(child) && child.type === DropdownItem) {
                            return React.cloneElement(child as React.ReactElement<any>, {
                                onClick: (...args: any[]) => {
                                    (child.props as any).onClick?.(...args);
                                    setIsOpen(false);
                                }
                            });
                        }
                        return child;
                    })}
                </div>
            )}
        </div>
    );
};

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'danger';
    icon?: React.ReactNode;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({ children, className = '', variant = 'default', icon, ...props }) => {
    return (
        <button
            className={`${styles.item} ${variant === 'danger' ? styles.danger : ''} ${className}`}
            {...props}
        >
            {icon && <span style={{ marginRight: '0.5rem', width: '1.25rem', textAlign: 'center' }}>{icon}</span>}
            {children}
        </button>
    );
};

export const DropdownSeparator: React.FC = () => <div className={styles.separator} />;

interface DropdownTriggerProps extends React.ComponentProps<typeof Button> { }
// Just a helper to use Button as trigger easily
export const DropdownTrigger = Button;
