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

import { useState } from 'react';
import { Database, FileText, Filter, Workflow, Globe, FileJson, File as FileIcon, Rss, Sparkles, ChevronRight, ChevronDown, Share2 } from 'lucide-react';

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
        <aside
            className="custom-scrollbar"
            style={{
                width: '250px',
                padding: '1rem',
                borderRight: '1px solid #262626',
                background: '#0a0a0a',
                color: '#ededed',
                overflowY: 'auto',
                height: '100%'
            }}
        >
            <div style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Toolbox</div>

            <SidebarSection title="Sources" isOpenDefault={true}>
                <DraggableItem onDragStart={(e) => onDragStart(e, 'source', 'RSS Feed', 'RSS')} icon={<Rss size={16} />} label="RSS Feed" />
                <DraggableItem onDragStart={(e) => onDragStart(e, 'source', 'HTTP Request', 'HTTP')} icon={<Globe size={16} />} label="HTTP Request" />
                <DraggableItem onDragStart={(e) => onDragStart(e, 'source', 'SQL Database', 'DATABASE')} icon={<Database size={16} />} label="SQL Database" />
            </SidebarSection>

            <SidebarSection title="Processors" isOpenDefault={true}>
                <DraggableItem onDragStart={(e) => onDragStart(e, 'rest_api', 'REST API')} icon={<Globe size={16} />} label="REST API" />
                <DraggableItem onDragStart={(e) => onDragStart(e, 'transform_json', 'Transform JSON')} icon={<FileJson size={16} />} label="Transform JSON" />
                <DraggableItem onDragStart={(e) => onDragStart(e, 'openai', 'OpenAI API')} icon={<Sparkles size={16} />} label="OpenAI API" />
            </SidebarSection>

            <SidebarSection title="Destinations" isOpenDefault={true}>
                <DraggableItem onDragStart={(e) => onDragStart(e, 'postgres_destination', 'Postgres DB')} icon={<Database size={16} />} label="Postgres DB" />
                <DraggableItem onDragStart={(e) => onDragStart(e, 'mysql_destination', 'MySQL DB')} icon={<Database size={16} color="#4ade80" />} label="MySQL DB" />
                <DraggableItem onDragStart={(e) => onDragStart(e, 'file_destination', 'File Output')} icon={<FileIcon size={16} />} label="File Output" />
                <DraggableItem onDragStart={(e) => onDragStart(e, 'destination', 'Neo4j Graph')} icon={<Share2 size={16} />} label="Neo4j Graph" />
            </SidebarSection>

            <div style={{ fontSize: '0.8rem', color: '#525252', marginTop: '2rem' }}>
                Drag items to the canvas to build your pipeline.
            </div>
        </aside>
    );
}

const SidebarSection = ({ title, children, isOpenDefault = false }: { title: string, children: React.ReactNode, isOpenDefault?: boolean }) => {
    const [isOpen, setIsOpen] = useState(isOpenDefault);

    return (
        <div style={{ marginBottom: '1rem' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    color: '#a3a3a3',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0.25rem 0',
                    marginBottom: '0.5rem'
                }}
            >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {title}
            </button>

            {isOpen && (
                <div style={{ paddingLeft: '0.5rem' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

const DraggableItem = ({ onDragStart, icon, label }: { onDragStart: (e: React.DragEvent) => void, icon: React.ReactNode, label: string }) => {
    return (
        <div
            draggable
            onDragStart={onDragStart}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.75rem',
                marginBottom: '0.5rem',
                background: '#171717',
                border: '1px solid #262626',
                borderRadius: '6px',
                cursor: 'grab',
                fontSize: '0.9rem',
                userSelect: 'none',
                transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#404040';
                e.currentTarget.style.background = '#262626';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#262626';
                e.currentTarget.style.background = '#171717';
            }}
        >
            <div style={{ color: '#737373' }}>{icon}</div>
            {label}
        </div>
    );
};
