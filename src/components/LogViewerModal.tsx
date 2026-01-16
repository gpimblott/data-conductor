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

import React, { useEffect, useState } from 'react';
import styles from './LogViewerModal.module.css';

interface Log {
    id: string;
    connection_id?: string | null;
    connection_name?: string;
    event_type: string;
    status: string;
    message: string;
    details: any;
    created_at: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    connectionId?: string | null; // If null, show global logs
    title?: string;
    externalLogs?: any[];
}

export default function LogViewerModal({ isOpen, onClose, connectionId, title, externalLogs }: Props) {
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 20;

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let url = `/api/logs?page=${page}&limit=${limit}`;
            if (connectionId) {
                url += `&connectionId=${connectionId}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok) {
                setLogs(data.logs);
                setTotalPages(data.pagination.totalPages);
            } else {
                console.error('Failed to fetch logs:', data.error);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (externalLogs) {
                // Map external logs (e.g. pipeline logs) to the Log interface
                const mappedLogs = externalLogs.map((l: any, i: number) => ({
                    id: `ext-${i}`,
                    created_at: l.timestamp,
                    event_type: l.level || 'INFO',
                    status: l.level === 'ERROR' ? 'FAILURE' : 'SUCCESS',
                    message: l.message,
                    details: l.details,
                    connection_name: ''
                }));
                setLogs(mappedLogs);
                setTotalPages(1); // Pagination not supported for external logs array yet
                setLoading(false);
            } else {
                fetchLogs();
            }
        }
    }, [isOpen, page, connectionId, externalLogs]);

    // Reset page when opening for a different context
    useEffect(() => {
        if (isOpen) {
            setPage(1);
        }
    }, [isOpen, connectionId, externalLogs]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>{title || 'Activity Logs'}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div className={styles.content}>
                    {loading ? (
                        <div className={styles.loading}>Loading logs...</div>
                    ) : logs.length === 0 ? (
                        <div className={styles.empty}>No logs found.</div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        {!connectionId && !externalLogs && <th>Connection</th>}
                                        <th>Event/Level</th>
                                        <th>Status</th>
                                        <th>Message</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td className={styles.time}>
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            {!connectionId && !externalLogs && (
                                                <td className={styles.connectionName}>{log.connection_name}</td>
                                            )}
                                            <td>
                                                <span className={`${styles.badge} ${styles[log.event_type.toLowerCase()] || styles.info}`}>
                                                    {log.event_type}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.status} ${styles[log.status.toLowerCase()] || styles.info}`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className={styles.message}>
                                                {log.message}
                                                {log.details && (
                                                    <details className={styles.details}>
                                                        <summary>Details</summary>
                                                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                                    </details>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    {!externalLogs && (
                        <>
                            <button
                                className={styles.pageBtn}
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                Previous
                            </button>
                            <span>Page {page} of {totalPages || 1}</span>
                            <button
                                className={styles.pageBtn}
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
