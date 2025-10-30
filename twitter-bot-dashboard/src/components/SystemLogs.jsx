import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, orderBy, query, limit, where, writeBatch, doc } from 'firebase/firestore';
import { LanguageUtils } from '../utils/language';

const SystemLogs = ({ user, language }) => {
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
      setStatus(LanguageUtils.getText('⚠️ Please sign in to view system logs', language));
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
          setStatus(LanguageUtils.getText('📋 Loaded ', language) + logsData.length + LanguageUtils.getText(' logs for: ', language) + user.email);
          
          setTimeout(() => {
            if (status.includes('📋 Loaded')) setStatus('');
          }, 3000);
        },
        (error) => {
          console.error('Error subscribing to system logs:', error);
          setStatus(LanguageUtils.getText('❌ Error loading logs: ', language) + error.message);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up logs subscription:', error);
      setStatus(LanguageUtils.getText('❌ Error: ', language) + error.message);
    }
  };

  const exportLogs = async () => {
    if (!user) {
      setStatus(LanguageUtils.getText('❌ Please sign in to export logs', language));
      return;
    }

    setLoading(true);
    setStatus(LanguageUtils.getText('📥 Preparing log export...', language));
    
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

      setStatus(LanguageUtils.getText('✅ Logs exported successfully', language));
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error exporting logs:', error);
      setStatus(LanguageUtils.getText('❌ Error exporting logs: ', language) + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearOldLogs = async () => {
    if (!db || !user) {
      setStatus(LanguageUtils.getText('❌ Please sign in to clear logs', language));
      return;
    }

    if (!window.confirm(LanguageUtils.getText('Are you sure you want to clear all logs? This action cannot be undone.', language))) {
      return;
    }

    setLoading(true);
    setStatus(LanguageUtils.getText('🗑️ Clearing logs...', language));
    
    try {
      const batch = writeBatch(db);
      logs.forEach(log => {
        const logRef = doc(db, 'systemLogs', log.id);
        batch.delete(logRef);
      });
      
      await batch.commit();
      setStatus(LanguageUtils.getText('✅ Logs cleared successfully', language));
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error clearing logs:', error);
      setStatus(LanguageUtils.getText('❌ Error clearing logs: ', language) + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearLogsOlderThan = async (days = 7) => {
    if (!db || !user) {
      setStatus(LanguageUtils.getText('❌ Please sign in to clear logs', language));
      return;
    }

    if (!window.confirm(LanguageUtils.getText('Are you sure you want to clear logs older than ', language) + days + LanguageUtils.getText(' days?', language))) {
      return;
    }

    setLoading(true);
    setStatus(LanguageUtils.getText('🗑️ Clearing logs older than ', language) + days + LanguageUtils.getText(' days...', language));
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const oldLogs = logs.filter(log => {
        const logDate = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        return logDate < cutoffDate;
      });

      if (oldLogs.length === 0) {
        setStatus(LanguageUtils.getText('ℹ️ No logs found older than the specified period', language));
        setLoading(false);
        return;
      }

      const batch = writeBatch(db);
      oldLogs.forEach(log => {
        const logRef = doc(db, 'systemLogs', log.id);
        batch.delete(logRef);
      });
      
      await batch.commit();
      setStatus(LanguageUtils.getText('✅ Cleared ', language) + oldLogs.length + LanguageUtils.getText(' logs older than ', language) + days + LanguageUtils.getText(' days', language));
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error clearing old logs:', error);
      setStatus(LanguageUtils.getText('❌ Error clearing old logs: ', language) + error.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshLogs = () => {
    if (!user) {
      setStatus(LanguageUtils.getText('❌ Please sign in to refresh logs', language));
      return;
    }

    setStatus(LanguageUtils.getText('🔄 Refreshing logs...', language));
    subscribeToSystemLogs();
    setTimeout(() => setStatus(LanguageUtils.getText('✅ Logs refreshed', language)), 1000);
    setTimeout(() => setStatus(''), 3000);
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
      return LanguageUtils.getText('Invalid date', language);
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

      if (diffMins < 1) return LanguageUtils.getText('Just now', language);
      if (diffMins < 60) return `${diffMins}m ${LanguageUtils.getText('ago', language)}`;
      if (diffHours < 24) return `${diffHours}h ${LanguageUtils.getText('ago', language)}`;
      return `${diffDays}d ${LanguageUtils.getText('ago', language)}`;
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
        <h2 className="card-title">{LanguageUtils.getText('System Logs & Activity', language)}</h2>
        <span className="status-badge status-active">
          {logs.length} {LanguageUtils.getText('Entr', language)}{logs.length !== 1 ? LanguageUtils.getText('ies', language) : LanguageUtils.getText('y', language)}
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
          🔐 {LanguageUtils.getText('Please sign in to view system logs and activity.', language)}
        </div>
      )}

      {/* Log Statistics */}
      {user && logs.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <span className="stat-number">{logStats.total}</span>
            <span className="stat-label">{LanguageUtils.getText('Total', language)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-number" style={{ color: 'var(--primary-color)' }}>
              {logStats.info}
            </span>
            <span className="stat-label">{LanguageUtils.getText('Info', language)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-number" style={{ color: 'var(--success-color)' }}>
              {logStats.success}
            </span>
            <span className="stat-label">{LanguageUtils.getText('Success', language)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-number" style={{ color: 'var(--warning-color)' }}>
              {logStats.warning}
            </span>
            <span className="stat-label">{LanguageUtils.getText('Warning', language)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-number" style={{ color: 'var(--error-color)' }}>
              {logStats.error}
            </span>
            <span className="stat-label">{LanguageUtils.getText('Error', language)}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label className="form-label">{LanguageUtils.getText('Filter by Level', language)}</label>
          <select 
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            disabled={!user}
          >
            <option value="all">{LanguageUtils.getText('All Logs', language)} ({logStats.total})</option>
            <option value="info">{LanguageUtils.getText('Info', language)} ({logStats.info})</option>
            <option value="success">{LanguageUtils.getText('Success', language)} ({logStats.success})</option>
            <option value="warning">{LanguageUtils.getText('Warning', language)} ({logStats.warning})</option>
            <option value="error">{LanguageUtils.getText('Error', language)} ({logStats.error})</option>
            <option value="debug">{LanguageUtils.getText('Debug', language)} ({logStats.debug})</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">{LanguageUtils.getText('Log Limit', language)}</label>
          <select 
            className="form-select"
            value={logLimit}
            onChange={(e) => setLogLimit(Number(e.target.value))}
            disabled={!user}
          >
            <option value={25}>25 {LanguageUtils.getText('logs', language)}</option>
            <option value={50}>50 {LanguageUtils.getText('logs', language)}</option>
            <option value={100}>100 {LanguageUtils.getText('logs', language)}</option>
            <option value={250}>250 {LanguageUtils.getText('logs', language)}</option>
            <option value={500}>500 {LanguageUtils.getText('logs', language)}</option>
          </select>
        </div>
      </div>

      {/* Logs Container */}
      <div className="logs-container">
        {!user ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            {LanguageUtils.getText('Please sign in to view system logs.', language)}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            {logs.length === 0 
              ? LanguageUtils.getText('No logs found yet. System activity will appear here.', language)
              : LanguageUtils.getText('No logs found matching the current filter.', language)
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
                    <summary>{LanguageUtils.getText('Context', language)}</summary>
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
          🔄 {LanguageUtils.getText('Refresh', language)}
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={exportLogs}
          disabled={loading || !user || logs.length === 0}
        >
          📥 {LanguageUtils.getText('Export JSON', language)}
        </button>
        
        <button 
          className="btn btn-warning"
          onClick={() => clearLogsOlderThan(7)}
          disabled={loading || !user || logs.length === 0}
        >
          🗑️ {LanguageUtils.getText('Clear Old', language)}
        </button>
        
        <button 
          className="btn btn-danger"
          onClick={clearOldLogs}
          disabled={loading || !user || logs.length === 0}
        >
          🗑️ {LanguageUtils.getText('Clear All', language)}
        </button>
      </div>

      {user && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#4e4e4eff', borderRadius: '8px' }}>
          <h4>{LanguageUtils.getText('Logs Configuration:', language)}</h4>
          <p><strong>{LanguageUtils.getText('User:', language)}</strong> {user.email}</p>
          <p><strong>{LanguageUtils.getText('Total Logs:', language)}</strong> {logs.length}</p>
          <p><strong>{LanguageUtils.getText('Current Filter:', language)}</strong> {filter} ({filteredLogs.length} {LanguageUtils.getText('logs', language)})</p>
          <p><strong>{LanguageUtils.getText('Display Limit:', language)}</strong> {logLimit} {LanguageUtils.getText('logs', language)}</p>
          <p><strong>{LanguageUtils.getText('Auto-refresh:', language)}</strong> {autoRefresh ? LanguageUtils.getText('Enabled', language) : LanguageUtils.getText('Disabled', language)}</p>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;