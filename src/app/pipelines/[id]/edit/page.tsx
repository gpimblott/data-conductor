
'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import PipelineBuilder from '@/components/pipeline/PipelineBuilder';

export default function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const handleClose = () => {
        router.push('/pipelines');
    };

    return (
        <PipelineBuilder
            pipelineId={id}
            onClose={handleClose}
        />
    );
}
