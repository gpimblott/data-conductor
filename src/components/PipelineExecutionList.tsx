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
        return <div style={{ color: '#737373', padding: '1rem', fontStyle: 'italic' }}>No pipeline executions found.</div>;
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
                    </div>
                ))}
            </div>
        </div>
    );
}
