import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';

const Statistics = ({ user }) => {
  const [stats, setStats] = useState({
    totalScanned: 0,
    aiApproved: 0,
    posted: 0,
    rejected: 0,
    lastScan: null,
    lastTweet: null,
    lastNews: null,
    systemUptime: '0 days, 0 hours',
    nextScan: null
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    if (user) {
      subscribeToStatistics();
    } else {
      setStatus('⚠️ Please sign in to view statistics');
    }
  }, [user]);

  const subscribeToStatistics = () => {
    if (!db || !user) return;

    try {
      const docRef = doc(db, 'statistics', `current_${user.uid}`);
      
      const unsubscribe = onSnapshot(docRef, 
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setStats({
              totalScanned: data.totalScanned || 0,
              aiApproved: data.aiApproved || 0,
              posted: data.posted || 0,
              rejected: data.rejected || 0,
              lastScan: data.lastScan || null,
              lastTweet: data.lastTweet || null,
              lastNews: data.lastNews || null,
              systemUptime: data.systemUptime || '0 days, 0 hours',
              nextScan: data.nextScan || null
            });
            setStatus(`📊 Live statistics for: ${user.email}`);
            
            // Clear status after 3 seconds
            setTimeout(() => {
              if (status.includes('📊 Live statistics')) setStatus('');
            }, 3000);
          } else {
            // Initialize statistics if they don't exist
            initializeStatistics();
          }
        },
        (error) => {
          console.error('Error subscribing to statistics:', error);
          setStatus('❌ Error loading statistics: ' + error.message);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up statistics subscription:', error);
      setStatus('❌ Error: ' + error.message);
    }
  };

  const initializeStatistics = async () => {
    if (!db || !user) return;

    try {
      await updateDoc(doc(db, 'statistics', `current_${user.uid}`), {
        totalScanned: 0,
        aiApproved: 0,
        posted: 0,
        rejected: 0,
        lastScan: null,
        lastTweet: null,
        lastNews: null,
        systemUptime: '0 days, 0 hours',
        nextScan: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        userId: user.uid,
        userEmail: user.email,
        createdAt: new Date(),
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error initializing statistics:', error);
    }
  };

  const refreshStatistics = async () => {
    if (!db || !user) {
      setStatus('❌ Please sign in to refresh statistics');
      return;
    }

    setLoading(true);
    setStatus('🔄 Refreshing statistics...');
    
    try {
      const docRef = doc(db, 'statistics', `current_${user.uid}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStats({
          totalScanned: data.totalScanned || 0,
          aiApproved: data.aiApproved || 0,
          posted: data.posted || 0,
          rejected: data.rejected || 0,
          lastScan: data.lastScan || null,
          lastTweet: data.lastTweet || null,
          lastNews: data.lastNews || null,
          systemUptime: data.systemUptime || '0 days, 0 hours',
          nextScan: data.nextScan || null
        });
      }
      
      setLastRefresh(new Date());
      setStatus('✅ Statistics refreshed successfully');
      
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error refreshing statistics:', error);
      setStatus('❌ Error refreshing statistics: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!user) {
      setStatus('❌ Please sign in to generate reports');
      return;
    }

    setLoading(true);
    setStatus('📈 Generating detailed report...');
    
    // Simulate report generation
    setTimeout(() => {
      const reportData = {
        user: user.email,
        timestamp: new Date().toLocaleString(),
        statistics: stats,
        summary: getPerformanceSummary()
      };
      
      // In a real app, you would generate and download a PDF/CSV
      console.log('Generated Report:', reportData);
      
      setStatus('✅ Report generated successfully (check console)');
      setLoading(false);
      
      setTimeout(() => setStatus(''), 3000);
    }, 2000);
  };

  const resetStatistics = async () => {
    if (!db || !user) {
      setStatus('❌ Please sign in to reset statistics');
      return;
    }

    if (!window.confirm('Are you sure you want to reset all statistics? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setStatus('🔄 Resetting statistics...');
    
    try {
      await updateDoc(doc(db, 'statistics', `current_${user.uid}`), {
        totalScanned: 0,
        aiApproved: 0,
        posted: 0,
        rejected: 0,
        lastScan: null,
        lastTweet: null,
        lastNews: null,
        systemUptime: '0 days, 0 hours',
        nextScan: new Date(Date.now() + 5 * 60 * 1000),
        lastUpdated: new Date(),
        resetAt: new Date()
      });
      
      setStatus('✅ Statistics reset successfully');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error resetting statistics:', error);
      setStatus('❌ Error resetting statistics: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Never';
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
      return 'Invalid date';
    }
  };

  const getPerformanceSummary = () => {
    const { totalScanned, posted, aiApproved, rejected } = stats;
    
    if (totalScanned === 0) {
      return { efficiency: 0, approvalRate: 0, rejectionRate: 0 };
    }

    const efficiency = Math.round((posted / totalScanned) * 100);
    const approvalRate = Math.round((aiApproved / totalScanned) * 100);
    const rejectionRate = Math.round((rejected / totalScanned) * 100);

    return { efficiency, approvalRate, rejectionRate };
  };

  const performance = getPerformanceSummary();

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 80) return 'var(--success-color)';
    if (efficiency >= 60) return 'var(--warning-color)';
    return 'var(--error-color)';
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Statistics & Analytics</h2>
        <span className="status-badge status-active">Live</span>
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
          🔐 Please sign in to view statistics and analytics.
        </div>
      )}

      {/* Key Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">{stats.totalScanned.toLocaleString()}</span>
          <span className="stat-label">Total Scanned</span>
          <small>Content items processed</small>
        </div>
        
        <div className="stat-card">
          <span className="stat-number">{stats.aiApproved.toLocaleString()}</span>
          <span className="stat-label">AI Approved</span>
          <small>Automatically approved</small>
        </div>
        
        <div className="stat-card">
          <span className="stat-number">{stats.posted.toLocaleString()}</span>
          <span className="stat-label">Posted</span>
          <small>Successfully shared</small>
        </div>
        
        <div className="stat-card">
          <span className="stat-number">{stats.rejected.toLocaleString()}</span>
          <span className="stat-label">Rejected</span>
          <small>Filtered out</small>
        </div>
      </div>

      {/* Performance Metrics */}
      {user && stats.totalScanned > 0 && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <span 
              className="stat-number"
              style={{ color: getEfficiencyColor(performance.efficiency) }}
            >
              {performance.efficiency}%
            </span>
            <span className="stat-label">Efficiency</span>
            <small>Posted/Scanned ratio</small>
          </div>
          
          <div className="stat-card">
            <span className="stat-number">{performance.approvalRate}%</span>
            <span className="stat-label">AI Approval Rate</span>
            <small>Auto-approved content</small>
          </div>
          
          <div className="stat-card">
            <span className="stat-number">{performance.rejectionRate}%</span>
            <span className="stat-label">Rejection Rate</span>
            <small>Filtered content</small>
          </div>
          
          <div className="stat-card">
            <span className="stat-number">
              {stats.totalScanned > 0 ? Math.round(stats.posted / (stats.totalScanned / 100)) : 0}%
            </span>
            <span className="stat-label">Success Rate</span>
            <small>Overall performance</small>
          </div>
        </div>
      )}

      {/* System Information */}
      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Last Content Scan</label>
          <div className="stat-value">
            {formatDate(stats.lastScan)}
            <small>{formatRelativeTime(stats.lastScan)}</small>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Last Tweet Posted</label>
          <div className="stat-value">
            {formatDate(stats.lastTweet)}
            <small>{formatRelativeTime(stats.lastTweet)}</small>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Last News Posted</label>
          <div className="stat-value">
            {formatDate(stats.lastNews)}
            <small>{formatRelativeTime(stats.lastNews)}</small>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Next Scheduled Scan</label>
          <div className="stat-value">
            {stats.nextScan ? formatDate(stats.nextScan) : 'Not scheduled'}
            <small>{stats.nextScan && formatRelativeTime(stats.nextScan)}</small>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">System Uptime</label>
          <div className="stat-value">
            {stats.systemUptime}
            <small>Continuous operation</small>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Last Refresh</label>
          <div className="stat-value">
            {lastRefresh.toLocaleString()}
            <small>{formatRelativeTime(lastRefresh)}</small>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="button-group">
        <button 
          className="btn btn-primary" 
          onClick={refreshStatistics}
          disabled={loading || !user}
        >
          {loading ? <div className="spinner"></div> : '🔄'}
          Refresh Statistics
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={generateReport}
          disabled={loading || !user}
        >
          📊 Generate Report
        </button>
        
        <button 
          className="btn btn-warning"
          onClick={resetStatistics}
          disabled={loading || !user}
        >
          🔄 Reset Stats
        </button>
      </div>

      {user && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#4e4e4eff', borderRadius: '8px' }}>
          <h4>Statistics Overview:</h4>
          <p><strong>User:</strong> {user.email}</p>
          <p><strong>Data Scope:</strong> User-specific statistics</p>
          <p><strong>Collection:</strong> statistics/current_{user.uid}</p>
          <p><strong>Real-time Updates:</strong> Enabled</p>
          <p><strong>Total Operations:</strong> {stats.totalScanned + stats.posted + stats.rejected}</p>
        </div>
      )}
    </div>
  );
};

export default Statistics;