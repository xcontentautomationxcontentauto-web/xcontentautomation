import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const Statistics = () => {
  const [stats, setStats] = useState({
    totalScanned: 0,
    aiApproved: 0,
    posted: 0,
    rejected: 0,
    lastScan: null,
    lastTweet: null,
    lastNews: null
  });

  useEffect(() => {
    const docRef = doc(db, 'statistics', 'current');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data());
      }
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp.toDate()).toLocaleString();
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Statistics</h2>
        <span className="status-badge status-active">Live</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">{stats.totalScanned}</span>
          <span className="stat-label">Total Scanned</span>
        </div>
        
        <div className="stat-card">
          <span className="stat-number">{stats.aiApproved}</span>
          <span className="stat-label">AI Approved</span>
        </div>
        
        <div className="stat-card">
          <span className="stat-number">{stats.posted}</span>
          <span className="stat-label">Posted</span>
        </div>
        
        <div className="stat-card">
          <span className="stat-number">{stats.rejected}</span>
          <span className="stat-label">Rejected</span>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Last Scan Time</label>
          <div className="form-input" style={{ background: 'var(--background-color)' }}>
            {formatDate(stats.lastScan)}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Last Tweet Posted</label>
          <div className="form-input" style={{ background: 'var(--background-color)' }}>
            {formatDate(stats.lastTweet)}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Last News Posted</label>
          <div className="form-input" style={{ background: 'var(--background-color)' }}>
            {formatDate(stats.lastNews)}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Success Rate</label>
          <div className="form-input" style={{ background: 'var(--background-color)' }}>
            {stats.totalScanned > 0 
              ? `${Math.round((stats.posted / stats.totalScanned) * 100)}%` 
              : '0%'
            }
          </div>
        </div>
      </div>

      <div className="form-group">
        <button className="btn btn-secondary">
          📊 Generate Detailed Report
        </button>
        
        <button className="btn btn-primary">
          🔄 Refresh Statistics
        </button>
      </div>
    </div>
  );
};

export default Statistics;