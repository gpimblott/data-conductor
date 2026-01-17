import React, { useEffect, useState } from 'react';
import { X, PlayCircle, AlertCircle, CheckCircle, Clock, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import LogViewerModal from './LogViewerModal';
import ExecutionFilesModal from './ExecutionFilesModal';

interface Execution {
    id: string;
    started_at: string;
    completed_at: string | null;
    status: 'RUNNING' | 'COMPLETED' | 'FAILED';
    logs: any[]; // JSON array of logs
    outputs?: Record<string, any>;
}

interface Props {
    pipelineId: string;
    onClose: () => void;
    onViewDebug: (execution: Execution, debugData: any) => void;
    variant?: 'sidebar' | 'embedded';
    refreshTrigger?: number;
}

export default function ExecutionHistoryPanel({ pipelineId, onClose, onViewDebug, variant = 'sidebar', refreshTrigger }: Props) {
    const [executions, setExecutions] = useState<Execution[]>([]);
    const [loading, setLoading] = useState(true);
    const [logsToView, setLogsToView] = useState<{ logs: any[], executionId: string } | null>(null);
    const [filesToView, setFilesToView] = useState<{ outputs: any, executionId: string, createdAt: string } | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState(5);

    const fetchExecutions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/pipelines/${pipelineId}/executions?page=${page}&limit=${limit}`);
            if (res.ok) {
                const data = await res.json();
                // Check if new paginated format or legacy array (just in case)
                if (Array.isArray(data)) {
                    setExecutions(data);
                    setTotalPages(1);
                } else {
                    setExecutions(data.items || []);
                    setTotalPages(data.totalPages || 1);
                }
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExecutions();
    }, [pipelineId, refreshTrigger, page, limit]);

    const getDebugData = (logs: any[]) => {
        if (!Array.isArray(logs)) return null;
        const debugLog = logs.find(l => l.message === 'Debug Data Captured');
        return debugLog ? debugLog.details : null;
    };

    const hasFiles = (outputs?: Record<string, any>) => {
        if (!outputs) return false;
        return Object.values(outputs).some((out: any) => out && out.filePath);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    const sidebarStyle: React.CSSProperties = {
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
    };

    const embeddedStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        padding: '1.5rem',
        overflowY: 'auto',
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column'
    };

    return (
        <div style={variant === 'sidebar' ? sidebarStyle : embeddedStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#e5e5e5', fontSize: '1.1rem', fontWeight: 600 }}>Run History</h3>
                {variant === 'sidebar' && (
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ color: '#666', textAlign: 'center', marginTop: '2rem' }}>Loading history...</div>
                ) : executions.length === 0 ? (
                    <div style={{ color: '#666', textAlign: 'center', marginTop: '2rem' }}>No previous runs found.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {executions.map((exec) => {
                            const debugData = getDebugData(exec.logs);
                            const isSuccess = exec.status === 'COMPLETED';
                            const isFailed = exec.status === 'FAILED';
                            const isRunning = exec.status === 'RUNNING';

                            return (
                                <div key={exec.id} style={{
                                    background: '#262626',
                                    borderRadius: '6px',
                                    padding: '0.75rem 1rem',
                                    border: '1px solid #333',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '1rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                        <div style={{ minWidth: '20px' }}>
                                            {isSuccess && <CheckCircle size={18} color="#10b981" />}
                                            {isFailed && <AlertCircle size={18} color="#ef4444" />}
                                            {isRunning && <PlayCircle size={18} color="#3b82f6" />}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#e5e5e5' }}>
                                                {formatDate(exec.started_at)}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#737373', fontFamily: 'monospace' }}>
                                                {exec.status} • {exec.id.substring(0, 8)}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {hasFiles(exec.outputs) && (
                                            <button
                                                onClick={() => setFilesToView({ outputs: exec.outputs, executionId: exec.id, createdAt: exec.started_at })}
                                                title="View Data Files"
                                                style={{
                                                    padding: '0.4rem',
                                                    background: '#171717',
                                                    border: '1px solid #404040',
                                                    color: '#a3a3a3',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                Files
                                            </button>
                                        )}

                                        {debugData && (
                                            <button
                                                onClick={() => onViewDebug(exec, debugData)}
                                                title="View Debug Data"
                                                style={{
                                                    padding: '0.4rem',
                                                    background: '#3b82f6',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                Debug
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setLogsToView({ logs: exec.logs, executionId: exec.id })}
                                            title="View Logs"
                                            style={{
                                                padding: '0.4rem',
                                                background: '#171717',
                                                border: '1px solid #404040',
                                                color: '#a3a3a3',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Logs
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {executions.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #333', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'absolute', left: '0' }}>
                        <span style={{ fontSize: '0.85rem', color: '#737373' }}>Show:</span>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(1);
                            }}
                            style={{
                                background: '#171717',
                                border: '1px solid #333',
                                color: '#a3a3a3',
                                borderRadius: '4px',
                                padding: '0.2rem',
                                fontSize: '0.85rem',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            style={{ background: 'transparent', border: '1px solid #333', color: page === 1 ? '#444' : '#a3a3a3', borderRadius: '4px', padding: '0.25rem', cursor: page === 1 ? 'default' : 'pointer' }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontSize: '0.85rem', color: '#737373' }}>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            style={{ background: 'transparent', border: '1px solid #333', color: page === totalPages ? '#444' : '#a3a3a3', borderRadius: '4px', padding: '0.25rem', cursor: page === totalPages ? 'default' : 'pointer' }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Log Viewer Modal */}
            <LogViewerModal
                isOpen={!!logsToView}
                onClose={() => setLogsToView(null)}
                logs={logsToView?.logs || []}
                executionId={logsToView?.executionId || ''}
            />

            {/* Files Viewer Modal */}
            {filesToView && (
                <ExecutionFilesModal
                    isOpen={!!filesToView}
                    onClose={() => setFilesToView(null)}
                    executionId={filesToView.executionId}
                    pipelineId={pipelineId}
                    outputs={filesToView.outputs}
                    createdAt={filesToView.createdAt}
                />
            )}
        </div>
    );
}
