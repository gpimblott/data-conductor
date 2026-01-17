
import React, { useState, useEffect } from 'react';
import DataViewerModal from '../DataViewerModal';
import { EmptyState } from '../ui/EmptyState';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface FileItem {
    id: string;
    executionId: string;
    nodeId: string;
    createdAt: string;
    filePath: string;
    fileSize: number;
}

interface Props {
    pipelineId: string;
}

export default function PipelineFilesPanel({ pipelineId }: Props) {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState<{ id: string, name: string } | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchFiles = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/pipelines/${pipelineId}/files?page=${page}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                if (data.items) {
                    setFiles(data.items);
                    setTotalPages(data.totalPages);
                } else if (Array.isArray(data)) {
                    setFiles(data);
                    setTotalPages(1);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [pipelineId, page]);

    // Format bytes to human readable size
    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#a3a3a3' }}>
                <Loader2 className="animate-spin" style={{ marginRight: '0.5rem' }} /> Loading files...
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <EmptyState
                title="No Data Files"
                description="No output files found. Run the pipeline to generate data."
                icon="📁"
            />
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button
                    onClick={fetchFiles}
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

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {Object.entries(files.reduce((groups, file) => {
                    if (!groups[file.executionId]) {
                        groups[file.executionId] = [];
                    }
                    groups[file.executionId].push(file);
                    return groups;
                }, {} as Record<string, FileItem[]>))
                    .sort(([, a], [, b]) => new Date(b[0].createdAt).getTime() - new Date(a[0].createdAt).getTime())
                    .map(([execId, groupFiles]) => (
                        <div key={execId} style={{ border: '1px solid #262626', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{
                                background: '#262626',
                                padding: '0.75rem 1rem',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: '#e5e5e5',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span>Execution: {execId.slice(0, 8)}</span>
                                <span style={{ fontWeight: 400, color: '#a3a3a3', fontSize: '0.8rem' }}>
                                    {new Date(groupFiles[0].createdAt).toLocaleString()}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gap: '1px', background: '#262626' }}>
                                {groupFiles.map(file => {
                                    const fileName = file.filePath.split(/[\\/]/).pop();
                                    return (
                                        <div
                                            key={file.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: '#171717',
                                                padding: '0.75rem 1rem',
                                            }}
                                        >
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ color: '#e5e5e5', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {fileName}
                                                </div>
                                                <div style={{ color: '#737373', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                                    {formatSize(file.fileSize)}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedFile({ id: file.id, name: fileName || 'file' })}
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
                        </div>
                    ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{
                            background: 'transparent',
                            border: '1px solid #404040',
                            borderRadius: '4px',
                            color: page === 1 ? '#525252' : '#e5e5e5',
                            padding: '0.4rem',
                            cursor: page === 1 ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center'
                        }}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span style={{ color: '#a3a3a3', fontSize: '0.9rem' }}>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        style={{
                            background: 'transparent',
                            border: '1px solid #404040',
                            borderRadius: '4px',
                            color: page === totalPages ? '#525252' : '#e5e5e5',
                            padding: '0.4rem',
                            cursor: page === totalPages ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center'
                        }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            <DataViewerModal
                isOpen={!!selectedFile}
                onClose={() => setSelectedFile(null)}
                connectionId={pipelineId}
                fileId={selectedFile?.id || null}
                fileName={selectedFile?.name || ''}
                entityType="pipeline"
            />
        </div>
    );
}
