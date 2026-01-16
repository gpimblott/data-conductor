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

import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Database, Rss, ArrowRight, Settings, X, Globe, FileJson, File as FileIcon } from 'lucide-react';

const nodeStyle = {
    background: '#171717',
    border: '1px solid #262626',
    borderRadius: '8px',
    padding: '10px',
    minWidth: '150px',
    color: '#fff',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
};

const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    borderBottom: '1px solid #262626',
    paddingBottom: '8px',
    fontWeight: 600 as const
};

const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
};

const deleteButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: '#ed5e5e', // Red color for delete
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    marginLeft: 'auto'
};

export const SourceNode = memo(({ data }: NodeProps) => {
    return (
        <div style={{ ...nodeStyle, borderLeft: '4px solid #3b82f6' }}>
            <div style={headerStyle}>
                <div style={labelStyle}>
                    {data.type === 'DATABASE' ? <Database size={14} color="#3b82f6" /> : <Rss size={14} color="#3b82f6" />}
                    {data.label}
                </div>
            </div>
            <div style={{ color: '#a3a3a3' }}>Source: {data.subLabel}</div>
            <Handle type="source" position={Position.Right} style={{ background: '#3b82f6' }} />
        </div>
    );
});

export const RestApiNode = memo(({ id, data }: NodeProps) => {
    const { deleteElements } = useReactFlow();

    const onDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this node?')) {
            deleteElements({ nodes: [{ id }] });
        }
    };

    return (
        <div style={{ ...nodeStyle, borderLeft: '4px solid #f59e0b' }}>
            <Handle type="target" position={Position.Left} style={{ background: '#f59e0b' }} />
            <div style={headerStyle}>
                <div style={labelStyle}>
                    <Globe size={14} color="#f59e0b" />
                    {data.label}
                </div>
                <button style={deleteButtonStyle} onClick={onDelete} title="Delete Node">
                    <X size={14} />
                </button>
            </div>
            <div style={{ color: '#a3a3a3' }}>REST API</div>
            <Handle type="source" position={Position.Right} style={{ background: '#f59e0b' }} />
        </div>
    );
});

export const TransformJsonNode = memo(({ id, data }: NodeProps) => {
    const { deleteElements } = useReactFlow();

    const onDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this node?')) {
            deleteElements({ nodes: [{ id }] });
        }
    };

    return (
        <div style={{ ...nodeStyle, borderLeft: '4px solid #ec4899' }}>
            <Handle type="target" position={Position.Left} style={{ background: '#ec4899' }} />
            <div style={headerStyle}>
                <div style={labelStyle}>
                    <FileJson size={14} color="#ec4899" />
                    {data.label}
                </div>
                <button style={deleteButtonStyle} onClick={onDelete} title="Delete Node">
                    <X size={14} />
                </button>
            </div>
            <div style={{ color: '#a3a3a3' }}>Transform</div>
            <Handle type="source" position={Position.Right} style={{ background: '#ec4899' }} />
        </div>
    );
});

export const DestinationNode = memo(({ id, data }: NodeProps) => {
    const { deleteElements } = useReactFlow();

    const onDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this node?')) {
            deleteElements({ nodes: [{ id }] });
        }
    };

    return (
        <div style={{ ...nodeStyle, borderLeft: '4px solid #10b981' }}>
            <Handle type="target" position={Position.Left} style={{ background: '#10b981' }} />
            <div style={headerStyle}>
                <div style={labelStyle}>
                    <Database size={14} color="#10b981" />
                    {data.label}
                </div>
                <button style={deleteButtonStyle} onClick={onDelete} title="Delete Node">
                    <X size={14} />
                </button>
            </div>
            <div style={{ color: '#a3a3a3' }}>Destination</div>
        </div>
    );
});

export const FileDestinationNode = memo(({ id, data }: NodeProps) => {
    const { deleteElements } = useReactFlow();

    const onDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this node?')) {
            deleteElements({ nodes: [{ id }] });
        }
    };

    return (
        <div style={{ ...nodeStyle, borderLeft: '4px solid #64748b' }}>
            <Handle type="target" position={Position.Left} style={{ background: '#64748b' }} />
            <div style={headerStyle}>
                <div style={labelStyle}>
                    <FileIcon size={14} color="#64748b" />
                    {data.label}
                </div>
                <button style={deleteButtonStyle} onClick={onDelete} title="Delete Node">
                    <X size={14} />
                </button>
            </div>
            <div style={{ color: '#a3a3a3' }}>File Output</div>
        </div>
    );
});

export const PostgresDestinationNode = memo(({ id, data }: NodeProps) => {
    const { deleteElements } = useReactFlow();

    const onDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this node?')) {
            deleteElements({ nodes: [{ id }] });
        }
    };

    return (
        <div style={{ ...nodeStyle, borderLeft: '4px solid #336791' }}>
            <Handle type="target" position={Position.Left} style={{ background: '#336791' }} />
            <div style={headerStyle}>
                <div style={labelStyle}>
                    <Database size={14} color="#336791" />
                    {data.label}
                </div>
                <button style={deleteButtonStyle} onClick={onDelete} title="Delete Node">
                    <X size={14} />
                </button>
            </div>
            <div style={{ color: '#a3a3a3' }}>Postgres DB</div>
        </div>
    );
});

export const MysqlDestinationNode = memo(({ id, data }: NodeProps) => {
    const { deleteElements } = useReactFlow();

    const onDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this node?')) {
            deleteElements({ nodes: [{ id }] });
        }
    };

    return (
        <div style={{ padding: '10px', border: '1px solid #4ade80', borderRadius: '5px', background: '#1c1917', minWidth: '150px' }}>
            <Handle type="target" position={Position.Left} style={{ background: '#4ade80' }} />
            <div style={headerStyle}>
                <div style={labelStyle}>
                    <Database size={14} color="#4ade80" />
                    {data.label}
                </div>
                <button style={deleteButtonStyle} onClick={onDelete} title="Delete Node">
                    <X size={14} />
                </button>
            </div>
            <div style={{ color: '#a3a3a3' }}>MySQL DB</div>
        </div>
    );
});
