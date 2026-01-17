
import React from 'react';
import Link from 'next/link';
import { Pipeline } from '@/hooks/usePipelines';
import { Activity, Clock, MoreVertical, Trash2, Edit, Play, Pause, Pen } from 'lucide-react';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import StatusBadge from '@/components/StatusBadge'; // Assuming StatusBadge exists in ui or components. Step 2618 found it in components/StatusBadge.tsx, wait. Step 2618 said `StatusBadge.tsx` in `src/components`. But legacy page used `@/components/ConnectionList`?
// Step 2618 said "StatusBadge.tsx" in "src/components".
// So import from `@/components/StatusBadge`.

interface Props {
    pipelines: Pipeline[];
    isLoading: boolean;
    onDelete: (id: string) => void;
    onToggleStatus: (id: string, currentStatus: string) => void;
    viewMode: 'card' | 'list';
}

export default function PipelineList({ pipelines, isLoading, onDelete, onToggleStatus, viewMode }: Props) {
    if (isLoading) {
        return <div style={{ color: '#666', padding: '2rem', textAlign: 'center' }}>Loading pipelines...</div>;
    }

    if (pipelines.length === 0) {
        return (
            <div style={{
                border: '1px dashed #333',
                borderRadius: '8px',
                padding: '3rem',
                textAlign: 'center',
                color: '#666'
            }}>
                No pipelines found. Create one to get started.
            </div>
        );
    }

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '1rem'
    };

    const listStyle = {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.5rem'
    };

    return (
        <div style={viewMode === 'card' ? gridStyle : listStyle}>
            {pipelines.map((pipeline) => (
                <div key={pipeline.id} style={{
                    background: '#171717',
                    border: '1px solid #262626',
                    borderRadius: '8px',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    flexDirection: viewMode === 'card' ? 'column' : 'row',
                    alignItems: viewMode === 'card' ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    gap: viewMode === 'card' ? '1rem' : '0',
                    transition: 'all 0.2s',
                    position: 'relative'
                }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Link
                                href={`/pipelines/${pipeline.id}`}
                                style={{
                                    textDecoration: 'none',
                                    color: '#fff',
                                    fontWeight: 600,
                                    fontSize: '1.1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {pipeline.name}
                            </Link>
                            <Link href={`/pipelines/${pipeline.id}`} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#737373',
                                padding: '4px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}>
                                <Pen size={14} />
                            </Link>
                            <StatusBadge status={pipeline.status as any} />
                        </div>
                        <div style={{ color: '#737373', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pipeline.description || 'No description'}
                        </div>

                        {/* Recent Executions Status */}
                        <div style={{ display: 'flex', gap: '4px', marginTop: '0.75rem', maxWidth: '140px' }} title="Last 5 runs status">
                            {[...Array(5)].map((_, i) => {
                                // Display Oldest -> Newest (Left -> Right)
                                // runs[0] is Latest
                                const runs = pipeline.recent_executions || [];
                                const runIndex = 4 - i;
                                const run = runs[runIndex];

                                let color = '#262626'; // Empty/Default
                                if (run) {
                                    if (run.status === 'COMPLETED') color = '#10b981';
                                    else if (run.status === 'FAILED') color = '#ef4444';
                                    else if (run.status === 'RUNNING') color = '#3b82f6';
                                    else color = '#f59e0b';
                                }

                                return (
                                    <div key={i} title={run ? `${run.status} - ${new Date(run.started_at).toLocaleString()}` : 'No run'} style={{
                                        flex: 1,
                                        height: '4px',
                                        borderRadius: '2px',
                                        backgroundColor: color
                                    }} />
                                );
                            })}
                        </div>
                    </div>

                    {viewMode === 'list' && <div style={{ width: '1rem' }} />}

                    <div style={{
                        display: 'flex',
                        alignItems: viewMode === 'card' ? 'flex-start' : 'center',
                        justifyContent: viewMode === 'card' ? 'space-between' : 'flex-end',
                        flexDirection: viewMode === 'card' ? 'row' : 'row', // actually keeping row is fine
                        gap: '1rem',
                        marginTop: viewMode === 'card' ? '0.5rem' : '0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#737373' }}>
                            <Clock size={14} />
                            {pipeline.schedule ? <span style={{ marginRight: '0.5rem' }}>{pipeline.schedule}</span> : null}
                            <span>{pipeline.last_run_at ? new Date(pipeline.last_run_at).toLocaleString() : 'Never ran'}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => onToggleStatus(pipeline.id, pipeline.status)}
                                title={pipeline.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                                style={{
                                    padding: '0.4rem',
                                    background: 'transparent',
                                    border: '1px solid #404040',
                                    color: pipeline.status === 'ACTIVE' ? '#e5e5e5' : '#10b981',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex'
                                }}
                            >
                                {pipeline.status === 'ACTIVE' ? <Pause size={14} /> : <Play size={14} />}
                            </button>

                            <Link href={`/pipelines/${pipeline.id}/edit`}>
                                <button style={{
                                    padding: '0.4rem 0.8rem',
                                    background: '#262626',
                                    border: '1px solid #404040',
                                    color: '#e5e5e5',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem'
                                }}>
                                    <Edit size={14} />
                                    {viewMode === 'card' && "Pipeline"}
                                </button>
                            </Link>

                            <Dropdown trigger={
                                <button style={{
                                    padding: '0.4rem',
                                    background: 'transparent',
                                    border: '1px solid #404040',
                                    color: '#a3a3a3',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex'
                                }}>
                                    <MoreVertical size={16} />
                                </button>
                            }>
                                <DropdownItem variant="danger" onClick={() => onDelete(pipeline.id)} icon={<Trash2 size={14} />}>
                                    Delete
                                </DropdownItem>
                            </Dropdown>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

