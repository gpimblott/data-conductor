/*
 * DataConductor
 * Copyright (C) 2026
 */

'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useConnections } from '@/hooks/useConnections';
import PipelineBuilder from '@/components/pipeline/PipelineBuilder';

export default function PipelinePage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const { connections, isLoading, updateConnection } = useConnections();
    const connection = connections.find(c => c.id === id);

    if (isLoading) {
        return <div style={{ color: '#a3a3a3', padding: '2rem' }}>Loading connection...</div>;
    }

    if (!connection) {
        return <div style={{ color: '#ef4444', padding: '2rem' }}>Connection not found.</div>;
    }

    const handleClose = () => {
        router.push(`/connections/${id}`);
    };

    const handleUpdateStatus = async (status: 'ACTIVE' | 'PAUSED') => {
        await updateConnection(id, { ...connection, status });
    };

    return (
        <PipelineBuilder
            connection={connection}
            onClose={handleClose}
            onUpdateStatus={handleUpdateStatus}
        />
    );
}
