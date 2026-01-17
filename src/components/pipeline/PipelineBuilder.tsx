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

import React, { useState, useRef, useCallback } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    Connection,
    Edge,
    Node,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import PipelineSidebar from './PipelineSidebar';
import StatusBadge from '../StatusBadge';
import { SourceNode, RestApiNode, TransformJsonNode, DestinationNode, FileDestinationNode, PostgresDestinationNode, MysqlDestinationNode } from './CustomNodes';
import { Connection as ConnectionType } from '@/types';
import styles from './PipelineBuilder.module.css';

const nodeTypes = {
    source: SourceNode,
    rest_api: RestApiNode,
    transform_json: TransformJsonNode,
    destination: DestinationNode, // Generic/Neo4j
    file_destination: FileDestinationNode,
    postgres_destination: PostgresDestinationNode,
    mysql_destination: MysqlDestinationNode,
};

const getId = () => `dndnode_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

import NodeConfigPanel from './NodeConfigPanel';
import AlertModal from '../AlertModal';
import ConfirmationModal from '../ConfirmationModal';
import DebugResultModal from './DebugResultModal';
import { History, ChevronDown } from 'lucide-react';
import ExecutionHistoryPanel from './ExecutionHistoryPanel';

interface Props {
    connection: ConnectionType;
    onClose: () => void;
    onUpdateStatus?: (status: 'ACTIVE' | 'PAUSED') => void;
}

const PipelineBuilderContent = ({ connection, onClose, onUpdateStatus }: Props) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [alertState, setAlertState] = useState<{ isOpen: boolean, title: string, message: string, type: 'success' | 'error' | 'info' }>({
        isOpen: false, title: '', message: '', type: 'info'
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // New State for Running/Debugging
    const [isRunning, setIsRunning] = useState(false);
    const [isRunMenuOpen, setIsRunMenuOpen] = useState(false);
    const [debugResult, setDebugResult] = useState<any>(null);
    const [showHistory, setShowHistory] = useState(false);

    const isActive = connection.status !== 'PAUSED';

    // Load pipeline
    React.useEffect(() => {
        const fetchPipeline = async () => {
            try {
                const res = await fetch(`/api/connections/${connection.id}/pipeline`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.flow_config) {
                        const { nodes: savedNodes, edges: savedEdges } = data.flow_config;
                        setNodes(savedNodes || []);
                        setEdges(savedEdges || []);
                        return; // Loaded successfully, skip default init
                    }
                }
            } catch (error) {
                console.error('Failed to load pipeline:', error);
            }

            // Default initialization if no saved pipeline
            if (nodes.length === 0) {
                setNodes([
                    {
                        id: 'source-1',
                        type: 'source',
                        position: { x: 50, y: 250 },
                        data: { label: connection.name, subLabel: connection.type, type: connection.type },
                        draggable: false, // Lock source
                    },
                ]);
            }
        };

        fetchPipeline();
    }, [connection.id, connection.name, connection.type, setNodes, setEdges]); // Removed nodes.length dependency to allow loading

    const onConnect = useCallback(
        (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
        [setEdges]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            const label = event.dataTransfer.getData('application/reactflow/label');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: getId(),
                type,
                position,
                data: { label: label },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        // Prevent opening for Source nodes if they don't need config,
        // but for now let's allow all non-source nodes or all nodes.
        if (node.type !== 'source') {
            setSelectedNode(node);
        } else {
            setSelectedNode(null);
        }
    }, []);

    const onUpdateNode = useCallback((id: string, data: any) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    // Update the local selected node too so the panel inputs don't lose focus/state weirdly
                    // although updating the main flow state triggers access to 'node'.
                    return { ...node, data: { ...node.data, ...data } };
                }
                return node;
            })
        );
        // Also update the selected node reference to keep the panel in sync immediately
        setSelectedNode((prev) => prev && prev.id === id ? { ...prev, data: { ...prev.data, ...data } } : prev);
    }, [setNodes]);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    const handleSave = async (silent: boolean = false) => {
        if (!reactFlowInstance) return;

        const flow = reactFlowInstance.toObject();
        try {
            const res = await fetch(`/api/connections/${connection.id}/pipeline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `Pipeline for ${connection.name}`,
                    flowConfig: flow
                    // isActive is now managed on Connection level
                })
            });

            if (!res.ok) throw new Error('Failed to save');

            if (!silent) {
                setAlertState({
                    isOpen: true,
                    title: 'Success',
                    message: 'Pipeline saved successfully!',
                    type: 'success'
                });
            }
        } catch (error) {
            console.error('Save error:', error);
            setAlertState({
                isOpen: true,
                title: 'Error',
                message: 'Failed to save pipeline.',
                type: 'error'
            });
        }
    };

    const handleRunPipeline = async (debug: boolean = false) => {
        setIsRunning(true);
        setIsRunMenuOpen(false);
        try {
            // Auto-save before running to ensure latest config is used
            await handleSave(true);

            const res = await fetch(`/api/connections/${connection.id}/pipeline/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ debug })
            });

            const data = await res.json();

            if (data.success) {
                if (debug) {
                    setDebugResult(data);
                } else {
                    setAlertState({
                        isOpen: true,
                        title: 'Pipeline Started',
                        message: 'Pipeline execution started successfully.',
                        type: 'success'
                    });
                }
            } else {
                setAlertState({
                    isOpen: true,
                    title: 'Execution Failed',
                    message: data.error || 'Unknown error',
                    type: 'error'
                });
            }

        } catch (error: any) {
            console.error('Run error:', error);
            setAlertState({
                isOpen: true,
                title: 'Execution Error',
                message: error.message,
                type: 'error'
            });
        } finally {
            setIsRunning(false);
        }
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        setShowDeleteConfirm(false);

        try {
            const res = await fetch(`/api/connections/${connection.id}/pipeline`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Failed to delete');

            setAlertState({
                isOpen: true,
                title: 'Deleted',
                message: 'Pipeline deleted successfully!',
                type: 'success'
            });
            setTimeout(() => onClose(), 1500); // Auto close after success
        } catch (error) {
            console.error('Delete error:', error);
            setAlertState({
                isOpen: true,
                title: 'Error',
                message: 'Failed to delete pipeline.',
                type: 'error'
            });
        }
    };

    const toggleStatus = async () => {
        if (onUpdateStatus) {
            onUpdateStatus(isActive ? 'PAUSED' : 'ACTIVE');
        }
    };

    const handleViewDebugHistory = (execution: any, debugData: any) => {
        setDebugResult({
            success: execution.status === 'COMPLETED',
            executionId: execution.id,
            error: execution.status === 'FAILED' ? 'Pipeline execution failed' : undefined, // Simplification, ideally we find the error in logs or store it better
            debugData: debugData
        });
        setShowHistory(false); // Close history panel to show debug panel
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #262626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#a3a3a3',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: 0
                        }}
                    >
                        ← Back
                    </button>
                    <div style={{ width: '1px', height: '24px', background: '#262626' }}></div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Pipeline Builder: {connection.name}</h2>
                    <StatusBadge status={connection.status} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>

                    {/* Run Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', background: isRunning ? '#404040' : '#10b981', borderRadius: '4px' }}>
                            <button
                                onClick={() => handleRunPipeline(false)}
                                disabled={isRunning}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#fff',
                                    cursor: isRunning ? 'not-allowed' : 'pointer',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    borderRight: '1px solid rgba(0,0,0,0.1)'
                                }}
                            >
                                {isRunning ? 'Running...' : '▶ Run Now'}
                            </button>
                            <button
                                onClick={() => setIsRunMenuOpen(!isRunMenuOpen)}
                                disabled={isRunning}
                                style={{
                                    padding: '0.5rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#fff',
                                    cursor: isRunning ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        {/* Dropdown Menu */}
                        {isRunMenuOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '0.5rem',
                                background: '#262626',
                                border: '1px solid #404040',
                                borderRadius: '4px',
                                width: '150px',
                                zIndex: 50,
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}>
                                <button
                                    onClick={() => handleRunPipeline(false)}
                                    style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '0.75rem 1rem',
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: '1px solid #333',
                                        color: '#e5e5e5',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    Run Now
                                </button>
                                <button
                                    onClick={() => handleRunPipeline(true)}
                                    style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '0.75rem 1rem',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#e5e5e5',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    Run Debug
                                </button>
                            </div>
                        )}

                        {/* Overlay to close menu when clicking outside */}
                        {isRunMenuOpen && (
                            <div
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
                                onClick={() => setIsRunMenuOpen(false)}
                            />
                        )}
                    </div>

                    {/* History Button */}
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        style={{
                            padding: '0.5rem',
                            background: showHistory ? '#404040' : 'transparent',
                            border: '1px solid #404040',
                            color: '#e5e5e5',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="View Run History"
                    >
                        <History size={18} />
                    </button>

                    <div style={{ width: '1px', height: '24px', background: '#262626', margin: '0 0.5rem' }}></div>

                    <button
                        onClick={toggleStatus}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#262626',
                            border: '1px solid #404040',
                            color: '#e5e5e5',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {isActive ? '⏸ Pause' : '▶ Start'}
                    </button>
                    <button onClick={handleDelete} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                    <div style={{ width: '1px', background: '#262626', margin: '0 0.5rem' }}></div>
                    <button onClick={() => handleSave(false)} style={{ padding: '0.5rem 1rem', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>Save Pipeline</button>
                </div>
            </div>

            <div style={{ display: 'flex', flexGrow: 1, position: 'relative' }}>
                <PipelineSidebar />
                <div className={`reactflow-wrapper ${styles.pipelineWrapper}`} ref={reactFlowWrapper} style={{ flexGrow: 1, height: '100%', borderLeft: '1px solid #262626' }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setReactFlowInstance}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.5, maxZoom: 1 }}
                    >
                        <Controls />
                        <Background color="#262626" gap={16} />
                    </ReactFlow>
                </div>

                {/* Side Panels */}
                <NodeConfigPanel
                    node={selectedNode}
                    onClose={() => setSelectedNode(null)}
                    onUpdate={onUpdateNode}
                />

                {showHistory && (
                    <ExecutionHistoryPanel
                        connectionId={connection.id}
                        onClose={() => setShowHistory(false)}
                        onViewDebug={handleViewDebugHistory}
                    />
                )}

                <DebugResultModal
                    isOpen={!!debugResult}
                    onClose={() => setDebugResult(null)}
                    results={debugResult}
                    executionId={debugResult?.executionId}
                    nodes={nodes}
                />
            </div>

            {/* Modals */}
            {showDeleteConfirm && (
                <ConfirmationModal
                    isOpen={showDeleteConfirm}
                    title="Delete Pipeline"
                    message="Are you sure you want to delete this pipeline? This cannot be undone."
                    onConfirm={confirmDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                    confirmText="Delete"
                    cancelText="Cancel"
                />
            )}
            <AlertModal
                isOpen={alertState.isOpen}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                onClose={() => setAlertState({ ...alertState, isOpen: false })}
            />
        </div>
    );
};

export default function PipelineBuilder(props: Props) {
    return (
        <ReactFlowProvider>
            <PipelineBuilderContent {...props} />
        </ReactFlowProvider>
    );
}
