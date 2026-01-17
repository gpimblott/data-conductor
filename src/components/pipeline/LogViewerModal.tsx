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

import React from 'react';
import { X, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface LogEntry {
    timestamp: string;
    message: string;
    level: 'INFO' | 'ERROR' | 'WARN';
    details?: any;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    logs: LogEntry[];
    executionId: string;
}

export default function LogViewerModal({ isOpen, onClose, logs, executionId }: Props) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
        }}>
            <div style={{
                background: '#171717',
                border: '1px solid #333',
                borderRadius: '8px',
                width: '800px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                <div style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{ margin: 0, color: '#e5e5e5', fontSize: '1.1rem' }}>Execution Logs</h3>
                        <div style={{ color: '#737373', fontSize: '0.8rem', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                            ID: {executionId}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '0', overflowY: 'auto', flexGrow: 1, maxHeight: '600px' }}>
                    {logs.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#737373' }}>
                            No logs found for this execution.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead style={{ background: '#262626', position: 'sticky', top: 0 }}>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#a3a3a3', fontWeight: 500, width: '180px' }}>Timestamp</th>
                                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#a3a3a3', fontWeight: 500, width: '80px' }}>Level</th>
                                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#a3a3a3', fontWeight: 500 }}>Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, index) => {
                                    const date = new Date(log.timestamp).toLocaleString();
                                    const isError = log.level === 'ERROR';
                                    const isWarn = log.level === 'WARN';

                                    let levelColor = '#3b82f6'; // Info blue
                                    if (isError) levelColor = '#ef4444';
                                    if (isWarn) levelColor = '#eab308';

                                    return (
                                        <tr key={index} style={{ borderBottom: '1px solid #262626' }}>
                                            <td style={{ padding: '0.75rem 1rem', color: '#737373', verticalAlign: 'top', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {date}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                                                <span style={{
                                                    color: levelColor,
                                                    background: `${levelColor}20`,
                                                    padding: '0.1rem 0.4rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600
                                                }}>
                                                    {log.level}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', color: '#d4d4d4', verticalAlign: 'top' }}>
                                                <div style={{ whiteSpace: 'pre-wrap' }}>{log.message}</div>
                                                {log.details && (
                                                    <div style={{
                                                        marginTop: '0.5rem',
                                                        background: '#000',
                                                        padding: '0.5rem',
                                                        borderRadius: '4px',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.8rem',
                                                        color: '#a3a3a3',
                                                        overflowX: 'auto',
                                                        maxWidth: '450px' // rough limit
                                                    }}>
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div style={{ padding: '1rem', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', background: '#171717' }}>
                    <button onClick={onClose} style={{ padding: '0.5rem 1.5rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                </div>
            </div>
        </div>
    );
}
