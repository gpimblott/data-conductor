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
import styles from './AlertModal.module.css'; // Reusing Alert styles for consistency
import { HelpCircle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className={styles.overlay}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <HelpCircle color="#eab308" size={24} />
                        <h2>{title}</h2>
                    </div>
                </div>
                <div className={styles.body}>
                    {message}
                </div>
                <div className={styles.footer} style={{ gap: '0.75rem' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'transparent',
                            border: '1px solid #404040',
                            color: '#a3a3a3',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#2563eb',
                            border: 'none',
                            color: '#e5e5e5',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
