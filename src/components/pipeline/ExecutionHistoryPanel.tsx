import React, { useEffect, useState } from 'react';
import { X, PlayCircle, AlertCircle, CheckCircle, Clock, ChevronLeft, ChevronRight, FileText, Trash2, Folder, Bug, ScrollText } from 'lucide-react';
import LogViewerModal from './LogViewerModal';
import ExecutionFilesModal from './ExecutionFilesModal';
import ConfirmationModal from '../ConfirmationModal';

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
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, executionId: string | null }>({ isOpen: false, executionId: null });

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
        return Object.values(outputs).some((out: any) => out && (out.filePath || out.path));
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    const handleDeleteClick = (executionId: string) => {
        setDeleteConfirmation({ isOpen: true, executionId });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation.executionId) return;

        const executionId = deleteConfirmation.executionId;
        setDeleteConfirmation({ isOpen: false, executionId: null });

        try {
            const res = await fetch(`/api/pipelines/${pipelineId}/executions/${executionId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                // Refresh list
                fetchExecutions();
            } else {
                alert('Failed to delete execution');
            }
        } catch (error) {
            console.error('Delete error', error);
            alert('Failed to delete execution');
        }
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

    const iconButtonStyle = {
        padding: '0.4rem',
        background: 'transparent',
        border: '1px solid #404040',
        color: '#a3a3a3',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        width: '28px',
        height: '28px'
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
                                                title="View Output Files"
                                                style={iconButtonStyle}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#262626'; e.currentTarget.style.color = '#e5e5e5'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a3a3a3'; }}
                                            >
                                                <Folder size={14} />
                                            </button>
                                        )}

                                        {debugData && (
                                            <button
                                                onClick={() => onViewDebug(exec, debugData)}
                                                title="View Debug Data"
                                                style={{ ...iconButtonStyle, borderColor: '#3b82f6', color: '#3b82f6' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <Bug size={14} />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setLogsToView({ logs: exec.logs, executionId: exec.id })}
                                            title="View Execution Logs"
                                            style={iconButtonStyle}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#262626'; e.currentTarget.style.color = '#e5e5e5'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a3a3a3'; }}
                                        >
                                            <ScrollText size={14} />
                                        </button>

                                        <button
                                            onClick={() => handleDeleteClick(exec.id)}
                                            title="Delete Run"
                                            style={{ ...iconButtonStyle, borderColor: '#404040', color: '#ef4444' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#262626'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <Trash2 size={14} />
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

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                title="Delete Run"
                message="Are you sure you want to delete this run? This will permanently remove all associated logs and output files. This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirmation({ isOpen: false, executionId: null })}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    );
}
