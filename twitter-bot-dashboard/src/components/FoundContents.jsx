import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc, 
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { ContentScanner } from '../services/contentScanner.js';

const FoundContents = ({ user }) => {
  const [contents, setContents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [posting, setPosting] = useState(false);
  const [status, setStatus] = useState('');
  const [lastScanTime, setLastScanTime] = useState(null);
  const [scanInterval, setScanInterval] = useState(null);
  const [userScanInterval, setUserScanInterval] = useState(10); // Default 10 minutes

  useEffect(() => {
    if (user) {
      subscribeToContents();
      loadUserSettings();
    }

    return () => {
      // Cleanup interval on unmount
      if (scanInterval) {
        clearInterval(scanInterval);
      }
    };
  }, [user]);

  useEffect(() => {
    // Restart scanning when user changes interval
    if (user) {
      startAutomaticScanning();
    }
  }, [userScanInterval]);

  const subscribeToContents = () => {
    if (!user || !db) return;

    const q = query(
      collection(db, 'foundContents'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setContents(contentsData);
    });

    return unsubscribe;
  };

  const loadUserSettings = async () => {
    if (!user || !db) return;

    try {
      const newsDoc = await getDoc(doc(db, 'settings', `news_${user.uid}`));
      if (newsDoc.exists()) {
        const data = newsDoc.data();
        setUserScanInterval(data.scanInterval || 10);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const startAutomaticScanning = async () => {
    if (!user) return;

    // Clear existing interval
    if (scanInterval) {
      clearInterval(scanInterval);
    }

    // Initial scan
    await performBackgroundScan();

    // Set up interval for automatic scanning using user's preference
    const intervalMs = userScanInterval * 60 * 1000;
    const interval = setInterval(async () => {
      await performBackgroundScan();
    }, intervalMs);

    setScanInterval(interval);
    
    console.log(`🔄 Auto-scan started: every ${userScanInterval} minutes`);
  };

  const performBackgroundScan = async () => {
    if (!user) return;

    try {
      // Get user settings
      const accountsDoc = await getDoc(doc(db, 'settings', `accounts_${user.uid}`));
      const newsDoc = await getDoc(doc(db, 'settings', `news_${user.uid}`));
      const aiDoc = await getDoc(doc(db, 'settings', `ai_${user.uid}`));

      const settings = {
        accountSettings: accountsDoc.exists() ? accountsDoc.data() : null,
        newsSettings: newsDoc.exists() ? newsDoc.data() : null,
        aiSettings: aiDoc.exists() ? aiDoc.data() : null
      };

      // Check if we have the minimum required settings
      if (!settings.newsSettings?.sources || settings.newsSettings.sources.length === 0) {
        setStatus('⚠️ Add news sources to start automatic scanning');
        return;
      }

      if (!settings.accountSettings?.source) {
        setStatus('⚠️ Configure X account settings to scan for tweets');
        return;
      }

      const result = await ContentScanner.scanAllSources(user, settings);
      
      if (result.success) {
        setLastScanTime(new Date());
        if (result.foundContents > 0) {
          setStatus(`✅ Found ${result.foundContents} new contents`);
          setTimeout(() => setStatus(''), 5000);
        }
      } else {
        setStatus(`❌ Scan failed: ${result.error}`);
        setTimeout(() => setStatus(''), 10000);
      }
    } catch (error) {
      console.error('Background scan error:', error);
      setStatus(`❌ Scan error: ${error.message}`);
      setTimeout(() => setStatus(''), 10000);
    }
  };

  const approveContent = async (contentId) => {
    try {
      const contentRef = doc(db, 'foundContents', contentId);
      await updateDoc(contentRef, {
        status: 'approved',
        approvedAt: new Date()
      });
      setStatus('✅ Content approved');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error approving content:', error);
      setStatus('❌ Error approving content');
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const postContent = async (content) => {
    if (!user) {
      setStatus('❌ Please sign in to post content');
      return;
    }

    setPosting(true);
    setStatus('🚀 Posting content...');

    try {
      const accountsDoc = await getDoc(doc(db, 'settings', `accounts_${user.uid}`));
      if (!accountsDoc.exists()) {
        throw new Error('Account settings not found');
      }

      const accountSettings = accountsDoc.data();
      
      const aiDoc = await getDoc(doc(db, 'settings', `ai_${user.uid}`));
      const aiSettings = aiDoc.exists() ? aiDoc.data() : {};
      
      const contentWithCustomText = {
        ...content,
        customText: aiSettings.customText || '🚀 Check this out:'
      };

      await ContentScanner.postApprovedContent(contentWithCustomText, accountSettings);
      setStatus('✅ Content posted successfully!');
    } catch (error) {
      console.error('Error posting content:', error);
      setStatus(`❌ Error posting: ${error.message}`);
    } finally {
      setPosting(false);
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const rejectContent = async (contentId) => {
    try {
      const contentRef = doc(db, 'foundContents', contentId);
      await updateDoc(contentRef, {
        status: 'rejected',
        rejectedAt: new Date()
      });
      setStatus('❌ Content rejected');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error rejecting content:', error);
      setStatus('❌ Error rejecting content');
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const deleteContent = async (contentId) => {
    try {
      await deleteDoc(doc(db, 'foundContents', contentId));
      setStatus('🗑️ Content deleted');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error deleting content:', error);
      setStatus('❌ Error deleting content');
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const filteredContents = contents.filter(content => {
    if (filter === 'all') return true;
    return content.status === filter;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', label: 'Pending', emoji: '⏳' },
      approved: { class: 'status-active', label: 'Approved', emoji: '✅' },
      posted: { class: 'status-success', label: 'Posted', emoji: '🚀' },
      rejected: { class: 'status-inactive', label: 'Rejected', emoji: '❌' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`status-badge ${config.class}`}>
        {config.emoji} {config.label}
      </span>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDate(timestamp);
  };

  const getNextScanTime = () => {
    if (!lastScanTime) return 'Soon';
    const nextScan = new Date(lastScanTime.getTime() + (userScanInterval * 60000));
    const now = new Date();
    const diffMs = nextScan - now;
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    
    if (diffMins === 0) return 'Any moment';
    return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Found Contents</h2>
        <div className="header-status">
          <span className="status-badge status-active">{contents.length} Items</span>
          {lastScanTime && (
            <span className="scan-time">
              🔄 Auto-scan: every {userScanInterval} min • Last: {formatTimeAgo(lastScanTime)} • Next: {getNextScanTime()}
            </span>
          )}
        </div>
      </div>
      
      <p className="card-subtitle">
        Automatically discovered tweets and news articles. Configure scan frequency in News Sources.
      </p>

      {/* Status Message */}
      {status && (
        <div className={`status-message ${
          status.includes('✅') ? 'success' : 
          status.includes('❌') ? 'error' : 'info'
        }`}>
          {status}
        </div>
      )}

      <div className="content-controls">
        <div className="filter-group">
          <label className="form-label">Filter by Status</label>
          <select 
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Contents ({contents.length})</option>
            <option value="pending">Pending Review ({contents.filter(c => c.status === 'pending').length})</option>
            <option value="approved">Approved ({contents.filter(c => c.status === 'approved').length})</option>
            <option value="posted">Posted ({contents.filter(c => c.status === 'posted').length})</option>
            <option value="rejected">Rejected ({contents.filter(c => c.status === 'rejected').length})</option>
          </select>
        </div>
      </div>

      <div className="contents-list">
        {filteredContents.length === 0 ? (
          <div className="no-content">
            <p>No contents found matching the current filter.</p>
            {!user && <p>Please sign in to see your contents.</p>}
            {user && contents.length === 0 && (
              <div className="setup-guide">
                <h4>To get started:</h4>
                <ol>
                  <li>Configure your X account settings</li>
                  <li>Add news sources to monitor</li>
                  <li>Set up AI keywords for filtering</li>
                  <li>Choose your preferred scan frequency in News Sources</li>
                  <li>The system will automatically scan every {userScanInterval} minutes</li>
                </ol>
              </div>
            )}
          </div>
        ) : (
          filteredContents.map((content) => (
            <div key={content.id} className="content-item">
              <div className="content-header">
                <div>
                  <span className="content-source">
                    {content.type === 'tweet' ? '🐦 Tweet' : '📰 News'} • {content.source}
                  </span>
                  <div className="content-date">
                    {formatDate(content.timestamp)}
                  </div>
                </div>
                {getStatusBadge(content.status)}
              </div>
              
              <div className="content-text">
                {content.title || content.content}
                {content.url && content.url.startsWith('http') && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <a 
                      href={content.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.9rem', color: '#1da1f2' }}
                    >
                      🔗 View Original
                    </a>
                  </div>
                )}
              </div>

              {content.ai_analysis && (
                <div className="ai-analysis">
                  <strong>AI Analysis:</strong>
                  <span className={`sentiment ${content.ai_analysis.sentiment}`}>
                    {content.ai_analysis.sentiment} 
                  </span>
                  <span className="confidence">
                    ({Math.round(content.ai_analysis.confidence * 100)}% confidence)
                  </span>
                  {content.ai_analysis.relevant_keywords?.length > 0 && (
                    <div className="keywords">
                      <strong>Keywords:</strong> {content.ai_analysis.relevant_keywords.join(', ')}
                    </div>
                  )}
                </div>
              )}

              <div className="content-actions">
                {content.status === 'pending' && (
                  <>
                    <button 
                      className="btn btn-success"
                      onClick={() => approveContent(content.id)}
                      disabled={posting}
                    >
                      ✅ Approve
                    </button>
                    <button 
                      className="btn btn-warning"
                      onClick={() => rejectContent(content.id)}
                    >
                      ❌ Reject
                    </button>
                  </>
                )}
                
                {content.status === 'approved' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => postContent(content)}
                    disabled={posting}
                  >
                    {posting ? <div className="spinner"></div> : '🚀'}
                    {posting ? 'Posting...' : 'Post Now'}
                  </button>
                )}
                
                <button 
                  className="btn btn-secondary"
                  onClick={() => deleteContent(content.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {!user && (
        <div className="status-message info">
          🔐 Please sign in to view and manage found contents.
        </div>
      )}
    </div>
  );
};

export default FoundContents;