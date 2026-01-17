'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePipelines } from '@/hooks/usePipelines';
import PipelineFilesPanel from '@/components/pipeline/PipelineFilesPanel';
import ExecutionHistoryPanel from '@/components/pipeline/ExecutionHistoryPanel';
import PipelineSettingsPanel from '@/components/pipeline/PipelineSettingsPanel';
import DebugResultModal from '@/components/pipeline/DebugResultModal';
import AlertModal from '@/components/AlertModal';
import { Button } from '@/components/ui/Button';
import { PageLayout } from '@/components/ui/PageLayout';
import { PortalBreadcrumb } from '@/components/ui/PortalBreadcrumb';
import { ArrowLeft, Play, Pause, Edit, Trash2, Archive } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export default function PipelineDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { pipelines, toggleStatus, runPipeline, deletePipeline, updatePipeline } = usePipelines();

    const [debugResult, setDebugResult] = useState<any>(null);

    const handleViewDebug = (exec: any, debug: any) => {
        setDebugResult({
            success: exec.status === 'COMPLETED',
            executionId: exec.id,
            error: exec.status === 'FAILED' ? 'Pipeline execution failed' : undefined,
            debugData: debug
        });
    };

    const pipeline = pipelines.find(p => p.id === id);
    const [refreshHistory, setRefreshHistory] = useState(0);
    const [alertState, setAlertState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
        onConfirm?: () => void;
        confirmText?: string;
        cancelText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const nodes = useMemo(() => {
        return pipeline?.flow_config?.nodes || [];
    }, [pipeline]);

    if (!pipeline && pipelines.length > 0) {
        return <div style={{ padding: '2rem', color: '#a3a3a3' }}>Pipeline not found or loading...</div>;
    }

    if (!pipeline) return <div style={{ padding: '2rem', color: '#a3a3a3' }}>Loading...</div>;

    const handleRun = async () => {
        await runPipeline(id);
        setRefreshHistory(prev => prev + 1);
        setAlertState({
            isOpen: true,
            title: 'Pipeline Started',
            message: 'Pipeline execution has been queued successfully.',
            type: 'success'
        });
    };

    const handleUpdateSettings = async (id: string, data: any) => {
        try {
            await updatePipeline(id, data);
            setAlertState({
                isOpen: true,
                title: 'Settings Updated',
                message: 'Pipeline settings have been saved successfully.',
                type: 'success'
            });
        } catch (e) {
            console.error(e);
            setAlertState({
                isOpen: true,
                title: 'Update Failed',
                message: 'Failed to update settings. Please try again.',
                type: 'error'
            });
        }
    };

    const executePurge = async () => {
        try {
            const res = await fetch(`/api/pipelines/${id}/purge`, { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                setAlertState({
                    isOpen: true,
                    title: 'Cleanup Complete',
                    message: data.message,
                    type: 'success'
                });
                setRefreshHistory(prev => prev + 1);
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            console.error(e);
            setAlertState({
                isOpen: true,
                title: 'Purge Failed',
                message: 'Failed to purge old execution files.',
                type: 'error'
            });
        }
    };

    const handlePurge = () => {
        setAlertState({
            isOpen: true,
            title: 'Confirm Purge',
            message: 'This will delete data files for all but the last 5 runs. Execution logs will be preserved. Do you want to continue?',
            type: 'info',
            onConfirm: executePurge,
            confirmText: 'Purge Files',
            cancelText: 'Cancel'
        });
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this pipeline?')) {
            await deletePipeline(id);
            router.push('/pipelines');
        }
    };

    const breadcrumbs = [
        { label: 'Dashboard', href: '/' },
        { label: 'Pipelines', href: '/pipelines' },
        { label: pipeline.name || 'Untitled Pipeline' }
    ];

    return (
        <PageLayout>
            <PortalBreadcrumb items={breadcrumbs} />
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {pipeline.name}
                            <StatusBadge status={pipeline.status as any} />
                        </h1>
                        <p style={{ color: '#a3a3a3', maxWidth: '600px' }}>{pipeline.description || 'No description'}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <Button variant="outline" onClick={() => toggleStatus(id, pipeline.status)}>
                            {pipeline.status === 'ACTIVE' ? <Pause size={16} /> : <Play size={16} />}
                            {pipeline.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                        </Button>
                        <Button variant="primary" onClick={handleRun}>
                            <Play size={16} /> Run Now
                        </Button>
                        <Button variant="outline" onClick={() => router.push(`/pipelines/${id}/edit`)}>
                            <Edit size={16} /> Pipeline
                        </Button>
                        <Button variant="outline" onClick={handlePurge} title="Purge old data files">
                            <Archive size={16} /> Purge
                        </Button>
                        <Button variant="danger" onClick={handleDelete}>
                            <Trash2 size={16} />
                        </Button>
                    </div>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '1.5rem',
                flex: 1,
                minHeight: '600px'
            }}>
                {/* Left Column: History */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                        background: '#171717',
                        border: '1px solid #262626',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '500px'
                    }}>
                        <ExecutionHistoryPanel
                            pipelineId={id}
                            onClose={() => { }}
                            onViewDebug={handleViewDebug}
                            variant="embedded"
                            refreshTrigger={refreshHistory}
                        />
                    </div>
                </div>

                {/* Right Column: Settings */}
                <div>
                    <PipelineSettingsPanel pipeline={pipeline} onSave={handleUpdateSettings} />
                </div>
            </div>

            <DebugResultModal
                isOpen={!!debugResult}
                onClose={() => setDebugResult(null)}
                results={debugResult}
                executionId={debugResult?.executionId}
                nodes={nodes}
            />

            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                onConfirm={alertState.onConfirm}
                confirmText={alertState.confirmText}
                cancelText={alertState.cancelText}
            />
        </PageLayout>
    );
}
