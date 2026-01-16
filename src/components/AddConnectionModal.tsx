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

import { useState, useEffect } from 'react';
import { Connection, ConnectionType } from '@/types';
import styles from './AddConnectionModal.module.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Connection>) => void;
    initialData?: Connection | null;
}

export default function AddConnectionModal({ isOpen, onClose, onSubmit, initialData }: Props) {
    const [formData, setFormData] = useState<Partial<Connection>>({
        name: '',
        type: 'RSS',
        sourceUrl: '',
        connectionString: '',
        sqlQuery: '',
        username: '',
        password: '',
        schedule: '',
        options: { convertXml: true }
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name,
                    type: initialData.type,
                    sourceUrl: initialData.sourceUrl || '',
                    connectionString: initialData.connectionString || '',
                    sqlQuery: initialData.sqlQuery || '',
                    username: initialData.username || '',
                    // Don't populate password for security, leave blank implies unchanged
                    password: '',
                    schedule: initialData.schedule || '',
                    options: { convertXml: true, ...initialData.options }
                });
            } else {
                setFormData({
                    name: '',
                    type: 'RSS',
                    sourceUrl: '',
                    connectionString: '',
                    sqlQuery: '',
                    schedule: '',
                    options: { convertXml: true }
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload: Partial<Connection> = {
            name: formData.name,
            type: formData.type,
            schedule: formData.schedule || undefined,
            options: formData.options
        };

        if (formData.type === 'RSS' || formData.type === 'HTTP') {
            if (!formData.sourceUrl) return; // Validation handled by required attr, but double check
            payload.sourceUrl = formData.sourceUrl;
        } else if (formData.type === 'DATABASE') {
            if (!formData.connectionString || !formData.sqlQuery) return;
            payload.connectionString = formData.connectionString;
            payload.sqlQuery = formData.sqlQuery;
            payload.username = formData.username;
            payload.password = formData.password;
        }

        onSubmit(payload);

        // Reset form
        setFormData({
            name: '',
            type: 'RSS',
            sourceUrl: '',
            connectionString: '',
            sqlQuery: '',
            schedule: '',
            options: { convertXml: true }
        });
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Add Connection</h2>
                    <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                </div>
                <div className={styles.modalBody}>
                    <h2>{initialData ? 'Edit Connection' : 'Add New Connection'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="name">Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. TechCrunch RSS"
                                    required
                                    disabled={!!initialData}
                                    style={initialData ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed', color: '#666' } : {}}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="type">Type</label>
                                {initialData ? (
                                    <div className={styles.staticField} style={{ padding: '0.75rem', background: '#f5f5f5', borderRadius: '4px', color: '#666', border: '1px solid #e5e5e5' }}>
                                        {formData.type === 'RSS' ? 'RSS Feed' : formData.type === 'DATABASE' ? 'Database (Postgres/MySQL)' : 'HTTP Request'}
                                    </div>
                                ) : (
                                    <select
                                        id="type"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as ConnectionType })}
                                    >
                                        <option value="RSS">RSS Feed</option>
                                        <option value="DATABASE">Database (Postgres/MySQL)</option>
                                        <option value="HTTP">HTTP Request</option>
                                    </select>
                                )}
                            </div>
                        </div>

                        {formData.type === 'RSS' || formData.type === 'HTTP' ? (
                            <div className={styles.formGroup}>
                                <label htmlFor="sourceUrl">Source URL</label>
                                <input
                                    id="sourceUrl"
                                    type="url"
                                    value={formData.sourceUrl}
                                    onChange={e => setFormData({ ...formData, sourceUrl: e.target.value })}
                                    placeholder="https://example.com/feed.xml"
                                    required={(formData.type as string) !== 'DATABASE'}
                                />
                                {formData.type === 'HTTP' && (
                                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <label htmlFor="convertXml" style={{ marginBottom: 0, fontSize: '0.9rem', color: '#a3a3a3' }}>
                                            Convert XML/HTML to JSON
                                        </label>
                                        <input
                                            id="convertXml"
                                            type="checkbox"
                                            style={{ width: 'auto' }}
                                            checked={formData.options?.convertXml ?? true}
                                            onChange={e => setFormData({
                                                ...formData,
                                                options: { ...formData.options, convertXml: e.target.checked }
                                            })}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className={styles.formGroup}>
                                    <label className={styles.label} htmlFor="connectionString">Connection String (Host/DB)</label>
                                    <input
                                        id="connectionString"
                                        type="text"
                                        className={styles.input}
                                        value={formData.connectionString || ''}
                                        onChange={(e) => setFormData({ ...formData, connectionString: e.target.value })}
                                        placeholder="postgres://host:5432/db or mysql://host:3306/db"
                                        required={(formData.type as string) === 'DATABASE'}
                                    />
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label} htmlFor="username">Username</label>
                                        <input
                                            id="username"
                                            type="text"
                                            className={styles.input}
                                            value={formData.username || ''}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            placeholder="dbuser"
                                            required={(formData.type as string) === 'DATABASE'}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label} htmlFor="password">Password</label>
                                        <input
                                            id="password"
                                            type="password"
                                            className={styles.input}
                                            value={formData.password || ''}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder={initialData ? '(Unchanged)' : 'secret'}
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label} htmlFor="sqlQuery">SQL Query</label>
                                    <textarea
                                        id="sqlQuery"
                                        className={styles.textarea}
                                        value={formData.sqlQuery || ''}
                                        onChange={(e) => setFormData({ ...formData, sqlQuery: e.target.value })}
                                        placeholder="SELECT * FROM table;"
                                        rows={4}
                                        required={(formData.type as string) === 'DATABASE'}
                                        style={{ width: '100%', padding: '0.5rem' }}
                                    />
                                </div>
                            </>
                        )}

                        <div className={styles.formGroup}>
                            <label htmlFor="schedule">Schedule (Optional)</label>
                            <input
                                id="schedule"
                                type="text"
                                value={formData.schedule || ''}
                                onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                                placeholder="Minutes (e.g. 60) or Cron (e.g. 0 * * * *)"
                            />
                            <small className={styles.hint}>Leave empty for manual sync only.</small>
                        </div>

                        <div className={styles.actions}>
                            <button type="button" className="btn" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{initialData ? 'Save Changes' : 'Create Connection'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
