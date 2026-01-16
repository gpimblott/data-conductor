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

'use client';

import { useState, useEffect } from 'react';
import { useConnections } from '@/hooks/useConnections';
import LogViewerModal from '@/components/LogViewerModal';
import ConnectionList from '@/components/ConnectionList';
import AddConnectionModal from '@/components/AddConnectionModal';
import { Connection } from '@/types';
import styles from './page.module.css';
import { handleSignOut } from '@/lib/actions';

export default function Dashboard() {
  const { connections, isLoading, addConnection, syncConnection, updateConnection, deleteConnection } = useConnections();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logConnectionId, setLogConnectionId] = useState<string | null>(null);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const savedView = localStorage.getItem('dataConductor_viewMode');
    const savedFilter = localStorage.getItem('dataConductor_filterStatus');
    if (savedView) setViewMode(savedView as 'card' | 'list');
    if (savedFilter) setFilterStatus(savedFilter);
    setIsLoaded(true);
  }, []);

  // Save preferences when they change (only after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dataConductor_viewMode', viewMode);
      localStorage.setItem('dataConductor_filterStatus', filterStatus);
    }
  }, [viewMode, filterStatus, isLoaded]);

  const filteredConnections = connections.filter(conn => {
    if (filterStatus === 'ALL') return true;
    return conn.status === filterStatus;
  });

  const handleOpenModal = (connection?: Connection) => {
    // ... (existing logic)
    if (connection) {
      setEditingConnection(connection);
    } else {
      setEditingConnection(null);
    }
    setIsModalOpen(true);
  };

  const handleViewLogs = (connectionId: string | null) => {
    setLogConnectionId(connectionId);
    setIsLogModalOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingConnection) {
        await updateConnection(editingConnection.id, data);
      } else {
        await addConnection(data);
      }
      setIsModalOpen(false);
      setEditingConnection(null);
    } catch (error) {
      console.error('Failed to save connection:', error);
      alert('Failed to save connection');
    }
  };

  return (
    <div className="container">
      <div className={styles.actionBar}>
        <div>
          <h2 className={styles.title}>Connections</h2>
          <p className={styles.subtitle}>
            {isLoading ? '...' : (() => {
              const active = connections.filter(c => c.status === 'ACTIVE').length;
              const paused = connections.filter(c => c.status === 'PAUSED').length;
              const error = connections.filter(c => c.status === 'ERROR').length;
              const idle = connections.filter(c => c.status === 'IDLE').length;
              return `${active} Active • ${paused} Paused • ${error} Error • ${idle} Idle`;
            })()}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              background: '#171717',
              border: '1px solid #404040',
              color: '#e5e5e5',
              padding: '0.4rem 2rem 0.4rem 0.8rem',
              borderRadius: '4px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center'
            }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="IDLE">Idle</option>
            <option value="ERROR">Error</option>
          </select>

          <button
            className="btn"
            onClick={() => handleViewLogs(null)}
            style={{
              background: 'transparent',
              border: '1px solid #404040',
              color: '#a3a3a3',
              fontSize: '0.875rem'
            }}
          >
            All Logs
          </button>

          <div className={styles.viewToggle}>
            {/* ... (view toggle buttons) ... */}
            <button
              className={`btn ${viewMode === 'card' ? styles.activeView : ''}`}
              onClick={() => setViewMode('card')}
              style={{
                background: viewMode === 'card' ? '#404040' : 'transparent',
                color: viewMode === 'card' ? '#fff' : '#a3a3a3',
                border: '1px solid #404040',
                borderRadius: '4px 0 0 4px',
                padding: '0.4rem 0.8rem', // Small tweaks for button feel
                fontSize: '0.875rem'
              }}
            >
              Grid
            </button>
            <button
              className={`btn ${viewMode === 'list' ? styles.activeView : ''}`}
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? '#404040' : 'transparent',
                color: viewMode === 'list' ? '#fff' : '#a3a3a3',
                border: '1px solid #404040',
                borderLeft: 'none',
                borderRadius: '0 4px 4px 0',
                padding: '0.4rem 0.8rem',
                fontSize: '0.875rem'
              }}
            >
              List
            </button>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => handleOpenModal()}
          >
            + Add New
          </button>
        </div>
      </div>

      <ConnectionList
        connections={filteredConnections}
        isLoading={isLoading}
        onSync={syncConnection}
        onEdit={handleOpenModal}
        onDelete={deleteConnection}
        onViewLogs={handleViewLogs}
        viewMode={viewMode}
      />

      <AddConnectionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingConnection(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingConnection}
      />

      <LogViewerModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        connectionId={logConnectionId}
        title={logConnectionId ? 'Connection History' : 'Activity Logs'}
      />
    </div>
  );
}
