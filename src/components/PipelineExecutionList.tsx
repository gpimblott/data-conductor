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

import React, { useEffect, useState } from 'react';
import LogViewerModal from './LogViewerModal';
import { EmptyState } from './ui/EmptyState';

interface Execution {
    id: string;
    status: string;
    started_at: string;
    completed_at: string;
    logs: any[];
}

interface Props {
    connectionId: string;
    limit?: number;
}

export default function PipelineExecutionList({ connectionId, limit }: Props) {
    const [executions, setExecutions] = useState<Execution[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);

    const fetchExecutions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/connections/${connectionId}/pipeline/executions`);
            if (res.ok) {
                const data = await res.json();
                setExecutions(data);
            }
        } catch (error) {
            console.error('Failed to fetch executions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (connectionId) {
            fetchExecutions();
        }
    }, [connectionId]);

    if (isLoading) {
        return <div style={{ color: '#a3a3a3', padding: '1rem' }}>Loading executions...</div>;
    }

    if (executions.length === 0) {
        return (
            <EmptyState
                title="No Pipeline Executions"
                description="This pipeline hasn't run yet. Trigger a run manually or wait for the scheduled time."
                icon="🚀"
            />
        );
    }

    const displayedExecutions = limit ? executions.slice(0, limit) : executions;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button
                    onClick={fetchExecutions}
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
                {displayedExecutions.map((exec) => (
                    <div
                        key={exec.id}
                        onClick={() => setSelectedExecution(exec)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#171717',
                            border: '1px solid #262626',
                            padding: '0.75rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#404040'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#262626'}
                    >
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span
                                    style={{
                                        display: 'inline-block',
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: exec.status === 'COMPLETED' ? '#10b981' : exec.status === 'FAILED' ? '#ef4444' : '#f59e0b'
                                    }}
                                />
                                <span style={{ color: '#e5e5e5', fontWeight: 500 }}>
                                    {exec.status}
                                </span>
                            </div>
                            <div style={{ color: '#737373', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                Started: {new Date(exec.started_at).toLocaleString()}
                            </div>
                            {exec.completed_at && (
                                <div style={{ color: '#737373', fontSize: '0.8rem' }}>
                                    Duration: {((new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime()) / 1000).toFixed(1)}s
                                </div>
                            )}
                        </div>
                        <div style={{ color: '#525252', fontSize: '0.8rem' }}>
                            View Logs →
                        </div>
                    </div>
                ))}
            </div>

            {selectedExecution && (
                <LogViewerModal
                    isOpen={!!selectedExecution}
                    onClose={() => setSelectedExecution(null)}
                    title={`Logs: ${selectedExecution.id.substring(0, 8)}...`}
                    externalLogs={selectedExecution.logs}
                />
            )}
        </div>
    );
}
