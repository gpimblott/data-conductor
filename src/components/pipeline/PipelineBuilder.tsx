
/*
 * DataConductor
 * Copyright (C) 2026
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
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
import styles from './PipelineBuilder.module.css';
import { SplitButton } from '@/components/ui/SplitButton';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Download, Upload, History, Settings, Folder, X } from 'lucide-react';
import { handleSignOut } from '@/lib/actions';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import ExecutionHistoryPanel from './ExecutionHistoryPanel';
import PipelineFilesPanel from './PipelineFilesPanel';
import NodeConfigPanel from './NodeConfigPanel';
import AlertModal from '../AlertModal';
import ConfirmationModal from '../ConfirmationModal';
import DebugResultModal from './DebugResultModal';
import PipelineSettingsModal from './PipelineSettingsModal';

const nodeTypes = {
    source: SourceNode,
    rest_api: RestApiNode,
    transform_json: TransformJsonNode,
    destination: DestinationNode,
    file_destination: FileDestinationNode,
    postgres_destination: PostgresDestinationNode,
    mysql_destination: MysqlDestinationNode,
};

const getId = () => `dndnode_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

interface Props {
    pipelineId: string;
    onClose: () => void;
}

const PipelineBuilderContent = ({ pipelineId, onClose }: Props) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    // Pipeline Metadata State
    const [pipeline, setPipeline] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // UI State
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [alertState, setAlertState] = useState<{ isOpen: boolean, title: string, message: string, type: 'success' | 'error' | 'info' }>({
        isOpen: false, title: '', message: '', type: 'info'
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [debugResult, setDebugResult] = useState<any>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showDataFiles, setShowDataFiles] = useState(false);

    // Load Pipeline
    useEffect(() => {
        const fetchPipeline = async () => {
            try {
                const res = await fetch(`/api/pipelines/${pipelineId}`);
                if (res.ok) {
                    const data = await res.json();
                    setPipeline(data);

                    if (data.flow_config) {
                        const { nodes: savedNodes, edges: savedEdges } = data.flow_config;
                        setNodes(savedNodes || []);
                        setEdges(savedEdges || []);
                    } else {
                        // Default empty state or placeholder?
                        // If new, maybe empty.
                    }
                } else {
                    setAlertState({ isOpen: true, title: 'Error', message: 'Failed to load pipeline', type: 'error' });
                }
            } catch (error) {
                console.error('Failed to load pipeline:', error);
                setAlertState({ isOpen: true, title: 'Error', message: 'Failed to load pipeline', type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        if (pipelineId) {
            fetchPipeline();
        }
    }, [pipelineId, setNodes, setEdges]);


    const handleExport = useCallback(() => {
        if (reactFlowInstance && pipeline) {
            const flow = reactFlowInstance.toObject();
            const exportData = {
                name: pipeline.name,
                timestamp: new Date().toISOString(),
                flowConfig: flow
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pipeline-${(pipeline.name || 'export').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }, [reactFlowInstance, pipeline]);

    const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const importData = JSON.parse(content);
                const flow = importData.flowConfig || importData;

                if (flow && flow.nodes && flow.edges) {
                    if (confirm('Importing will overwrite the current pipeline configuration. Continue?')) {
                        setNodes(flow.nodes || []);
                        setEdges(flow.edges || []);
                        if (flow.viewport && reactFlowInstance) {
                            reactFlowInstance.setViewport(flow.viewport);
                        }
                        setAlertState({ isOpen: true, title: 'Success', message: 'Pipeline imported successfully!', type: 'success' });
                    }
                } else {
                    alert('Invalid pipeline file format.');
                }
            } catch (error) {
                console.error('Import error', error);
                alert('Failed to parse pipeline file.');
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    }, [reactFlowInstance, setNodes, setEdges]);


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
            const connectionType = event.dataTransfer.getData('application/reactflow/connectionType');

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

            // Initialize Source Node with connectionType if provided
            if (type === 'source' && connectionType) {
                newNode.data = {
                    ...newNode.data,
                    connectionType,
                    name: label,
                    connectionConfig: {} // Empty config to start
                };
            }

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, []);

    const onUpdateNode = useCallback((id: string, data: any) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, ...data } };
                }
                return node;
            })
        );
        setSelectedNode((prev) => prev && prev.id === id ? { ...prev, data: { ...prev.data, ...data } } : prev);
    }, [setNodes]);

    const handleSave = async (silent: boolean = false) => {
        if (!reactFlowInstance || !pipeline) return;

        const flow = reactFlowInstance.toObject();
        try {
            const res = await fetch(`/api/pipelines/${pipelineId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    flowConfig: flow,
                    // Preserve existing props unless we add UI to edit them here
                    name: pipeline.name,
                    description: pipeline.description,
                    status: pipeline.status
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
            // Update local state version if needed? No need.
        } catch (error) {
            console.error('Save error:', error);
            setAlertState({ isOpen: true, title: 'Error', message: 'Failed to save pipeline.', type: 'error' });
        }
    };

    const handleRunPipeline = async (debug: boolean = false) => {
        setIsRunning(true);
        try {
            await handleSave(true); // Auto-save

            const res = await fetch(`/api/pipelines/${pipelineId}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ debug })
            });

            const data = await res.json();

            if (data.success) {
                if (debug) {
                    const executionId = data.executionId;

                    // Poll function
                    const checkStatus = async () => {
                        try {
                            const statusRes = await fetch(`/api/pipelines/${pipelineId}/executions/${executionId}`);
                            if (statusRes.ok) {
                                const execution = await statusRes.json();
                                if (execution.status === 'COMPLETED' || execution.status === 'FAILED') {

                                    // Extract Debug Data
                                    let debugData = null;
                                    if (execution.logs && Array.isArray(execution.logs)) {
                                        const debugLog = execution.logs.find((l: any) => l.message === 'Debug Data Captured');
                                        if (debugLog) {
                                            debugData = debugLog.details;
                                            if (typeof debugData === 'string') {
                                                try { debugData = JSON.parse(debugData); } catch (e) { }
                                            }
                                        }
                                    }

                                    setDebugResult({
                                        success: execution.status === 'COMPLETED',
                                        executionId: execution.id,
                                        error: execution.status === 'FAILED' ? 'Pipeline execution failed' : undefined,
                                        debugData: debugData
                                    });
                                    setIsRunning(false);
                                    return true; // Done
                                }
                            }
                        } catch (e) {
                            console.error('Polling error', e);
                        }
                        return false; // Not done
                    };

                    // Start Polling
                    const interval = setInterval(async () => {
                        const done = await checkStatus();
                        if (done) clearInterval(interval);
                    }, 1000);

                    // Timeout safety (2 mins)
                    setTimeout(() => {
                        clearInterval(interval);
                        setIsRunning(prev => {
                            if (prev) { // If still running
                                setAlertState({ isOpen: true, title: 'Timeout', message: 'Debug execution timed out waiting for results.', type: 'error' });
                                return false;
                            }
                            return prev;
                        });
                    }, 120000);

                } else {
                    setAlertState({
                        isOpen: true,
                        title: 'Pipeline Started',
                        message: 'Pipeline execution started successfully.',
                        type: 'success'
                    });
                    setIsRunning(false);
                }
            } else {
                setAlertState({
                    isOpen: true,
                    title: 'Execution Failed',
                    message: data.error || 'Unknown error',
                    type: 'error'
                });
                setIsRunning(false);
            }
        } catch (error: any) {
            console.error('Run error:', error);
            setAlertState({ isOpen: true, title: 'Execution Error', message: error.message, type: 'error' });
            setIsRunning(false);
        }
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        setShowDeleteConfirm(false);
        try {
            const res = await fetch(`/api/pipelines/${pipelineId}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Failed to delete');

            setAlertState({ isOpen: true, title: 'Deleted', message: 'Pipeline deleted successfully!', type: 'success' });
            setTimeout(() => onClose(), 1500);
        } catch (error) {
            console.error('Delete error:', error);
            setAlertState({ isOpen: true, title: 'Error', message: 'Failed to delete pipeline.', type: 'error' });
        }
    };

    const handleRestoreVersion = async (versionId: string) => {
        try {
            const res = await fetch(`/api/pipelines/${pipelineId}/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ versionId })
            });

            if (res.ok) {
                window.location.reload();
            } else {
                throw new Error('Failed to restore');
            }
        } catch (error) {
            console.error('Restore error:', error);
            setAlertState({ isOpen: true, title: 'Error', message: 'Failed to restore version', type: 'error' });
        }
    };

    const toggleStatus = async () => {
        if (!pipeline) return;
        const newStatus = pipeline.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

        try {
            const res = await fetch(`/api/pipelines/${pipelineId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                setPipeline({ ...pipeline, status: newStatus });
                setAlertState({ isOpen: true, title: 'Success', message: `Pipeline ${newStatus === 'ACTIVE' ? 'activated' : 'paused'}.`, type: 'success' });
            }
        } catch (error) {
            setAlertState({ isOpen: true, title: 'Error', message: 'Failed to update status', type: 'error' });
        }
    };

    const handleViewDebugHistory = (execution: any, debugData: any) => {
        setDebugResult({
            success: execution.status === 'COMPLETED',
            executionId: execution.id,
            error: execution.status === 'FAILED' ? 'Pipeline execution failed' : undefined,
            debugData: debugData
        });
        setShowHistory(false);
    };

    const handleSaveSettings = async (id: string, data: any) => {
        try {
            const res = await fetch(`/api/pipelines/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!res.ok) throw new Error('Failed to update settings');

            setPipeline((prev: any) => ({ ...prev, ...data }));
            setAlertState({ isOpen: true, title: 'Success', message: 'Pipeline settings saved!', type: 'success' });
        } catch (error) {
            console.error('Settings save error:', error);
            setAlertState({ isOpen: true, title: 'Error', message: 'Failed to update settings.', type: 'error' });
            throw error;
        }
    };

    if (loading) {
        return <div style={{ background: '#0a0a0a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Loading Pipeline...</div>;
    }

    if (!pipeline) {
        return <div style={{ background: '#0a0a0a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>Pipeline Not Found</div>;
    }

    const isActive = pipeline.status === 'ACTIVE';

    // Breadcrumb logic: Use pipeline name
    // Dashboard -> Pipelines -> [Name]
    const breadcrumbs = [
        { label: 'Dashboard', href: '/' },
        { label: 'Pipelines', href: '/pipelines' },
        { label: pipeline.name || 'Untitled Pipeline', href: `/pipelines/${pipelineId}` },
        { label: 'Edit' }
    ];


    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
            <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #262626', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#171717', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Image
                            src="/icon.png"
                            alt="Logo"
                            width={24}
                            height={24}
                            style={{ borderRadius: '4px' }}
                        />
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em', margin: 0 }}>DataConductor</h1>
                    </div>

                    <div style={{ width: '1px', height: '24px', background: '#404040' }}></div>

                    <Breadcrumb items={breadcrumbs} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleImport} />

                    <SplitButton
                        label={isRunning ? "Running..." : "▶ Run Pipeline"}
                        variant="primary"
                        onClick={() => handleRunPipeline(false)}
                        isLoading={isRunning}
                        disabled={isRunning}
                    >
                        <DropdownItem onClick={() => handleRunPipeline(false)} icon="▶">
                            Run Pipeline
                        </DropdownItem>
                        <DropdownItem onClick={() => handleRunPipeline(true)} icon="🐞">
                            Run Debug
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem
                            onClick={toggleStatus}
                            icon={isActive ? "⏸" : "▶"}
                        >
                            {isActive ? 'Pause Pipeline' : 'Activate Pipeline'}
                        </DropdownItem>
                    </SplitButton>

                    <button
                        onClick={() => handleSave(false)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#262626',
                            border: '1px solid #404040',
                            color: '#fff',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 500,
                            height: '36px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#404040'; e.currentTarget.style.borderColor = '#525252'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#262626'; e.currentTarget.style.borderColor = '#404040'; }}
                    >
                        Save
                    </button>

                    <Dropdown trigger={
                        <button style={{
                            padding: '0.5rem',
                            background: 'transparent',
                            border: '1px solid #404040',
                            color: '#e5e5e5',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            height: '36px'
                        }}>
                            Actions ▾
                        </button>
                    }>
                        <DropdownItem onClick={() => setShowSettings(true)} icon={<Settings size={14} />}>
                            Pipeline Settings
                        </DropdownItem>
                        <DropdownItem onClick={() => { setShowDataFiles(!showDataFiles); setShowHistory(false); setShowVersionHistory(false); }} icon={<Folder size={14} />}>
                            {showDataFiles ? 'Hide Data Files' : 'View Data Files'}
                        </DropdownItem>
                        <DropdownItem onClick={() => { setShowHistory(!showHistory); setShowDataFiles(false); setShowVersionHistory(false); }} icon="🕒">
                            {showHistory ? 'Hide Run History' : 'View Run History'}
                        </DropdownItem>
                        <DropdownItem onClick={() => setShowVersionHistory(true)} icon="🔖">
                            Version History
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem onClick={() => fileInputRef.current?.click()} icon="📥">
                            Import Pipeline
                        </DropdownItem>
                        <DropdownItem onClick={handleExport} icon="📤">
                            Export Pipeline
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem variant="danger" onClick={handleDelete} icon="🗑">
                            Delete Pipeline
                        </DropdownItem>
                    </Dropdown>

                    <div style={{ width: '1px', height: '20px', background: '#404040', margin: '0 0.5rem' }}></div>

                    <form action={handleSignOut}>
                        <button
                            type="submit"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#a3a3a3',
                                fontSize: '0.875rem',
                                padding: '0.5rem',
                                cursor: 'pointer',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            Sign Out
                        </button>
                    </form>

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
                        onPaneClick={() => setSelectedNode(null)}
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
                        pipelineId={pipelineId}
                        onClose={() => setShowHistory(false)}
                        onViewDebug={handleViewDebugHistory}
                    />
                )}

                {showDataFiles && (
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
                        zIndex: 15
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: '#e5e5e5', fontSize: '1.1rem', fontWeight: 600 }}>Data Files</h3>
                            <button onClick={() => setShowDataFiles(false)} style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <PipelineFilesPanel pipelineId={pipelineId} />
                    </div>
                )}

                {showVersionHistory && (
                    <VersionHistoryPanel
                        onClose={() => setShowVersionHistory(false)}
                        pipelineId={pipelineId}
                        onRestore={handleRestoreVersion}
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
            <PipelineSettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                pipeline={pipeline}
                onSave={handleSaveSettings}
            />
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
