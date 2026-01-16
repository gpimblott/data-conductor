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

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useConnections } from '@/hooks/useConnections';
import { Connection } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import AddConnectionModal from '@/components/AddConnectionModal';
import LogViewerModal from '@/components/LogViewerModal';
import AlertModal from '@/components/AlertModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import Link from 'next/link';
import PipelineBuilder from '@/components/pipeline/PipelineBuilder';
import DataFileList from '@/components/DataFileList';
import PipelineExecutionList from '@/components/PipelineExecutionList';

export default function ConnectionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const { connections, isLoading, syncConnection, updateConnection, deleteConnection } = useConnections();
    const connection = connections.find(c => c.id === id);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isPipelineBuilderOpen, setIsPipelineBuilderOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'data' | 'executions'>('data');
    const [alertState, setAlertState] = useState<{ isOpen: boolean, title: string, message: string, type: 'success' | 'error' | 'info' }>({
        isOpen: false, title: '', message: '', type: 'info'
    });

    if (isLoading) {
        return <div className="container" style={{ color: '#a3a3a3', marginTop: '2rem' }}>Loading connection...</div>;
    }

    if (!connection) {
        return (
            <div className="container" style={{ marginTop: '2rem' }}>
                <p>Connection not found.</p>
                <Link href="/" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Back to Dashboard</Link>
            </div>
        );
    }

    const handleSync = async () => {
        setIsSyncing(true);
        const result = await syncConnection(connection.id);
        setIsSyncing(false);
        if (!result.success) {
            setAlertState({
                isOpen: true,
                title: 'Run Failed',
                message: result.error || 'Unknown error occurred',
                type: 'error'
            });
        }
    };

    const handleUpdate = async (data: any) => {
        try {
            // Merge existing connection data with the update to ensure required fields are present
            const fullUpdate = { ...connection, ...data };
            await updateConnection(connection.id, fullUpdate);
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Failed to update connection:', error);
            setAlertState({
                isOpen: true,
                title: 'Update Failed',
                message: 'Failed to update connection',
                type: 'error'
            });
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        const success = await deleteConnection(connection.id);
        setIsDeleting(false);
        if (success) {
            router.push('/');
        } else {
            console.error('Failed to delete connection');
        }
    };

    return (
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <Link href="/" style={{ color: '#a3a3a3', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    ← Back to Dashboard
                </Link>
            </div>

            <div style={{
                background: '#0a0a0a',
                border: '1px solid #262626',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>{connection.name}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <StatusBadge status={connection.status} />
                            <span style={{ color: '#737373', fontSize: '0.9rem' }}>
                                Last synced: {connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleString() : 'Never'}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem', padding: '1.5rem', background: '#171717', borderRadius: '8px', border: '1px solid #262626' }}>
                    <div>
                        <div style={{ color: '#a3a3a3', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Type</div>
                        <div style={{ color: '#e5e5e5', fontWeight: 500 }}>{connection.type}</div>
                    </div>
                    <div>
                        <div style={{ color: '#a3a3a3', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Schedule</div>
                        <div style={{ color: '#e5e5e5', fontWeight: 500 }}>{connection.schedule || 'Manual'}</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ color: '#a3a3a3', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                            {connection.type === 'DATABASE' ? 'Connection String' : 'Source URL'}
                        </div>
                        <div style={{ color: '#e5e5e5', fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                            {connection.type === 'DATABASE' ? connection.connectionString : connection.sourceUrl}
                        </div>
                    </div>
                    {connection.type === 'DATABASE' && (
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ color: '#a3a3a3', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>SQL Query</div>
                            <div style={{ color: '#d4d4d4', fontFamily: 'monospace', fontSize: '0.9rem', background: '#000', padding: '0.75rem', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                                {connection.sqlQuery}
                            </div>
                        </div>
                    )}
                    {connection.type === 'HTTP' && (
                        <div>
                            <div style={{ color: '#a3a3a3', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}>XML Conversion</div>
                            <div style={{ color: '#e5e5e5', fontWeight: 500 }}>
                                {connection.options?.convertXml !== false ? 'Enabled' : 'Disabled'}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid #262626', paddingTop: '1.5rem' }}>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '6px',
                            background: '#262626',
                            color: '#e5e5e5',
                            border: '1px solid #404040',
                            fontWeight: 500,
                            cursor: isSyncing ? 'not-allowed' : 'pointer',
                            opacity: isSyncing ? 0.7 : 1
                        }}
                    >
                        {isSyncing ? 'Running...' : '▶ Run'}
                    </button>

                    {connection.status === 'ACTIVE' ? (
                        <button
                            onClick={() => handleUpdate({ status: 'PAUSED' })}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.6rem 1.2rem',
                                borderRadius: '6px',
                                background: 'transparent',
                                border: '1px solid #eab308',
                                color: '#eab308',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            ⏸ Pause
                        </button>
                    ) : (
                        <button
                            onClick={() => handleUpdate({ status: 'ACTIVE' })}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.6rem 1.2rem',
                                borderRadius: '6px',
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            ▶ Start
                        </button>
                    )}

                    <button
                        onClick={() => setIsPipelineBuilderOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '6px',
                            background: '#262626',
                            color: '#e5e5e5',
                            border: '1px solid #404040',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        ⚙️ Pipeline
                    </button>

                    <button
                        onClick={() => setIsLogModalOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '6px',
                            background: '#262626',
                            color: '#e5e5e5',
                            border: '1px solid #404040',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        🕒 History
                    </button>

                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '6px',
                            background: '#262626',
                            color: '#e5e5e5',
                            border: '1px solid #404040',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        ✎ Edit
                    </button>

                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '6px',
                            background: 'transparent',
                            color: '#fca5a5',
                            border: '1px solid #7f1d1d',
                            fontWeight: 500,
                            cursor: 'pointer',
                            marginLeft: 'auto'
                        }}
                    >
                        🗑 Delete
                    </button>
                </div>
            </div>

            {/* Tabs Section */}
            <div style={{
                marginBottom: '1.5rem',
                background: '#0a0a0a',
                border: '1px solid #262626',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #262626' }}>
                    <button
                        onClick={() => setActiveTab('data')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'data' ? '2px solid #3b82f6' : '2px solid transparent',
                            color: activeTab === 'data' ? '#fff' : '#a3a3a3',
                            padding: '0.5rem 0',
                            fontSize: '1rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            marginBottom: '-1px'
                        }}
                    >
                        Last 5 Retrieved Datasets
                    </button>
                    <button
                        onClick={() => setActiveTab('executions')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'executions' ? '2px solid #3b82f6' : '2px solid transparent',
                            color: activeTab === 'executions' ? '#fff' : '#a3a3a3',
                            padding: '0.5rem 0',
                            fontSize: '1rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            marginBottom: '-1px'
                        }}
                    >
                        Last 5 Pipeline Executions
                    </button>
                </div>

                {activeTab === 'data' ? (
                    <DataFileList connectionId={connection.id} limit={5} />
                ) : (
                    <PipelineExecutionList connectionId={connection.id} limit={5} />
                )}
            </div>

            {/* Pipeline Builder Overlay */}
            {
                isPipelineBuilderOpen && connection && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: '#000' }}>
                        <PipelineBuilder
                            connection={connection}
                            onClose={() => setIsPipelineBuilderOpen(false)}
                            onUpdateStatus={(status) => handleUpdate({ status })}
                        />
                    </div>
                )
            }

            {/* Modals */}
            <AddConnectionModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={handleUpdate}
                initialData={connection}
            />

            <LogViewerModal
                isOpen={isLogModalOpen}
                onClose={() => setIsLogModalOpen(false)}
                connectionId={connection.id}
                title={`History: ${connection.name}`}
            />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onCancel={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Connection"
                message={`Are you sure you want to delete "${connection.name}"? This action cannot be undone.`}
                confirmText="Delete Connection"
            />

            <AlertModal
                isOpen={alertState.isOpen}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
            />
        </div >
    );
}
