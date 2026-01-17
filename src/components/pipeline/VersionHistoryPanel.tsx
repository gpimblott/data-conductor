/*
 * DataConductor
 * Copyright (C) 2026
 */

import React, { useEffect, useState } from 'react';
import { X, RotateCcw, Eye } from 'lucide-react';

interface Version {
    id: string;
    version: number;
    description: string | null;
    created_at: string;
}

interface VersionHistoryPanelProps {
    onClose: () => void;
    pipelineId: string;
    onRestore: (versionId: string) => Promise<void>;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
    onClose,
    pipelineId,
    onRestore
}) => {
    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(true);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [viewConfig, setViewConfig] = useState<string | null>(null);

    useEffect(() => {
        fetchVersions();
    }, [pipelineId]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/pipelines/${pipelineId}/versions`);
            if (res.ok) {
                const data = await res.json();
                setVersions(data);
            }
        } catch (error) {
            console.error('Failed to fetch versions', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (versionId: string) => {
        if (confirm('Are you sure you want to restore this version? This will overwrite the current pipeline configuration.')) {
            setRestoringId(versionId);
            await onRestore(versionId);
            setRestoringId(null);
            onClose();
        }
    };

    const handleView = async (versionId: string) => {
        try {
            const res = await fetch(`/api/pipelines/${pipelineId}/versions/${versionId}`);
            if (res.ok) {
                const data = await res.json();
                setViewConfig(JSON.stringify(data.flow_config, null, 2));
            }
        } catch (e) {
            console.error('Failed to load config', e);
            alert('Failed to load configuration');
        }
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '400px',
            background: '#171717',
            borderLeft: '1px solid #262626',
            padding: '1.5rem',
            overflowY: 'auto',
            zIndex: 15,
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '1px solid #333',
                paddingBottom: '1rem'
            }}>
                <h3 style={{ margin: 0, color: '#e5e5e5', fontSize: '1.1rem', fontWeight: 600 }}>Version History</h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer' }}>
                    <X size={20} />
                </button>
            </div>

            <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ color: '#666', textAlign: 'center', marginTop: '2rem' }}>Loading history...</div>
                ) : versions.length === 0 ? (
                    <div style={{ color: '#666', textAlign: 'center', marginTop: '2rem' }}>No version history available.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {versions.map((ver) => (
                            <div key={ver.id} style={{
                                background: '#262626',
                                borderRadius: '6px',
                                padding: '1rem',
                                border: '1px solid #333'
                            }}>
                                <div style={{ marginBottom: '0.8rem' }}>
                                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                                        <span style={{
                                            background: '#333',
                                            padding: '0.1rem 0.4rem',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            color: '#a3a3a3',
                                            fontFamily: 'monospace'
                                        }}>v{ver.version}</span>
                                        {ver.description || 'No description'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#737373', marginTop: '0.25rem' }}>
                                        {new Date(ver.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleView(ver.id)}
                                        style={{
                                            flex: 1,
                                            padding: '0.4rem',
                                            background: '#262626',
                                            border: '1px solid #404040',
                                            color: '#e5e5e5',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.4rem',
                                            fontSize: '0.85rem'
                                        }}
                                        title="View Configuration"
                                    >
                                        <Eye size={14} />
                                        View
                                    </button>
                                    <button
                                        onClick={() => handleRestore(ver.id)}
                                        disabled={restoringId !== null}
                                        style={{
                                            flex: 1,
                                            padding: '0.4rem',
                                            background: '#262626',
                                            border: '1px solid #404040',
                                            color: '#e5e5e5',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.4rem',
                                            fontSize: '0.85rem'
                                        }}
                                        title="Restore this version"
                                    >
                                        <RotateCcw size={14} />
                                        Restore
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Config View Modal (Global Overlay) */}
            {viewConfig && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 100, // Higher than panel
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#171717',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        width: '800px',
                        maxWidth: '90vw',
                        height: '80vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '1rem',
                            borderBottom: '1px solid #333',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#262626',
                            borderTopLeftRadius: '8px',
                            borderTopRightRadius: '8px'
                        }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#fff' }}>Pipeline Configuration</h3>
                            <button onClick={() => setViewConfig(null)} style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ flexGrow: 1, overflow: 'auto', padding: '1rem', background: '#0a0a0a' }}>
                            <pre style={{
                                margin: 0,
                                fontSize: '0.85rem',
                                color: '#a3a3a3',
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {viewConfig}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
