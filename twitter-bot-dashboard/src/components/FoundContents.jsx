import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, orderBy, query, where, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

const FoundContents = ({ user }) => {
  const [contents, setContents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (user) {
      subscribeToFoundContents();
    } else {
      setContents([]);
      setStatus('⚠️ Please sign in to view found contents');
    }
  }, [user]);

  const subscribeToFoundContents = () => {
    if (!db || !user) return;

    try {
      // Only show contents for the current user
      const q = query(
        collection(db, 'foundContents'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const contentsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setContents(contentsData);
          setStatus(`👤 Loaded ${contentsData.length} items for: ${user.email}`);

          // Clear status after 3 seconds
          setTimeout(() => {
            if (status.includes('👤 Loaded')) setStatus('');
          }, 3000);
        },
        (error) => {
          console.error('Error subscribing to found contents:', error);
          setStatus('❌ Error loading contents: ' + error.message);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up subscription:', error);
      setStatus('❌ Error: ' + error.message);
    }
  };

  const addTestContent = async () => {
    if (!db || !user) {
      setStatus('❌ Please sign in to add test content');
      return;
    }

    setLoading(true);
    setStatus('Adding test content...');

    try {
      const testContents = [
        {
          content: '🚀 Breaking: Tech stocks surge as AI companies report record earnings and market optimism grows',
          type: 'news',
          source: 'https://www.reuters.com/business/',
          status: 'pending',
          userId: user.uid,
          userEmail: user.email,
          timestamp: new Date(),
          aiAnalysis: {
            sentiment: 'positive',
            confidence: 0.92,
            keywords: ['stocks', 'AI', 'earnings']
          }
        },
        {
          content: 'Just announced: Major partnership between leading tech giants to advance artificial intelligence research #AI #Tech',
          type: 'tweet',
          source: 'Account A',
          status: 'pending',
          userId: user.uid,
          userEmail: user.email,
          timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          aiAnalysis: {
            sentiment: 'positive',
            confidence: 0.88,
            keywords: ['AI', 'tech', 'partnership']
          }
        },
        {
          content: 'Market update: Global markets show mixed results as investors await economic data. Trading volumes remain high.',
          type: 'news',
          source: 'https://www.cnbc.com/',
          status: 'approved',
          userId: user.uid,
          userEmail: user.email,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          aiAnalysis: {
            sentiment: 'neutral',
            confidence: 0.85,
            keywords: ['market', 'stocks', 'trading']
          }
        },
        {
          content: 'Exciting developments in renewable energy sector! Solar and wind companies reporting strong growth. #CleanEnergy #Stocks',
          type: 'tweet',
          source: 'Account A',
          status: 'posted',
          userId: user.uid,
          userEmail: user.email,
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          aiAnalysis: {
            sentiment: 'positive',
            confidence: 0.91,
            keywords: ['renewable', 'energy', 'stocks']
          }
        },
        {
          content: 'Federal Reserve announces interest rate decision affecting global markets and investor sentiment worldwide',
          type: 'news',
          source: 'https://www.bbc.com/news',
          status: 'pending',
          userId: user.uid,
          userEmail: user.email,
          timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          aiAnalysis: {
            sentiment: 'neutral',
            confidence: 0.87,
            keywords: ['federal', 'rate', 'markets']
          }
        }
      ];

      // Add test content to Firestore
      for (const content of testContents) {
        await addDoc(collection(db, 'foundContents'), content);
      }

      setStatus('✅ Test content added successfully! You can now manage it.');
      setTimeout(() => setStatus(''), 5000);
    } catch (error) {
      console.error('Error adding test content:', error);
      setStatus('❌ Error adding test content: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateContentStatus = async (contentId, newStatus) => {
    if (!db || !user) {
      setStatus('❌ Please sign in to update content');
      return;
    }

    setLoading(true);
    try {
      const contentRef = doc(db, 'foundContents', contentId);
      await updateDoc(contentRef, {
        status: newStatus,
        lastUpdated: new Date(),
        updatedBy: user.uid
      });
      setStatus(`✅ Content ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating content:', error);
      setStatus('❌ Error updating content: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteContent = async (contentId) => {
    if (!db || !user) {
      setStatus('❌ Please sign in to delete content');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this content?')) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'foundContents', contentId));
      setStatus('✅ Content deleted successfully');
    } catch (error) {
      console.error('Error deleting content:', error);
      setStatus('❌ Error deleting content: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const editContent = async (contentId, newContent) => {
    if (!db || !user) {
      setStatus('❌ Please sign in to edit content');
      return;
    }

    const editedContent = prompt('Edit content:', newContent);
    if (editedContent && editedContent !== newContent) {
      setLoading(true);
      try {
        const contentRef = doc(db, 'foundContents', contentId);
        await updateDoc(contentRef, {
          content: editedContent,
          lastUpdated: new Date(),
          updatedBy: user.uid,
          edited: true
        });
        setStatus('✅ Content updated successfully');
      } catch (error) {
        console.error('Error editing content:', error);
        setStatus('❌ Error editing content: ' + error.message);
      } finally {
        setLoading(false);
      }
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
    try {
      return new Date(timestamp.toDate ? timestamp.toDate() : timestamp).toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusCounts = () => {
    const counts = {
      all: contents.length,
      pending: contents.filter(c => c.status === 'pending').length,
      approved: contents.filter(c => c.status === 'approved').length,
      posted: contents.filter(c => c.status === 'posted').length,
      rejected: contents.filter(c => c.status === 'rejected').length
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Found Contents</h2>
        <span className="status-badge status-active">
          {contents.length} Item{contents.length !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="card-subtitle">
        Recently discovered tweets and news articles that match your criteria.
      </p>

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
          🔐 Please sign in to view and manage found contents.
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Filter by Status</label>
        <select 
          className="form-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          disabled={!user}
        >
          <option value="all">All Contents ({statusCounts.all})</option>
          <option value="pending">Pending Review ({statusCounts.pending})</option>
          <option value="approved">Approved ({statusCounts.approved})</option>
          <option value="posted">Posted ({statusCounts.posted})</option>
          <option value="rejected">Rejected ({statusCounts.rejected})</option>
        </select>
      </div>

      {/* Add Test Content Button */}
      {user && contents.length === 0 && (
        <div className="form-group" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            No content found yet. Add test data to see how the system works.
          </p>
          <button 
            className="btn btn-primary"
            onClick={addTestContent}
            disabled={loading}
          >
            {loading ? <div className="spinner"></div> : '🧪'}
            Add Test Content
          </button>
        </div>
      )}

      {/* Quick Stats */}
      {user && contents.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <span className="stat-number">{statusCounts.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{statusCounts.approved}</span>
            <span className="stat-label">Approved</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{statusCounts.posted}</span>
            <span className="stat-label">Posted</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{statusCounts.rejected}</span>
            <span className="stat-label">Rejected</span>
          </div>
        </div>
      )}

      <div className="contents-list">
        {!user ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            Please sign in to view found contents.
          </div>
        ) : filteredContents.length === 0 && contents.length > 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No contents found matching the current filter.
          </div>
        ) : filteredContents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No contents found yet. The system will automatically add content here when it finds matches.
          </div>
        ) : (
          filteredContents.map((content) => (
            <div key={content.id} className="content-item">
              <div className="content-header">
                <div>
                  <span className="content-source">
                    {content.type === 'tweet' ? '🐦 Tweet' : '📰 News'} • {content.source}
                    {content.edited && ' (Edited)'}
                  </span>
                  <div className="content-date">
                    Found: {formatDate(content.timestamp)}
                    {content.lastUpdated && ` • Updated: ${formatDate(content.lastUpdated)}`}
                  </div>
                </div>
                {getStatusBadge(content.status)}
              </div>

              <div className="content-text">
                {content.content}
              </div>

              {content.aiAnalysis && (
                <div style={{ 
                  fontSize: '0.9rem', 
                  color: 'var(--text-secondary)',
                  marginBottom: '1rem',
                  padding: '0.5rem',
                  background: 'var(--background-color)',
                  borderRadius: '4px'
                }}>
                  <strong>AI Analysis:</strong> {content.aiAnalysis.sentiment || 'Neutral'} • 
                  Confidence: {Math.round((content.aiAnalysis.confidence || 0) * 100)}%
                </div>
              )}

              <div className="content-actions">
                {content.status === 'pending' && (
                  <button 
                    className="btn btn-success"
                    onClick={() => updateContentStatus(content.id, 'approved')}
                    disabled={loading}
                  >
                    ✅ Approve
                  </button>
                )}

                {content.status === 'approved' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => updateContentStatus(content.id, 'posted')}
                    disabled={loading}
                  >
                    🚀 Post Now
                  </button>
                )}

                <button 
                  className="btn btn-secondary"
                  onClick={() => editContent(content.id, content.content)}
                  disabled={loading}
                >
                  ✏️ Edit
                </button>

                {content.status !== 'rejected' && (
                  <button 
                    className="btn btn-warning"
                    onClick={() => updateContentStatus(content.id, 'rejected')}
                    disabled={loading}
                  >
                    ❌ Reject
                  </button>
                )}

                <button 
                  className="btn btn-danger"
                  onClick={() => deleteContent(content.id)}
                  disabled={loading}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {user && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#4e4e4eff', borderRadius: '8px' }}>
          <h4>Found Contents Status:</h4>
          <p><strong>User:</strong> {user.email}</p>
          <p><strong>Total Items:</strong> {contents.length}</p>
          <p><strong>Current Filter:</strong> {filter} ({filteredContents.length} items)</p>
          <p><strong>Auto-refresh:</strong> Enabled (real-time updates)</p>
        </div>
      )}
    </div>
  );
};

export default FoundContents;