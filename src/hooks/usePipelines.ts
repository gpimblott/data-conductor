
import { useState, useEffect } from 'react';

export interface Pipeline {
    id: string;
    name: string;
    description?: string;
    status: string; // 'ACTIVE', 'PAUSED', 'DRAFT'
    schedule?: string;
    updated_at: string;
    last_run_status?: string;
    last_run_at?: string;
    flow_config?: any;
    recent_executions?: { status: string; started_at: string }[];
}

export function usePipelines() {
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPipelines = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/pipelines');
            if (res.ok) {
                const data = await res.json();
                setPipelines(data);
            }
        } catch (error) {
            console.error('Failed to fetch pipelines:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPipelines();
    }, []);

    const createPipeline = async (data: { name: string, description?: string, schedule?: string }) => {
        const res = await fetch('/api/pipelines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create pipeline');
        const newPipeline = await res.json();
        setPipelines(prev => [newPipeline, ...prev]);
        return newPipeline;
    };

    const deletePipeline = async (id: string) => {
        if (!confirm('Are you sure you want to delete this pipeline?')) return;

        try {
            const res = await fetch(`/api/pipelines/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete');
            setPipelines(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Delete error', error);
            alert('Failed to delete pipeline');
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        try {
            const res = await fetch(`/api/pipelines/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (!res.ok) throw new Error('Failed to update status');

            setPipelines(prev => prev.map(p =>
                p.id === id ? { ...p, status: newStatus } : p
            ));
        } catch (error) {
            console.error('Status update error', error);
            alert('Failed to update status');
        }
    };

    const runPipeline = async (id: string) => {
        try {
            const res = await fetch(`/api/pipelines/${id}/run`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Run failed');
            // alert('Pipeline run started'); // Optional UI feedback
            fetchPipelines();
        } catch (error) {
            console.error('Run error', error);
            alert('Failed to run pipeline');
        }
    };

    const updatePipeline = async (id: string, data: Partial<Pipeline>) => {
        const res = await fetch(`/api/pipelines/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update pipeline');

        setPipelines(prev => prev.map(p =>
            p.id === id ? { ...p, ...data } : p
        ));
    };

    return {
        pipelines,
        isLoading,
        createPipeline,
        updatePipeline,
        deletePipeline,
        toggleStatus,
        runPipeline,
        refreshPipelines: fetchPipelines
    };
}
