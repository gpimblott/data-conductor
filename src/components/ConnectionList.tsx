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

import Link from 'next/link';
import React, { useState } from 'react';
import { Connection } from '@/types';
import StatusBadge from './StatusBadge';
import AlertModal from './AlertModal';
import ConfirmationModal from './ConfirmationModal';
import styles from './ConnectionList.module.css';

// @ts-ignore
import { parseExpression } from 'cron-parser';

interface Props {
    connections: Connection[];
    isLoading: boolean;
    onSync: (id: string) => Promise<{ success: boolean; error?: string }>;
    onEdit: (connection: Connection) => void;
    onDelete: (id: string) => Promise<boolean>;
    onViewLogs: (id: string) => void;
    viewMode: 'card' | 'list';
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function calculateNextRun(schedule: string | undefined, lastSyncedAt: Date | string | undefined, status: string): string {
    if (status === 'PAUSED') return 'Paused';
    if (!schedule) return 'Manual';

    // Cron
    try {
        const interval = parseExpression(schedule);
        const next = interval.next().toDate();
        const now = new Date();
        const diffMs = next.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / 60000);

        if (diffMins < 0) return 'Overdue';
        if (diffMins < 60) return `In ${diffMins}m`;
        return next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        // Simple Minutes (fallback)
        if (/^\d+$/.test(schedule) && lastSyncedAt) {
            const minutes = parseInt(schedule, 10);
            const lastSync = new Date(lastSyncedAt);
            const next = new Date(lastSync.getTime() + minutes * 60000);
            const now = new Date();
            const diffMs = next.getTime() - now.getTime();
            const diffMins = Math.round(diffMs / 60000);

            if (diffMins < 0) return 'Overdue';
            if (diffMins < 60) return `In ${diffMins}m`;
            return next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }
    return 'Invalid';
}

function SyncStatusDots({ statuses }: { statuses?: ('SUCCESS' | 'FAILURE')[] }) {
    if (!statuses || statuses.length === 0) return null;
    // Show max 5, reversed so most recent is right? Or left? Usually right is "latest".
    // DB returns ordered by DESC (latest first). So [0] is latest.
    // Let's display Latest on the RIGHT. So we reverse the array for display (Old -> New).
    const dots = [...statuses].reverse();

    return (
        <div style={{ display: 'flex', gap: '3px' }} title="Recent Sync History (Last 5)">
            {dots.map((status, i) => (
                <div
                    key={i}
                    style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: status === 'SUCCESS' ? '#10b981' : '#ef4444',
                        opacity: 0.8
                    }}
                />
            ))}
        </div>
    );
}


export default function ConnectionList({ connections, isLoading, onSync, onEdit, onDelete, onViewLogs, viewMode }: Props) {
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [alertState, setAlertState] = useState<{ isOpen: boolean, title: string, message: string, type: 'success' | 'error' | 'info' }>({
        isOpen: false, title: '', message: '', type: 'info'
    });
    // Removed Delete Modal state as deletion moves to detail page (though props remain for now to not break build if used elsewhere, but ideally we cleanup)
    // Actually, we might want to keep delete logic here? No, user said "move delete button onto the new view/edit page".
    // So the list just navigates.

    // For navigation
    // We can use Next.js Link or router.push
    // Since the whole card is clickable, maybe router.push is better or wrap in Link.

    // Reset pagination when connections length changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [connections.length, itemsPerPage]);

    const totalPages = Math.ceil(connections.length / itemsPerPage);
    const displayedConnections = connections.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSync = async (e: React.MouseEvent, id: string) => {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation();
        setSyncingId(id);
        const result = await onSync(id);
        setSyncingId(null);

        if (!result.success) {
            setAlertState({
                isOpen: true,
                title: 'Sync Failed',
                message: result.error || 'Unknown error occurred',
                type: 'error'
            });
        }
    };

    const renderPagination = () => {
        if (connections.length === 0) return null;

        return (
            <div className={styles.pagination}>
                <div className={styles.paginationInfo}>
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, connections.length)} to {Math.min(currentPage * itemsPerPage, connections.length)} of {connections.length} connections
                </div>
                <div className={styles.paginationControls}>
                    <select
                        className={styles.perPageSelect}
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    >
                        <option value={5}>5 per page</option>
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                    </select>

                    <button
                        className={styles.pageBtn}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span className={styles.pageNumber}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        className={styles.pageBtn}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return <div className={styles.loading}>Loading connections...</div>;
    }

    if (connections.length === 0) {
        return (
            <div className={styles.empty}>
                <p>No connections found. Create one to get started.</p>
            </div>
        );
    }

    return (
        <div>
            {viewMode === 'list' ? (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}></th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Details</th>
                                <th>Schedule</th>
                                <th>Last Synced</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedConnections.map((conn) => (
                                <tr
                                    key={conn.id}
                                    className={styles.rowLink}
                                >
                                    <td>
                                        <button
                                            className={styles.iconSyncBtn}
                                            onClick={(e) => handleSync(e, conn.id)}
                                            disabled={syncingId === conn.id}
                                            title="Sync Now"
                                        >
                                            {syncingId === conn.id ? '...' : '⚡'}
                                        </button>
                                    </td>
                                    <td className={styles.tableName}>
                                        <Link href={`/connections/${conn.id}`} className={styles.linkOverlay}>
                                            {conn.name}
                                        </Link>
                                    </td>
                                    <td>{conn.type}</td>
                                    <td className={styles.tableDetails}>
                                        {conn.type === 'DATABASE' ? (
                                            <div className={styles.tableCellContent}>
                                                <div title={conn.connectionString}>{conn.connectionString}</div>
                                                <div className={styles.subtext} title={conn.sqlQuery}>{conn.sqlQuery}</div>
                                            </div>
                                        ) : (
                                            <div className={styles.tableCellContent} title={conn.sourceUrl}>{conn.sourceUrl}</div>
                                        )}
                                    </td>
                                    <td>{calculateNextRun(conn.schedule, conn.lastSyncedAt, conn.status)}</td>
                                    <td>{conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleString() : 'Never'}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <StatusBadge status={conn.status} />
                                            <SyncStatusDots statuses={conn.recentSyncStatuses} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className={styles.grid}>
                    {displayedConnections.map((conn) => (
                        <Link
                            key={conn.id}
                            href={`/connections/${conn.id}`}
                            className={`card ${styles.cardWrapper}`}
                        >
                            <div className={styles.cardHeader}>
                                <h3 className={styles.name}>{conn.name}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button
                                        className={styles.headerSyncBtn}
                                        onClick={(e) => handleSync(e, conn.id)}
                                        disabled={syncingId === conn.id}
                                        title="Sync Now"
                                    >
                                        {syncingId === conn.id ? 'Syncing...' : '⚡ Sync'}
                                    </button>
                                    <StatusBadge status={conn.status} />
                                </div>
                            </div>
                            <div className={styles.meta}>
                                <div className={styles.metaItem}>
                                    <span className={styles.label}>Type</span>
                                    <span className={styles.value}>{conn.type}</span>
                                </div>
                                <div className={styles.metaItem}>
                                    <span className={styles.label}>Last Run</span>
                                    <span className={styles.value}>
                                        {conn.lastSyncedAt
                                            ? new Date(conn.lastSyncedAt).toLocaleString()
                                            : 'Never'}
                                    </span>
                                </div>
                                <div className={styles.metaItem}>
                                    <span className={styles.label}>Next Run</span>
                                    <span className={styles.value} style={{ color: '#fff' }}>
                                        {calculateNextRun(conn.schedule, conn.lastSyncedAt, conn.status)}
                                    </span>
                                </div>
                                <div className={styles.metaItem}>
                                    <span className={styles.label}>Last Size</span>
                                    <span className={styles.value}>
                                        {conn.lastSyncSize !== undefined
                                            ? formatFileSize(conn.lastSyncSize)
                                            : '-'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #262626', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: '#737373' }}>
                                <span>Health</span>
                                <SyncStatusDots statuses={conn.recentSyncStatuses} />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
            {renderPagination()}
            <AlertModal
                isOpen={alertState.isOpen}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
