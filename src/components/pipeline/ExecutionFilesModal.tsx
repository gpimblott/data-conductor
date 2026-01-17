
import React, { useState } from 'react';
import { X, FileText, Eye } from 'lucide-react';
import DataViewerModal from '../DataViewerModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    executionId: string;
    pipelineId: string;
    outputs: Record<string, any>;
    createdAt: string;
}

export default function ExecutionFilesModal({ isOpen, onClose, executionId, pipelineId, outputs, createdAt }: Props) {
    const [selectedFile, setSelectedFile] = useState<{ id: string, name: string } | null>(null);

    if (!isOpen) return null;

    // Extract files from outputs
    const files: any[] = [];
    Object.entries(outputs || {}).forEach(([nodeId, output]: [string, any]) => {
        const filePath = output?.filePath || output?.path;
        if (output && typeof output === 'object' && filePath) {
            files.push({
                id: `${executionId}:${nodeId}`,
                executionId,
                nodeId,
                filePath: filePath,
                fileName: filePath.split(/[\\/]/).pop()
            });
        }
    });

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60
        }}>
            <div style={{
                background: '#171717',
                border: '1px solid #262626',
                borderRadius: '8px',
                width: '600px',
                maxWidth: '90vw',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid #262626',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{ margin: 0, color: '#e5e5e5', fontSize: '1.1rem' }}>Execution Files</h3>
                        <div style={{ fontSize: '0.85rem', color: '#737373', marginTop: '0.25rem' }}>
                            {new Date(createdAt).toLocaleString()} • {executionId.slice(0, 8)}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#a3a3a3',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                    {files.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#737373', padding: '2rem' }}>
                            <FileText size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <div>No data files generated in this execution.</div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {files.map(file => (
                                <div key={file.id} style={{
                                    background: '#262626',
                                    border: '1px solid #333',
                                    borderRadius: '6px',
                                    padding: '0.75rem 1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                        <FileText size={18} color="#3b82f6" />
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e5e5e5', fontSize: '0.9rem' }}>
                                            {file.fileName}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedFile({ id: file.id, name: file.fileName })}
                                        style={{
                                            background: '#171717',
                                            border: '1px solid #404040',
                                            borderRadius: '4px',
                                            padding: '0.4rem 0.8rem',
                                            color: '#d4d4d4',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        }}
                                    >
                                        <Eye size={14} /> View
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

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
