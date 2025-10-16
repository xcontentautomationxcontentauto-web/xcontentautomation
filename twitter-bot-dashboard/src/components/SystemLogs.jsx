import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(
      collection(db, 'systemLogs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(logsData);
    });

    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const getLogLevelColor = (level) => {
    const colors = {
      info: 'var(--primary-color)',
      success: 'var(--success-color)',
      warning: 'var(--warning-color)',
      error: 'var(--error-color)'
    };
    return colors[level] || colors.info;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp.toDate()).toLocaleString();
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">System Logs</h2>
        <span className="status-badge status-active">{logs.length} Entries</span>
      </div>

      <div className="form-group">
        <label className="form-label">Filter by Level</label>
        <select 
          className="form-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Logs</option>
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>

      <div className="logs-container">
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No logs found matching the current filter.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="log-entry" style={{ borderLeftColor: getLogLevelColor(log.level) }}>
              <div className="log-time">
                {formatDate(log.timestamp)}
                <span style={{ 
                  marginLeft: '1rem',
                  color: getLogLevelColor(log.level),
                  fontWeight: '600'
                }}>
                  {log.level.toUpperCase()}
                </span>
              </div>
              <div className="log-message">{log.message}</div>
            </div>
          ))
        )}
      </div>

      <div className="form-group">
        <button className="btn btn-secondary">
          📥 Export Logs
        </button>
        
        <button className="btn btn-warning">
          🗑️ Clear Old Logs
        </button>
        
        <button className="btn btn-primary">
          🔄 Refresh Logs
        </button>
      </div>
    </div>
  );
};

export default SystemLogs;