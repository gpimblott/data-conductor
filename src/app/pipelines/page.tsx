
'use client';

import { useState, useEffect } from 'react';
import { usePipelines } from '@/hooks/usePipelines';
import PipelineList from '@/components/pipeline/PipelineList';
import AddPipelineModal from '@/components/pipeline/AddPipelineModal';
import { Button } from '@/components/ui/Button';
import { PageLayout } from '@/components/ui/PageLayout';
import { LayoutGrid, List as ListIcon } from 'lucide-react';

export default function PipelineDashboard() {
    const { pipelines, isLoading, createPipeline, refreshPipelines, toggleStatus, deletePipeline } = usePipelines();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load preferences
    useEffect(() => {
        const savedView = localStorage.getItem('dataConductor_viewMode');
        const savedFilter = localStorage.getItem('dataConductor_filterStatus');
        if (savedView) setViewMode(savedView as 'card' | 'list');
        if (savedFilter) setFilterStatus(savedFilter);
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('dataConductor_viewMode', viewMode);
            localStorage.setItem('dataConductor_filterStatus', filterStatus);
        }
    }, [viewMode, filterStatus, isLoaded]);

    const filteredPipelines = pipelines.filter(p => {
        if (filterStatus === 'ALL') return true;
        return p.status === filterStatus;
    });

    return (
        <PageLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>Pipelines</h2>
                    <p style={{ color: '#a3a3a3', fontSize: '0.9rem' }}>
                        {isLoading ? '...' : (() => {
                            const active = pipelines.filter(c => c.status === 'ACTIVE').length;
                            const paused = pipelines.filter(c => c.status === 'PAUSED').length;
                            const total = pipelines.length;
                            return `${total} Pipelines • ${active} Active • ${paused} Paused`;
                        })()}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{
                            background: '#171717',
                            border: '1px solid #404040',
                            color: '#e5e5e5',
                            padding: '0.4rem 2rem 0.4rem 0.8rem',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            appearance: 'none',
                        }}
                    >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="PAUSED">Paused</option>
                        <option value="DRAFT">Draft</option>
                    </select>

                    <div style={{ display: 'flex', background: '#171717', borderRadius: '4px', border: '1px solid #404040' }}>
                        <button
                            onClick={() => setViewMode('card')}
                            style={{
                                background: viewMode === 'card' ? '#404040' : 'transparent',
                                color: viewMode === 'card' ? '#fff' : '#a3a3a3',
                                border: 'none',
                                padding: '0.4rem 0.6rem',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center'
                            }}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                background: viewMode === 'list' ? '#404040' : 'transparent',
                                color: viewMode === 'list' ? '#fff' : '#a3a3a3',
                                border: 'none',
                                padding: '0.4rem 0.6rem',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center'
                            }}
                            title="List View"
                        >
                            <ListIcon size={16} />
                        </button>
                    </div>

                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                        + New Pipeline
                    </Button>
                </div>
            </div>

            <PipelineList
                pipelines={filteredPipelines}
                isLoading={isLoading}
                onDelete={deletePipeline}
                onToggleStatus={toggleStatus}
                viewMode={viewMode}
            />

            <AddPipelineModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={createPipeline}
            />
        </PageLayout>
    );
}
