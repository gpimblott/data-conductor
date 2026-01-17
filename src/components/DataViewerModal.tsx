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

import React, { useState, useEffect } from 'react';

interface DataViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    connectionId: string;
    fileId: string | null;
    fileName: string;
    entityType?: 'connection' | 'pipeline';
}

export default function DataViewerModal({ isOpen, onClose, connectionId, fileId, fileName, entityType = 'connection' }: DataViewerModalProps) {
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && connectionId && fileId) {
            fetchContent();
        } else {
            setContent('');
            setError(null);
        }
    }, [isOpen, connectionId, fileId]);

    const fetchContent = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const baseUrl = '/api/pipelines';
            const res = await fetch(`${baseUrl}/${connectionId}/files/${fileId}`);
            if (!res.ok) throw new Error('Failed to fetch content');
            const text = await res.text();
            setContent(text);
        } catch (err) {
            setError('Failed to load file content.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
        }}>
            <div style={{
                background: '#0a0a0a',
                border: '1px solid #262626',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '900px',
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #262626',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>
                        File Viewer: <span style={{ color: '#a3a3a3', fontWeight: 400 }}>{fileName}</span>
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#a3a3a3',
                            fontSize: '1.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: '#171717' }}>
                    {isLoading ? (
                        <div style={{ color: '#a3a3a3', textAlign: 'center', marginTop: '2rem' }}>Loading content...</div>
                    ) : error ? (
                        <div style={{ color: '#ef4444', textAlign: 'center', marginTop: '2rem' }}>{error}</div>
                    ) : (
                        <pre style={{
                            margin: 0,
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            color: '#e5e5e5',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                        }}>
                            {content}
                        </pre>
                    )}
                </div>

                <div style={{
                    padding: '1rem',
                    borderTop: '1px solid #262626',
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#262626',
                            color: '#fff',
                            border: '1px solid #404040',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
