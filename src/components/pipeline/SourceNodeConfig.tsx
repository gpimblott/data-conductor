
import React, { useEffect, useState } from 'react';
import { Node } from 'reactflow';

interface Props {
    node: Node;
    onUpdate: (id: string, data: any) => void;
}

export default function SourceNodeConfig({ node, onUpdate }: Props) {
    const data = node.data || {};
    // Extract existing values or defaults
    const [name, setName] = useState(data.name || 'Source');
    const [connectionType, setConnectionType] = useState(data.connectionType || 'RSS');
    const [config, setConfig] = useState(data.connectionConfig || {});

    // Sync local state when node changes (e.g. implementation detail if user switches node)
    useEffect(() => {
        setName(data.name || 'Source');
        setConnectionType(data.connectionType || 'RSS');
        setConfig(data.connectionConfig || {});
    }, [node.id]);

    const handleUpdate = (updates: any) => {
        // Debounce or direct update? Direct for now.
        // We update the node data spread with new values
        onUpdate(node.id, {
            ...data,
            ...updates
        });
    };

    const updateConfig = (key: string, value: any) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        handleUpdate({ connectionConfig: newConfig });
    };

    const changeType = (type: string) => {
        setConnectionType(type);
        // Reset config potentially based on type? Or keep valid fields.
        // For simplicity, keep as is, user can clear.
        const readableType = type === 'RSS' ? 'RSS Feed' : type === 'HTTP' ? 'HTTP Request' : 'Database';
        handleUpdate({ connectionType: type, connectionConfig: {}, subLabel: readableType });
        setConfig({});
    };

    const changeName = (val: string) => {
        setName(val);
        handleUpdate({ name: val, label: val }); // Also update label for visual
    };

    return (
        <div>
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Source Name</label>
                <input
                    value={name}
                    onChange={(e) => changeName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
                />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Connection Type</label>
                <select
                    value={connectionType}
                    onChange={(e) => changeType(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
                >
                    <option value="RSS">RSS Feed</option>
                    <option value="HTTP">HTTP Request</option>
                    <option value="DATABASE">Database (Postgres/MySQL)</option>
                </select>
            </div>

            <h4 style={{ margin: '0 0 1rem 0', color: '#e5e5e5', fontSize: '0.9rem' }}>Connection Details</h4>

            {(connectionType === 'RSS' || connectionType === 'HTTP') && (
                <>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.5rem', fontSize: '0.9rem' }}>URL</label>
                        <input
                            value={config.url || ''}
                            onChange={(e) => updateConfig('url', e.target.value)}
                            placeholder="https://example.com/feed.xml"
                            style={{ width: '100%', padding: '0.5rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
                        />
                    </div>
                </>
            )}

            {connectionType === 'HTTP' && (
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#a3a3a3' }}>
                        <input
                            type="checkbox"
                            checked={config.convertXml !== false} // Default to true
                            onChange={(e) => updateConfig('convertXml', e.target.checked)}
                        />
                        Convert XML/HTML to JSON
                    </label>
                </div>
            )}

            {(connectionType === 'DATABASE' || connectionType === 'POSTGRES' || connectionType === 'MYSQL') && (
                <>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Connection String</label>
                        <input
                            value={config.connectionString || ''}
                            onChange={(e) => updateConfig('connectionString', e.target.value)}
                            placeholder="postgres://user:pass@host:5432/db"
                            style={{ width: '100%', padding: '0.5rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
                        />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.5rem', fontSize: '0.9rem' }}>SQL Query</label>
                        <textarea
                            value={config.query || ''}
                            onChange={(e) => updateConfig('query', e.target.value)}
                            placeholder="SELECT * FROM users"
                            rows={4}
                            style={{ width: '100%', padding: '0.5rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                            <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Username</label>
                            <input
                                value={config.username || ''}
                                onChange={(e) => updateConfig('username', e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
                            <input
                                type="password"
                                value={config.password || ''}
                                onChange={(e) => updateConfig('password', e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
