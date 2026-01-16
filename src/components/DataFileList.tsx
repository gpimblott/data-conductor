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

import React, { useState } from 'react';
import { useConnectionFiles } from '@/hooks/useConnections';
import DataViewerModal from './DataViewerModal';

interface DataFileListProps {
    connectionId: string;
    limit?: number;
}

export default function DataFileList({ connectionId, limit }: DataFileListProps) {
    const { files, isLoading, refreshFiles } = useConnectionFiles(connectionId);
    const [selectedFile, setSelectedFile] = useState<{ id: string, name: string } | null>(null);

    const displayFiles = limit ? files.slice(0, limit) : files;

    // Format bytes to human readable size
    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (isLoading) {
        return <div style={{ color: '#a3a3a3', padding: '1rem' }}>Loading files...</div>;
    }

    if (files.length === 0) {
        return <div style={{ color: '#737373', padding: '1rem', fontStyle: 'italic' }}>No data retrieved yet. Run a sync to fetch data.</div>;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button
                    onClick={refreshFiles}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#3b82f6',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}
                >
                    Refresh List
                </button>
            </div>

            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {displayFiles.map(file => {
                    const fileName = file.filePath.split(/[\\/]/).pop();
                    return (
                        <div
                            key={file.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#171717',
                                border: '1px solid #262626',
                                padding: '0.75rem 1rem',
                                borderRadius: '6px'
                            }}
                        >
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ color: '#e5e5e5', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {fileName}
                                </div>
                                <div style={{ color: '#737373', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                    {new Date(file.createdAt).toLocaleString()} • {formatSize(file.fileSize)}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedFile({ id: file.id, name: fileName })}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    background: '#262626',
                                    border: '1px solid #404040',
                                    borderRadius: '4px',
                                    color: '#d4d4d4',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    marginLeft: '1rem'
                                }}
                            >
                                View Content
                            </button>
                        </div>
                    );
                })}
            </div>

            <DataViewerModal
                isOpen={!!selectedFile}
                onClose={() => setSelectedFile(null)}
                connectionId={connectionId}
                fileId={selectedFile?.id || null}
                fileName={selectedFile?.name || ''}
            />
        </div>
    );
}
