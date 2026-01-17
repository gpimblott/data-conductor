import React, { useEffect, useState } from 'react';
import { X, PlayCircle, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface Execution {
    id: string;
    started_at: string;
    completed_at: string | null;
    status: 'RUNNING' | 'COMPLETED' | 'FAILED';
    logs: any[]; // JSON array of logs
}

interface Props {
    connectionId: string;
    onClose: () => void;
    onViewDebug: (execution: Execution, debugData: any) => void;
}

import LogViewerModal from './LogViewerModal';

export default function ExecutionHistoryPanel({ connectionId, onClose, onViewDebug }: Props) {
    const [executions, setExecutions] = useState<Execution[]>([]);
    const [loading, setLoading] = useState(true);
    const [logsToView, setLogsToView] = useState<{ logs: any[], executionId: string } | null>(null);

    useEffect(() => {
        const fetchExecutions = async () => {
            try {
                const res = await fetch(`/api/connections/${connectionId}/pipeline/executions`);
                if (res.ok) {
                    const data = await res.json();
                    setExecutions(data || []);
                }
            } catch (error) {
                console.error('Failed to load history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchExecutions();
    }, [connectionId]);

    const getDebugData = (logs: any[]) => {
        if (!Array.isArray(logs)) return null;
        const debugLog = logs.find(l => l.message === 'Debug Data Captured');
        return debugLog ? debugLog.details : null;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
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
            zIndex: 15
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#e5e5e5', fontSize: '1.1rem', fontWeight: 600 }}>Run History</h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer' }}>
                    <X size={20} />
                </button>
            </div>

            {loading ? (
                <div style={{ color: '#666', textAlign: 'center', marginTop: '2rem' }}>Loading history...</div>
            ) : executions.length === 0 ? (
                <div style={{ color: '#666', textAlign: 'center', marginTop: '2rem' }}>No previous runs found.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {executions.map((exec) => {
                        const debugData = getDebugData(exec.logs);
                        const isSuccess = exec.status === 'COMPLETED';
                        const isFailed = exec.status === 'FAILED';
                        const isRunning = exec.status === 'RUNNING';

                        return (
                            <div key={exec.id} style={{ background: '#262626', borderRadius: '6px', padding: '1rem', border: '1px solid #333' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {isSuccess && <CheckCircle size={16} color="#10b981" />}
                                        {isFailed && <AlertCircle size={16} color="#ef4444" />}
                                        {isRunning && <PlayCircle size={16} color="#3b82f6" />}
                                        <span style={{ fontWeight: 500, color: '#fff', fontSize: '0.9rem' }}>
                                            {isSuccess ? 'Success' : isFailed ? 'Failed' : 'Running'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: '#737373' }}>
                                        {formatDate(exec.started_at)}
                                    </span>
                                </div>

                                <div style={{ fontSize: '0.8rem', color: '#a3a3a3', marginBottom: '0.8rem', fontFamily: 'monospace' }}>
                                    ID: {exec.id.substring(0, 8)}...
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => setLogsToView({ logs: exec.logs, executionId: exec.id })}
                                        style={{
                                            flex: 1,
                                            padding: '0.4rem',
                                            background: '#262626',
                                            border: '1px solid #404040',
                                            color: '#e5e5e5',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        View Logs
                                    </button>

                                    {debugData && (
                                        <button
                                            onClick={() => onViewDebug(exec, debugData)}
                                            style={{
                                                flex: 1,
                                                padding: '0.4rem',
                                                background: '#3b82f6',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            View Debug Data
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Log Viewer Modal */}
            <LogViewerModal
                isOpen={!!logsToView}
                onClose={() => setLogsToView(null)}
                logs={logsToView?.logs || []}
                executionId={logsToView?.executionId || ''}
            />
        </div>
    );
}
