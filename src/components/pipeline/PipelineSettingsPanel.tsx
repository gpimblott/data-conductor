
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
    pipeline: { id: string, name: string, description?: string, schedule?: string };
    onSave: (id: string, data: { name: string, description?: string, schedule?: string }) => Promise<void>;
}

export default function PipelineSettingsPanel({ pipeline, onSave }: Props) {
    const [name, setName] = useState(pipeline.name);
    const [description, setDescription] = useState(pipeline.description || '');
    const [schedule, setSchedule] = useState(pipeline.schedule || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (pipeline) {
            setName(pipeline.name);
            setDescription(pipeline.description || '');
            setSchedule(pipeline.schedule || '');
        }
    }, [pipeline]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave(pipeline.id, { name, description, schedule });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            background: '#171717',
            border: '1px solid #262626',
            borderRadius: '8px',
            padding: '1.5rem',
            height: '100%'
        }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: 600, color: '#e5e5e5' }}>Settings</h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a3a3a3' }}>
                        Pipeline Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            background: '#0a0a0a',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '0.875rem'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a3a3a3' }}>
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            background: '#0a0a0a',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '0.875rem',
                            resize: 'vertical'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a3a3a3' }}>
                        Schedule
                    </label>
                    <input
                        type="text"
                        value={schedule}
                        onChange={(e) => setSchedule(e.target.value)}
                        placeholder="e.g. 15 or 0 0 * * *"
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            background: '#0a0a0a',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '0.875rem'
                        }}
                    />
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                        Minutes interval or Cron expression.
                    </p>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                    <Button type="submit" variant="primary" disabled={isSubmitting} style={{ width: '100%' }}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
