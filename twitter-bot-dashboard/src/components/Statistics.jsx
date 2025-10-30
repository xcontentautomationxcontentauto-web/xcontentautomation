import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { LanguageUtils } from '../utils/language';

const Statistics = ({ user, language }) => {
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
      setStatus(LanguageUtils.getText('⚠️ Please sign in to view statistics', language));
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
            setStatus(LanguageUtils.getText('📊 Live statistics for: ', language) + user.email);
            
            setTimeout(() => {
              if (status.includes('📊 Live statistics')) setStatus('');
            }, 3000);
          } else {
            initializeStatistics();
          }
        },
        (error) => {
          console.error('Error subscribing to statistics:', error);
          setStatus(LanguageUtils.getText('❌ Error loading statistics: ', language) + error.message);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up statistics subscription:', error);
      setStatus(LanguageUtils.getText('❌ Error: ', language) + error.message);
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
        nextScan: new Date(Date.now() + 5 * 60 * 1000),
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
      setStatus(LanguageUtils.getText('❌ Please sign in to refresh statistics', language));
      return;
    }

    setLoading(true);
    setStatus(LanguageUtils.getText('🔄 Refreshing statistics...', language));
    
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
      setStatus(LanguageUtils.getText('✅ Statistics refreshed successfully', language));
      
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error refreshing statistics:', error);
      setStatus(LanguageUtils.getText('❌ Error refreshing statistics: ', language) + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!user) {
      setStatus(LanguageUtils.getText('❌ Please sign in to generate reports', language));
      return;
    }

    setLoading(true);
    setStatus(LanguageUtils.getText('📈 Generating detailed report...', language));
    
    setTimeout(() => {
      const reportData = {
        user: user.email,
        timestamp: new Date().toLocaleString(),
        statistics: stats,
        summary: getPerformanceSummary()
      };
      
      console.log('Generated Report:', reportData);
      
      setStatus(LanguageUtils.getText('✅ Report generated successfully (check console)', language));
      setLoading(false);
      
      setTimeout(() => setStatus(''), 3000);
    }, 2000);
  };

  const resetStatistics = async () => {
    if (!db || !user) {
      setStatus(LanguageUtils.getText('❌ Please sign in to reset statistics', language));
      return;
    }

    if (!window.confirm(LanguageUtils.getText('Are you sure you want to reset all statistics? This action cannot be undone.', language))) {
      return;
    }

    setLoading(true);
    setStatus(LanguageUtils.getText('🔄 Resetting statistics...', language));
    
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
      
      setStatus(LanguageUtils.getText('✅ Statistics reset successfully', language));
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error resetting statistics:', error);
      setStatus(LanguageUtils.getText('❌ Error resetting statistics: ', language) + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return LanguageUtils.getText('Never', language);
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return LanguageUtils.getText('Invalid date', language);
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return LanguageUtils.getText('Never', language);
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
      return LanguageUtils.getText('Invalid date', language);
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
        <h2 className="card-title">{LanguageUtils.getText('Statistics & Analytics', language)}</h2>
        <span className="status-badge status-active">{LanguageUtils.getText('Live', language)}</span>
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
          🔐 {LanguageUtils.getText('Please sign in to view statistics and analytics.', language)}
        </div>
      )}

      {/* Key Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">{stats.totalScanned.toLocaleString()}</span>
          <span className="stat-label">{LanguageUtils.getText('Total Scanned', language)}</span>
          <small>{LanguageUtils.getText('Content items processed', language)}</small>
        </div>
        
        <div className="stat-card">
          <span className="stat-number">{stats.aiApproved.toLocaleString()}</span>
          <span className="stat-label">{LanguageUtils.getText('AI Approved', language)}</span>
          <small>{LanguageUtils.getText('Automatically approved', language)}</small>
        </div>
        
        <div className="stat-card">
          <span className="stat-number">{stats.posted.toLocaleString()}</span>
          <span className="stat-label">{LanguageUtils.getText('Posted', language)}</span>
          <small>{LanguageUtils.getText('Successfully shared', language)}</small>
        </div>
        
        <div className="stat-card">
          <span className="stat-number">{stats.rejected.toLocaleString()}</span>
          <span className="stat-label">{LanguageUtils.getText('Rejected', language)}</span>
          <small>{LanguageUtils.getText('Filtered out', language)}</small>
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
            <span className="stat-label">{LanguageUtils.getText('Efficiency', language)}</span>
            <small>{LanguageUtils.getText('Posted/Scanned ratio', language)}</small>
          </div>
          
          <div className="stat-card">
            <span className="stat-number">{performance.approvalRate}%</span>
            <span className="stat-label">{LanguageUtils.getText('AI Approval Rate', language)}</span>
            <small>{LanguageUtils.getText('Auto-approved content', language)}</small>
          </div>
          
          <div className="stat-card">
            <span className="stat-number">{performance.rejectionRate}%</span>
            <span className="stat-label">{LanguageUtils.getText('Rejection Rate', language)}</span>
            <small>{LanguageUtils.getText('Filtered content', language)}</small>
          </div>
          
          <div className="stat-card">
            <span className="stat-number">
              {stats.totalScanned > 0 ? Math.round(stats.posted / (stats.totalScanned / 100)) : 0}%
            </span>
            <span className="stat-label">{LanguageUtils.getText('Success Rate', language)}</span>
            <small>{LanguageUtils.getText('Overall performance', language)}</small>
          </div>
        </div>
      )}

      {/* System Information */}
      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">{LanguageUtils.getText('Last Content Scan', language)}</label>
          <div className="stat-value">
            {formatDate(stats.lastScan)}
            <small>{formatRelativeTime(stats.lastScan)}</small>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{LanguageUtils.getText('Last Tweet Posted', language)}</label>
          <div className="stat-value">
            {formatDate(stats.lastTweet)}
            <small>{formatRelativeTime(stats.lastTweet)}</small>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{LanguageUtils.getText('Last News Posted', language)}</label>
          <div className="stat-value">
            {formatDate(stats.lastNews)}
            <small>{formatRelativeTime(stats.lastNews)}</small>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{LanguageUtils.getText('Next Scheduled Scan', language)}</label>
          <div className="stat-value">
            {stats.nextScan ? formatDate(stats.nextScan) : LanguageUtils.getText('Not scheduled', language)}
            <small>{stats.nextScan && formatRelativeTime(stats.nextScan)}</small>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{LanguageUtils.getText('System Uptime', language)}</label>
          <div className="stat-value">
            {stats.systemUptime}
            <small>{LanguageUtils.getText('Continuous operation', language)}</small>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{LanguageUtils.getText('Last Refresh', language)}</label>
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
          {LanguageUtils.getText('Refresh Statistics', language)}
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={generateReport}
          disabled={loading || !user}
        >
          📊 {LanguageUtils.getText('Generate Report', language)}
        </button>
        
        <button 
          className="btn btn-warning"
          onClick={resetStatistics}
          disabled={loading || !user}
        >
          🔄 {LanguageUtils.getText('Reset Stats', language)}
        </button>
      </div>

      {user && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#4e4e4eff', borderRadius: '8px' }}>
          <h4>{LanguageUtils.getText('Statistics Overview:', language)}</h4>
          <p><strong>{LanguageUtils.getText('User:', language)}</strong> {user.email}</p>
          <p><strong>{LanguageUtils.getText('Data Scope:', language)}</strong> {LanguageUtils.getText('User-specific statistics', language)}</p>
          <p><strong>{LanguageUtils.getText('Real-time Updates:', language)}</strong> {LanguageUtils.getText('Enabled', language)}</p>
          <p><strong>{LanguageUtils.getText('Total Operations:', language)}</strong> {stats.totalScanned + stats.posted + stats.rejected}</p>
        </div>
      )}
    </div>
  );
};

export default Statistics;