/*
 * DataConductor
 * Copyright (C) 2026
 */

import React, { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning' | 'success';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        children,
        className = '',
        variant = 'primary',
        size = 'md',
        isLoading = false,
        fullWidth = false,
        leftIcon,
        rightIcon,
        disabled,
        ...props
    }, ref) => {
        const variantClass = styles[variant];
        const sizeClass = styles[size];
        const widthClass = fullWidth ? styles.fullWidth : '';

        return (
            <button
                ref={ref}
                className={`${styles.button} ${variantClass} ${sizeClass} ${widthClass} ${className}`}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && (
                    <span style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }}>
                        ⟳
                    </span>
                )}
                {!isLoading && leftIcon}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = 'Button';
