import React from 'react';
import { Node } from 'reactflow';
import { X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    results: any;
    executionId?: string;
    nodes: Node[];
}

export default function DebugResultModal({ isOpen, onClose, results, executionId, nodes }: Props) {
    if (!isOpen) return null;

    const getNodeName = (id: string) => {
        // First try to check if the result itself has the label (new format)
        if (results?.debugData?.[id]?.label) {
            return results.debugData[id].label;
        }
        // Fallback to current nodes default
        const node = nodes.find(n => n.id === id);
        return node?.data?.label || id;
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '600px',
            background: '#171717',
            borderLeft: '1px solid #262626',
            padding: '1.5rem',
            overflowY: 'auto',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#e5e5e5', fontSize: '1.1rem', fontWeight: 600 }}>Pipeline Execution Result</h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer' }}>
                    <X size={20} />
                </button>
            </div>

            <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <strong style={{ color: '#a3a3a3' }}>Execution ID:</strong> <span style={{ fontFamily: 'monospace', color: '#e5e5e5', marginLeft: '0.5rem' }}>{executionId}</span>
                    {results?.success ? (
                        <span style={{ marginLeft: '1rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>Success</span>
                    ) : (
                        <span style={{ marginLeft: '1rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>Failed</span>
                    )}
                </div>

                {!results?.success && (
                    <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', marginBottom: '1.5rem' }}>
                        <strong>Error:</strong> {results?.error}
                    </div>
                )}

                {results?.debugData && Object.keys(results.debugData).length > 0 && (
                    <div>
                        <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem', color: '#e5e5e5' }}>Debug Data (First 5 Items per Node)</h4>
                        {Object.entries(results.debugData).map(([nodeId, data]: [string, any]) => {
                            const isOldFormat = Array.isArray(data);
                            const inputs = isOldFormat ? [] : (data.inputs || []);
                            const outputs = isOldFormat ? data : (data.outputs || []);

                            const renderItems = (items: any[]) => {
                                if (!items || items.length === 0) return <span style={{ color: '#666' }}>No items captured</span>;
                                return items.map((item: any, idx: number) => (
                                    <div key={idx} style={{ marginBottom: '0.5rem', borderBottom: idx < items.length - 1 ? '1px dashed #333' : 'none', paddingBottom: '0.5rem' }}>
                                        <div style={{ color: '#60a5fa', marginBottom: '0.2rem' }}>Item {idx + 1}:</div>
                                        {typeof item === 'string' ? item : JSON.stringify(item, null, 2)}
                                    </div>
                                ));
                            };

                            return (
                                <div key={nodeId} style={{ marginBottom: '1.5rem' }}>
                                    <h5 style={{ marginBottom: '0.5rem', color: '#a3a3a3' }}>
                                        Node: <span style={{ color: '#fff', fontWeight: 600 }}>{getNodeName(nodeId)}</span>
                                    </h5>

                                    {inputs.length > 0 && (
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inputs</div>
                                            <div style={{ background: '#000', padding: '0.75rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.8rem', overflowX: 'auto', border: '1px solid #333' }}>
                                                {renderItems(inputs)}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outputs</div>
                                        <div style={{ background: '#000', padding: '0.75rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.8rem', overflowX: 'auto', border: '1px solid #333' }}>
                                            {renderItems(outputs)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {(!results?.debugData || Object.keys(results.debugData).length === 0) && results?.success && (
                    <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                        No debug data captured. Did you enable "Debug"?
                    </div>
                )}
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ padding: '0.5rem 1.5rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
            </div>
        </div>
    );
}
