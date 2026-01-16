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

import { useState, useEffect } from 'react';
import { Connection } from '@/types';

const MOCK_DATA: Connection[] = [

];

export function useConnections() {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        try {
            const res = await fetch('/api/connections');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setConnections(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const addConnection = async (connection: Omit<Connection, 'id' | 'status' | 'lastSyncedAt'>) => {
        try {
            const res = await fetch('/api/connections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(connection),
            });

            if (!res.ok) throw new Error('Failed to create');

            const newConnection = await res.json();
            setConnections(prev => [newConnection, ...prev]);
        } catch (err) {
            console.error(err);
        }
    };

    const syncConnection = async (id: string) => {
        try {
            const res = await fetch(`/api/connections/${id}/sync`, { method: 'POST' });
            const data = await res.json();

            if (!res.ok) {
                return { success: false, error: data.error || 'Sync failed' };
            }

            // Re-fetch to update status
            await fetchConnections();
            return { success: true };
        } catch (err) {
            console.error(err);
            return { success: false, error: 'Network error' };
        }
    };

    const updateConnection = async (id: string, data: Partial<Connection>) => {
        try {
            const res = await fetch(`/api/connections/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Update failed');

            await fetchConnections();
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const deleteConnection = async (id: string) => {
        try {
            const res = await fetch(`/api/connections/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                // If 404, it means it's already gone, so we can proceed to remove from UI
                if (res.status === 404) {
                    setConnections(prev => prev.filter(c => c.id !== id));
                    return true;
                }
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Delete failed');
            }

            setConnections(prev => prev.filter(c => c.id !== id));
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    return {
        connections,
        isLoading,
        addConnection,
        syncConnection,
        updateConnection,
        deleteConnection
    };
}

export function useConnectionFiles(connectionId: string) {
    const [files, setFiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (connectionId) {
            fetchFiles();
        }
    }, [connectionId]);

    const fetchFiles = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/connections/${connectionId}/files`);
            if (res.ok) {
                const data = await res.json();
                setFiles(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return { files, isLoading, refreshFiles: fetchFiles };
}
