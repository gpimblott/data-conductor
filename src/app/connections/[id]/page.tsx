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
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageLayout } from '@/components/ui/PageLayout';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export default function ConnectionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const { connections, isLoading, syncConnection, updateConnection, deleteConnection } = useConnections();
    const connection = connections.find(c => c.id === id);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
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

    const handlePurge = async () => {
        try {
            const res = await fetch(`/api/connections/${connection.id}/purge`, { method: 'POST' });
            const data = await res.json();

            setIsPurgeModalOpen(false);

            if (res.ok) {
                setAlertState({
                    isOpen: true,
                    title: 'Purge Successful',
                    message: `Deleted ${data.deletedFiles} files and ${data.deletedExecutions} past executions.`,
                    type: 'success'
                });
                // Ideally refresh logic here, but logs/executions list updates on mount or active fetch.
                // We might need to trigger re-fetch if lists are cached.
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setIsPurgeModalOpen(false);
            setAlertState({
                isOpen: true,
                title: 'Purge Failed',
                message: err.message || 'Unknown error',
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
        <PageLayout>
            <Breadcrumb
                items={[
                    { label: 'Dashboard', href: '/' },
                    { label: connection?.name || 'Loading...' }
                ]}
            />


            <Card style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>{connection.name}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <StatusBadge status={connection.status} />
                            <span style={{ color: '#737373', fontSize: '0.9rem' }}>
                                Last synced: {connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleString() : 'Never'}
                            </span>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <Button
                            variant="secondary"
                            onClick={handleSync}
                            disabled={isSyncing}
                            isLoading={isSyncing}
                        >
                            {isSyncing ? 'Running...' : '▶ Run Now'}
                        </Button>

                        {connection.status === 'ACTIVE' ? (
                            <Button
                                variant="warning"
                                onClick={() => handleUpdate({ status: 'PAUSED' })}
                            >
                                ⏸ Disable Schedule
                            </Button>
                        ) : (
                            <Button
                                variant="success"
                                onClick={() => handleUpdate({ status: 'ACTIVE' })}
                            >
                                ▶ Enable Schedule
                            </Button>
                        )}

                        <Button
                            variant="secondary"
                            onClick={() => setIsPipelineBuilderOpen(true)}
                        >
                            ⚙️ Pipeline
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={() => setIsLogModalOpen(true)}
                        >
                            🕒 History
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            ✎ Edit
                        </Button>

                        <Button
                            variant="warning"
                            onClick={() => setIsPurgeModalOpen(true)}
                        >
                            🧹 Purge History
                        </Button>

                        <Button
                            variant="danger"
                            onClick={() => setIsDeleteModalOpen(true)}
                        >
                            🗑 Delete
                        </Button>
                    </div>
                </div>


                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '0', padding: '1.5rem', background: '#171717', borderRadius: '8px', border: '1px solid #262626' }}>
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
            </Card>

            {/* Tabs Section */}
            <Card style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>
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
            </Card>

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

            <ConfirmationModal
                isOpen={isPurgeModalOpen}
                onCancel={() => setIsPurgeModalOpen(false)}
                onConfirm={handlePurge}
                title="Purge History"
                message="Are you sure? This will remove all local data files and pipeline execution records, except for the last 3 runs. System logs will be preserved."
                confirmText="Purge History"
            />

            <AlertModal
                isOpen={alertState.isOpen}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
            />
        </PageLayout >
    );
}
