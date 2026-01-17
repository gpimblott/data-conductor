/*
 * DataConductor
 * Copyright (C) 2026
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './AlertModal.module.css';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
}

export default function AlertModal({ isOpen, title, message, type = 'info', onClose, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel' }: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    let Icon = AlertCircle;
    let iconColor = '#3b82f6'; // blue default

    if (type === 'success') {
        Icon = CheckCircle;
        iconColor = '#22c55e';
    } else if (type === 'error') {
        Icon = XCircle;
        iconColor = '#ef4444';
    }

    const modalContent = (
        <div className={styles.overlay}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Icon color={iconColor} size={24} />
                        <h2>{title}</h2>
                    </div>
                </div>
                <div className={styles.body}>
                    {message}
                </div>
                <div className={styles.footer}>
                    {onConfirm ? (
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'transparent',
                                    border: '1px solid #404040',
                                    color: '#a3a3a3',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: '#ef4444',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                {confirmText}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.5rem 1.5rem',
                                background: '#262626',
                                border: '1px solid #404040',
                                color: '#e5e5e5',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
