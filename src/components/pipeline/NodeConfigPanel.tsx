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

import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { X, Plus, Trash2 } from 'lucide-react';

interface NodeConfigPanelProps {
    node: Node | null;
    onClose: () => void;
    onUpdate: (id: string, data: any) => void;
}

export default function NodeConfigPanel({ node, onClose, onUpdate }: NodeConfigPanelProps) {
    if (!node) return null;

    const isTransformNode = node.type === 'transform_json';
    const isRestApiNode = node.type === 'rest_api';
    const isFileDestNode = node.type === 'file_destination';
    const isPostgresNode = node.type === 'postgres_destination';

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
            zIndex: 10
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: '#e5e5e5', fontSize: '1.1rem' }}>Configure Node</h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer' }}>
                    <X size={20} />
                </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Label</label>
                <input
                    type="text"
                    value={node.data.label || ''}
                    onChange={(e) => onUpdate(node.id, { ...node.data, label: e.target.value })}
                    style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: '#262626',
                        border: '1px solid #404040',
                        color: '#e5e5e5',
                        borderRadius: '4px'
                    }}
                />
            </div>

            {isTransformNode && <TransformConfig node={node} onUpdate={onUpdate} />}
            {isRestApiNode && <RestApiConfig node={node} onUpdate={onUpdate} />}
            {isFileDestNode && <FileDestConfig node={node} onUpdate={onUpdate} />}
            {isPostgresNode && <PostgresConfig node={node} onUpdate={onUpdate} />}
        </div>
    );
}

function TransformConfig({ node, onUpdate }: { node: Node, onUpdate: (id: string, data: any) => void }) {
    const [mode, setMode] = useState<'simple' | 'advanced'>(node.data.mode || 'simple');
    // Rules: { target: string, source: string }[]
    const rules = node.data.rules || [];
    const expression = node.data.expression || '';

    const handleModeChange = (newMode: 'simple' | 'advanced') => {
        setMode(newMode);
        onUpdate(node.id, { ...node.data, mode: newMode });
    };

    const addRule = () => {
        const newRules = [...rules, { target: '', source: '' }];
        onUpdate(node.id, { ...node.data, rules: newRules });
    };

    const updateRule = (index: number, field: 'target' | 'source', value: string) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], [field]: value };
        onUpdate(node.id, { ...node.data, rules: newRules });
    };

    const removeRule = (index: number) => {
        const newRules = rules.filter((_: any, i: number) => i !== index);
        onUpdate(node.id, { ...node.data, rules: newRules });
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: '#262626', padding: '0.25rem', borderRadius: '4px' }}>
                <button
                    onClick={() => handleModeChange('simple')}
                    style={{
                        flex: 1,
                        padding: '0.4rem',
                        background: mode === 'simple' ? '#404040' : 'transparent',
                        color: mode === 'simple' ? '#fff' : '#a3a3a3',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    Simple Mapping
                </button>
                <button
                    onClick={() => handleModeChange('advanced')}
                    style={{
                        flex: 1,
                        padding: '0.4rem',
                        background: mode === 'advanced' ? '#404040' : 'transparent',
                        color: mode === 'advanced' ? '#fff' : '#a3a3a3',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    JSONata Expression
                </button>
            </div>

            {mode === 'simple' ? (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#a3a3a3', fontSize: '0.8rem' }}>
                        <span>Target Field</span>
                        <span>Source Path (e.g. items[0].name)</span>
                    </div>
                    {rules.map((rule: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                                placeholder="output_key"
                                value={rule.target}
                                onChange={(e) => updateRule(idx, 'target', e.target.value)}
                                style={{ flex: 1, background: '#262626', border: '1px solid #404040', color: '#fff', padding: '0.4rem', borderRadius: '4px' }}
                            />
                            <div style={{ color: '#525252', display: 'flex', alignItems: 'center' }}>=</div>
                            <input
                                placeholder="input_path"
                                value={rule.source}
                                onChange={(e) => updateRule(idx, 'source', e.target.value)}
                                style={{ flex: 1, background: '#262626', border: '1px solid #404040', color: '#fff', padding: '0.4rem', borderRadius: '4px' }}
                            />
                            <button onClick={() => removeRule(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={addRule}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            color: '#3b82f6', background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: '0.9rem', marginTop: '0.5rem'
                        }}
                    >
                        <Plus size={16} /> Add Mapping
                    </button>
                </div>
            ) : (
                <div>
                    <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        Expression (<a href="https://try.jsonata.org/" target="_blank" style={{ color: '#3b82f6' }}>Docs</a>)
                    </label>
                    <textarea
                        value={expression}
                        onChange={(e) => onUpdate(node.id, { ...node.data, expression: e.target.value })}
                        placeholder="e.g. { 'fullname': name.first & ' ' & name.last }"
                        style={{
                            width: '100%',
                            minHeight: '200px',
                            background: '#262626',
                            border: '1px solid #404040',
                            color: '#e5e5e5',
                            borderRadius: '4px',
                            padding: '0.8rem',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            lineHeight: '1.4'
                        }}
                    />
                </div>
            )}
        </div>
    );
}

function RestApiConfig({ node, onUpdate }: { node: Node, onUpdate: (id: string, data: any) => void }) {
    return (
        <div>
            <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.5rem', fontSize: '0.9rem' }}>API URL</label>
            <input
                value={node.data.url || ''}
                onChange={(e) => onUpdate(node.id, { ...node.data, url: e.target.value })}
                placeholder="https://api.example.com/data"
                style={{ width: '100%', padding: '0.5rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px', marginBottom: '1rem' }}
            />
            <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Method</label>
            <select
                value={node.data.method || 'GET'}
                onChange={(e) => onUpdate(node.id, { ...node.data, method: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
            >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
            </select>
        </div>
    )
}

function FileDestConfig({ node, onUpdate }: { node: Node, onUpdate: (id: string, data: any) => void }) {
    return (
        <div>
            <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Filename (Optional)</label>
            <input
                value={node.data.filename || ''}
                onChange={(e) => onUpdate(node.id, { ...node.data, filename: e.target.value })}
                placeholder="output.json"
                style={{ width: '100%', padding: '0.5rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
            />
            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#737373' }}>
                Optional. Supports <code>{'{{timestamp}}'}</code> and <code>{'{{date}}'}</code> placeholders. <br />
                Leave blank to generate a timestamped filename.
            </p>
        </div>
    )
}

function PostgresConfig({ node, onUpdate }: { node: Node, onUpdate: (id: string, data: any) => void }) {
    // Mapping: { column: string, sourcePath: string }[] (same structure as transform rules roughly)
    const mapping = node.data.mapping || [];

    const addMapping = () => {
        const newMapping = [...mapping, { column: '', sourcePath: '' }];
        onUpdate(node.id, { ...node.data, mapping: newMapping });
    };

    const updateMapping = (index: number, field: 'column' | 'sourcePath', value: string) => {
        const newMapping = [...mapping];
        newMapping[index] = { ...newMapping[index], [field]: value };
        onUpdate(node.id, { ...node.data, mapping: newMapping });
    };

    const removeMapping = (index: number) => {
        const newMapping = mapping.filter((_: any, i: number) => i !== index);
        onUpdate(node.id, { ...node.data, mapping: newMapping });
    };

    return (
        <div>
            <h4 style={{ margin: '0 0 1rem 0', color: '#e5e5e5', fontSize: '0.9rem' }}>Connection Settings</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div>
                    <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Host</label>
                    <input
                        value={node.data.host || ''}
                        onChange={(e) => onUpdate(node.id, { ...node.data, host: e.target.value })}
                        placeholder="localhost"
                        style={{ width: '100%', padding: '0.4rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Port</label>
                    <input
                        value={node.data.port || '5432'}
                        type="number"
                        onChange={(e) => onUpdate(node.id, { ...node.data, port: parseInt(e.target.value) })}
                        placeholder="5432"
                        style={{ width: '100%', padding: '0.4rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
                    />
                </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Database</label>
                <input
                    value={node.data.database || ''}
                    onChange={(e) => onUpdate(node.id, { ...node.data, database: e.target.value })}
                    placeholder="my_database"
                    style={{ width: '100%', padding: '0.4rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
                />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div>
                    <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.25rem', fontSize: '0.8rem' }}>User</label>
                    <input
                        value={node.data.user || ''}
                        onChange={(e) => onUpdate(node.id, { ...node.data, user: e.target.value })}
                        placeholder="postgres"
                        style={{ width: '100%', padding: '0.4rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Password</label>
                    <input
                        value={node.data.password || ''}
                        type="password"
                        onChange={(e) => onUpdate(node.id, { ...node.data, password: e.target.value })}
                        placeholder="••••••"
                        style={{ width: '100%', padding: '0.4rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
                    />
                </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#a3a3a3', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Target Table</label>
                <input
                    value={node.data.table || ''}
                    onChange={(e) => onUpdate(node.id, { ...node.data, table: e.target.value })}
                    placeholder="users"
                    style={{ width: '100%', padding: '0.4rem', background: '#262626', border: '1px solid #404040', color: '#fff', borderRadius: '4px' }}
                />
            </div>

            <h4 style={{ margin: '0 0 0.5rem 0', color: '#e5e5e5', fontSize: '0.9rem' }}>Field Mapping</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#a3a3a3', fontSize: '0.8rem' }}>
                <span>DB Column</span>
                <span>Source Path</span>
            </div>
            {mapping.map((map: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                        placeholder="column_name"
                        value={map.column}
                        onChange={(e) => updateMapping(idx, 'column', e.target.value)}
                        style={{ flex: 1, background: '#262626', border: '1px solid #404040', color: '#fff', padding: '0.4rem', borderRadius: '4px' }}
                    />
                    <div style={{ color: '#525252', display: 'flex', alignItems: 'center' }}>=</div>
                    <input
                        placeholder="json.path"
                        value={map.sourcePath}
                        onChange={(e) => updateMapping(idx, 'sourcePath', e.target.value)}
                        style={{ flex: 1, background: '#262626', border: '1px solid #404040', color: '#fff', padding: '0.4rem', borderRadius: '4px' }}
                    />
                    <button onClick={() => removeMapping(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
            <button
                onClick={addMapping}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    color: '#3b82f6', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '0.9rem', marginTop: '0.5rem'
                }}
            >
                <Plus size={16} /> Add Field Map
            </button>
        </div>
    );
}
