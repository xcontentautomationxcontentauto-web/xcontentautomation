import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';

const FoundContents = () => {
  const [contents, setContents] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(
      collection(db, 'foundContents'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setContents(contentsData);
    });

    return () => unsubscribe();
  }, []);

  const filteredContents = contents.filter(content => {
    if (filter === 'all') return true;
    return content.status === filter;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', label: 'Pending' },
      approved: { class: 'status-active', label: 'Approved' },
      posted: { class: 'status-success', label: 'Posted' },
      rejected: { class: 'status-inactive', label: 'Rejected' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp.toDate()).toLocaleString();
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Found Contents</h2>
        <span className="status-badge status-active">{contents.length} Items</span>
      </div>
      
      <p className="card-subtitle">
        Recently discovered tweets and news articles that match your criteria.
      </p>

      <div className="form-group">
        <label className="form-label">Filter by Status</label>
        <select 
          className="form-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Contents</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="posted">Posted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="contents-list">
        {filteredContents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No contents found matching the current filter.
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
                {content.content}
              </div>

              {content.aiAnalysis && (
                <div style={{ 
                  fontSize: '0.9rem', 
                  color: 'var(--text-secondary)',
                  marginBottom: '1rem'
                }}>
                  AI Analysis: {content.aiAnalysis.sentiment} • 
                  Confidence: {Math.round(content.aiAnalysis.confidence * 100)}%
                </div>
              )}

              <div className="content-actions">
                <button className="btn btn-success" disabled={content.status === 'posted'}>
                  ✅ Approve
                </button>
                <button className="btn btn-primary" disabled={content.status !== 'approved'}>
                  🚀 Post Now
                </button>
                <button className="btn btn-secondary">
                  ✏️ Edit
                </button>
                <button className="btn btn-warning">
                  ❌ Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FoundContents;