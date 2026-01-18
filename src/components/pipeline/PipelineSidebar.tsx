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

import { Database, FileText, Filter, Workflow, Globe, FileJson, File as FileIcon, Rss, Sparkles } from 'lucide-react';

export default function PipelineSidebar() {
    const onDragStart = (event: React.DragEvent, nodeType: string, label: string, connectionType?: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('application/reactflow/label', label);
        if (connectionType) {
            event.dataTransfer.setData('application/reactflow/connectionType', connectionType);
        }
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside style={{
            width: '250px',
            padding: '1rem',
            borderRight: '1px solid #262626',
            background: '#0a0a0a',
            color: '#ededed'
        }}>
            <div style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Toolbox</div>

            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem', fontWeight: 600 }}>Sources</div>
                <div
                    draggable
                    onDragStart={(event) => onDragStart(event, 'source', 'RSS Feed', 'RSS')}
                    style={itemStyle}
                >
                    <Rss size={16} /> RSS Feed
                </div>
                <div
                    draggable
                    onDragStart={(event) => onDragStart(event, 'source', 'HTTP Request', 'HTTP')}
                    style={itemStyle}
                >
                    <Globe size={16} /> HTTP Request
                </div>
                <div
                    draggable
                    onDragStart={(event) => onDragStart(event, 'source', 'Database', 'DATABASE')}
                    style={itemStyle}
                >
                    <Database size={16} /> Database (Postgres/MySQL)
                </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem', fontWeight: 600 }}>Processors</div>
                <div
                    draggable
                    onDragStart={(event) => onDragStart(event, 'rest_api', 'REST API')}
                    style={itemStyle}
                >
                    <Globe size={16} /> REST API
                </div>
                <div
                    draggable
                    onDragStart={(event) => onDragStart(event, 'transform_json', 'Transform JSON')}
                    style={itemStyle}
                >
                    <FileJson size={16} /> Transform JSON
                </div>
                <div
                    draggable
                    onDragStart={(event) => onDragStart(event, 'openai', 'OpenAI API')}
                    style={itemStyle}
                >
                    <Sparkles size={16} /> OpenAI API
                </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem', fontWeight: 600 }}>Destinations</div>
                <div
                    draggable
                    onDragStart={(event) => onDragStart(event, 'postgres_destination', 'Postgres DB')}
                    style={itemStyle}
                >
                    <Database size={16} /> Postgres DB
                </div>
                <div
                    draggable
                    onDragStart={(event) => onDragStart(event, 'mysql_destination', 'MySQL DB')}
                    style={itemStyle}
                >
                    <Database size={16} color="#4ade80" /> MySQL DB
                </div>
                <div
                    draggable
                    onDragStart={(event) => onDragStart(event, 'file_destination', 'File Output')}
                    style={itemStyle}
                >
                    <FileIcon size={16} /> File Output
                </div>
                <div
                    draggable
                    onDragStart={(event) => onDragStart(event, 'destination', 'Neo4j Graph')}
                    style={itemStyle}
                >
                    <Share2Icon size={16} /> Neo4j Graph
                </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#525252', marginTop: '2rem' }}>
                Drag items to the canvas to build your pipeline.
            </div>
        </aside>
    );
}

// Icon wrapper for Share2 since it's not imported above to avoid errors if lucide version varies
const Share2Icon = ({ size }: { size: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
        <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
);

const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    marginBottom: '0.5rem',
    background: '#171717',
    border: '1px solid #262626',
    borderRadius: '6px',
    cursor: 'grab',
    fontSize: '0.9rem',
    userSelect: 'none',
    transition: 'all 0.2s'
};
