
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    pipeline: { id: string, name: string, description?: string, schedule?: string };
    onSave: (id: string, data: { name: string, description?: string, schedule?: string }) => Promise<void>;
}

export default function PipelineSettingsModal({ isOpen, onClose, pipeline, onSave }: Props) {
    const [name, setName] = useState(pipeline.name);
    const [description, setDescription] = useState(pipeline.description || '');
    const [schedule, setSchedule] = useState(pipeline.schedule || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && pipeline) {
            setName(pipeline.name);
            setDescription(pipeline.description || '');
            setSchedule(pipeline.schedule || '');
        }
    }, [isOpen, pipeline]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave(pipeline.id, { name, description, schedule });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: '#171717',
                border: '1px solid #262626',
                borderRadius: '8px',
                width: '500px',
                maxWidth: '90vw',
                padding: '1.5rem',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer'
                    }}
                >
                    <X size={20} />
                </button>

                <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Pipeline Settings</h2>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
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
                                background: '#262626',
                                border: '1px solid #404040',
                                borderRadius: '4px',
                                color: '#fff',
                                fontSize: '0.875rem'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a3a3a3' }}>
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: '#262626',
                                border: '1px solid #404040',
                                borderRadius: '4px',
                                color: '#fff',
                                fontSize: '0.875rem',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a3a3a3' }}>
                            Schedule (Minutes or Cron)
                        </label>
                        <input
                            type="text"
                            value={schedule}
                            onChange={(e) => setSchedule(e.target.value)}
                            placeholder="e.g. 15 or 0 0 * * *"
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: '#262626',
                                border: '1px solid #404040',
                                borderRadius: '4px',
                                color: '#fff',
                                fontSize: '0.875rem'
                            }}
                        />
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                            Enter interval in minutes (e.g. 60) or a standard cron expression. Leave empty for manual execution.
                        </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
