import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, orderBy, query, limit, where, writeBatch, doc } from 'firebase/firestore';

const SystemLogs = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logLimit, setLogLimit] = useState(50);

  useEffect(() => {
    if (user) {
      subscribeToSystemLogs();
    } else {
      setStatus('⚠️ Please sign in to view system logs');
    }
  }, [user, logLimit]);

  const subscribeToSystemLogs = () => {
    if (!db || !user) return;

    try {
      const q = query(
        collection(db, 'systemLogs'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(logLimit)
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const logsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setLogs(logsData);
          setStatus(`📋 Loaded ${logsData.length} logs for: ${user.email}`);
          
          // Clear status after 3 seconds
          setTimeout(() => {
            if (status.includes('📋 Loaded')) setStatus('');
          }, 3000);
        },
        (error) => {
          console.error('Error subscribing to system logs:', error);
          setStatus('❌ Error loading logs: ' + error.message);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up logs subscription:', error);
      setStatus('❌ Error: ' + error.message);
    }
  };

  const exportLogs = async () => {
    if (!user) {
      setStatus('❌ Please sign in to export logs');
      return;
    }

    setLoading(true);
    setStatus('📥 Preparing log export...');
    
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: user.email,
        userId: user.uid,
        totalLogs: logs.length,
        logs: logs.map(log => ({
          timestamp: formatDate(log.timestamp),
          level: log.level,
          message: log.message,
          source: log.source || 'system',
          context: log.context || {}
        }))
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-logs-${user.email}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus('✅ Logs exported successfully');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error exporting logs:', error);
      setStatus('❌ Error exporting logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearOldLogs = async () => {
    if (!db || !user) {
      setStatus('❌ Please sign in to clear logs');
      return;
    }

    if (!window.confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setStatus('🗑️ Clearing logs...');
    
    try {
      const batch = writeBatch(db);
      logs.forEach(log => {
        const logRef = doc(db, 'systemLogs', log.id);
        batch.delete(logRef);
      });
      
      await batch.commit();
      setStatus('✅ Logs cleared successfully');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error clearing logs:', error);
      setStatus('❌ Error clearing logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearLogsOlderThan = async (days = 7) => {
    if (!db || !user) {
      setStatus('❌ Please sign in to clear logs');
      return;
    }

    if (!window.confirm(`Are you sure you want to clear logs older than ${days} days?`)) {
      return;
    }

    setLoading(true);
    setStatus(`🗑️ Clearing logs older than ${days} days...`);
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const oldLogs = logs.filter(log => {
        const logDate = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        return logDate < cutoffDate;
      });

      if (oldLogs.length === 0) {
        setStatus('ℹ️ No logs found older than the specified period');
        setLoading(false);
        return;
      }

      const batch = writeBatch(db);
      oldLogs.forEach(log => {
        const logRef = doc(db, 'systemLogs', log.id);
        batch.delete(logRef);
      });
      
      await batch.commit();
      setStatus(`✅ Cleared ${oldLogs.length} logs older than ${days} days`);
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error clearing old logs:', error);
      setStatus('❌ Error clearing old logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshLogs = () => {
    if (!user) {
      setStatus('❌ Please sign in to refresh logs');
      return;
    }

    setStatus('🔄 Refreshing logs...');
    subscribeToSystemLogs();
    setTimeout(() => setStatus('✅ Logs refreshed'), 1000);
    setTimeout(() => setStatus(''), 3000);
  };

  const addTestLog = async () => {
    if (!db || !user) {
      setStatus('❌ Please sign in to add test logs');
      return;
    }

    setLoading(true);
    setStatus('🧪 Adding test logs...');
    
    try {
      const testLogs = [
        {
          level: 'info',
          message: 'Test info log added manually',
          source: 'manual-test',
          userId: user.uid,
          userEmail: user.email,
          timestamp: new Date(),
          context: { test: true }
        },
        {
          level: 'success',
          message: 'Test success log for demonstration',
          source: 'manual-test',
          userId: user.uid,
          userEmail: user.email,
          timestamp: new Date(),
          context: { test: true }
        },
        {
          level: 'warning',
          message: 'Test warning log to check formatting',
          source: 'manual-test',
          userId: user.uid,
          userEmail: user.email,
          timestamp: new Date(),
          context: { test: true }
        },
        {
          level: 'error',
          message: 'Test error log for error handling display',
          source: 'manual-test',
          userId: user.uid,
          userEmail: user.email,
          timestamp: new Date(),
          context: { test: true }
        }
      ];

      const batch = writeBatch(db);
      testLogs.forEach(log => {
        const logRef = doc(collection(db, 'systemLogs'));
        batch.set(logRef, log);
      });
      
      await batch.commit();
      setStatus('✅ Test logs added successfully');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error adding test logs:', error);
      setStatus('❌ Error adding test logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const getLogLevelColor = (level) => {
    const colors = {
      info: 'var(--primary-color)',
      success: 'var(--success-color)',
      warning: 'var(--warning-color)',
      error: 'var(--error-color)',
      debug: 'var(--text-secondary)'
    };
    return colors[level] || colors.info;
  };

  const getLogLevelIcon = (level) => {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🐛'
    };
    return icons[level] || '📝';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (error) {
      return '';
    }
  };

  const getLogStats = () => {
    const stats = {
      total: logs.length,
      info: logs.filter(log => log.level === 'info').length,
      success: logs.filter(log => log.level === 'success').length,
      warning: logs.filter(log => log.level === 'warning').length,
      error: logs.filter(log => log.level === 'error').length,
      debug: logs.filter(log => log.level === 'debug').length
    };
    return stats;
  };

  const logStats = getLogStats();

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">System Logs & Activity</h2>
        <span className="status-badge status-active">
          {logs.length} Entr{logs.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {/* Status Message */}
      {status && (
        <div className={`status-message ${
          status.includes('✅') ? 'success' : 
          status.includes('❌') ? 'error' : 
          status.includes('⚠️') ? 'info' : 'info'
        }`}>
          {status}
        </div>
      )}

      {!user && (
        <div className="status-message info">
          🔐 Please sign in to view system logs and activity.
        </div>
      )}

      {/* Log Statistics */}
      {user && logs.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <span className="stat-number">{logStats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card">
            <span className="stat-number" style={{ color: 'var(--primary-color)' }}>
              {logStats.info}
            </span>
            <span className="stat-label">Info</span>
          </div>
          <div className="stat-card">
            <span className="stat-number" style={{ color: 'var(--success-color)' }}>
              {logStats.success}
            </span>
            <span className="stat-label">Success</span>
          </div>
          <div className="stat-card">
            <span className="stat-number" style={{ color: 'var(--warning-color)' }}>
              {logStats.warning}
            </span>
            <span className="stat-label">Warning</span>
          </div>
          <div className="stat-card">
            <span className="stat-number" style={{ color: 'var(--error-color)' }}>
              {logStats.error}
            </span>
            <span className="stat-label">Error</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label className="form-label">Filter by Level</label>
          <select 
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            disabled={!user}
          >
            <option value="all">All Logs ({logStats.total})</option>
            <option value="info">Info ({logStats.info})</option>
            <option value="success">Success ({logStats.success})</option>
            <option value="warning">Warning ({logStats.warning})</option>
            <option value="error">Error ({logStats.error})</option>
            <option value="debug">Debug ({logStats.debug})</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Log Limit</label>
          <select 
            className="form-select"
            value={logLimit}
            onChange={(e) => setLogLimit(Number(e.target.value))}
            disabled={!user}
          >
            <option value={25}>25 logs</option>
            <option value={50}>50 logs</option>
            <option value={100}>100 logs</option>
            <option value={250}>250 logs</option>
            <option value={500}>500 logs</option>
          </select>
        </div>
      </div>

      {/* Logs Container */}
      <div className="logs-container">
        {!user ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            Please sign in to view system logs.
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            {logs.length === 0 
              ? 'No logs found yet. System activity will appear here.'
              : 'No logs found matching the current filter.'
            }
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="log-entry" style={{ borderLeftColor: getLogLevelColor(log.level) }}>
              <div className="log-header">
                <div className="log-time">
                  {formatDate(log.timestamp)}
                  <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                    ({formatRelativeTime(log.timestamp)})
                  </span>
                </div>
                <div className="log-level" style={{ color: getLogLevelColor(log.level) }}>
                  {getLogLevelIcon(log.level)} {log.level.toUpperCase()}
                  {log.source && ` • ${log.source}`}
                </div>
              </div>
              <div className="log-message">{log.message}</div>
              {log.context && Object.keys(log.context).length > 0 && (
                <div className="log-context">
                  <details>
                    <summary>Context</summary>
                    <pre>{JSON.stringify(log.context, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="button-group">
        <button 
          className="btn btn-primary" 
          onClick={refreshLogs}
          disabled={loading || !user}
        >
          🔄 Refresh
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={exportLogs}
          disabled={loading || !user || logs.length === 0}
        >
          📥 Export JSON
        </button>
        
        <button 
          className="btn btn-warning"
          onClick={() => clearLogsOlderThan(7)}
          disabled={loading || !user || logs.length === 0}
        >
          🗑️ Clear Old
        </button>
        
        <button 
          className="btn btn-danger"
          onClick={clearOldLogs}
          disabled={loading || !user || logs.length === 0}
        >
          🗑️ Clear All
        </button>
        
        <button 
          className="btn btn-info"
          onClick={addTestLog}
          disabled={loading || !user}
        >
          🧪 Add Test
        </button>
      </div>

      {user && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#4e4e4eff', borderRadius: '8px' }}>
          <h4>Logs Configuration:</h4>
          <p><strong>User:</strong> {user.email}</p>
          <p><strong>Total Logs:</strong> {logs.length}</p>
          <p><strong>Current Filter:</strong> {filter} ({filteredLogs.length} logs)</p>
          <p><strong>Display Limit:</strong> {logLimit} logs</p>
          <p><strong>Auto-refresh:</strong> {autoRefresh ? 'Enabled' : 'Disabled'}</p>
          {/* <p><strong>Collection:</strong> systemLogs (user: {user.uid})</p> */}
        </div>
      )}
    </div>
  );
};

export default SystemLogs;