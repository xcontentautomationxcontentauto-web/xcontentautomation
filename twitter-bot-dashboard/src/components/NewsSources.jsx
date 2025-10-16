import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const NewsSources = () => {
  const [sources, setSources] = useState(['']);
  const [scanFrequency, setScanFrequency] = useState(300);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNewsSettings();
  }, []);

  const loadNewsSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'news');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSources(data.sources || ['']);
        setScanFrequency(data.scanFrequency || 300);
      }
    } catch (error) {
      console.error('Error loading news settings:', error);
    }
  };

  const saveNewsSettings = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'news'), {
        sources: sources.filter(url => url.trim() !== ''),
        scanFrequency
      });
      alert('News sources saved successfully!');
    } catch (error) {
      console.error('Error saving news settings:', error);
      alert('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const addSource = () => {
    setSources(prev => [...prev, '']);
  };

  const removeSource = (index) => {
    setSources(prev => prev.filter((_, i) => i !== index));
  };

  const updateSource = (index, value) => {
    setSources(prev => prev.map((source, i) => i === index ? value : source));
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">News Sources</h2>
        <span className="status-badge status-active">Monitoring</span>
      </div>
      
      <p className="card-subtitle">
        Add news websites to monitor. Published articles will be analyzed and shared if they match your keywords.
      </p>

      <div className="form-group">
        <label className="form-label">News Websites</label>
        {sources.map((source, index) => (
          <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="url"
              className="form-input"
              placeholder="https://example.com/news"
              value={source}
              onChange={(e) => updateSource(index, e.target.value)}
            />
            {sources.length > 1 && (
              <button 
                className="btn btn-secondary"
                onClick={() => removeSource(index)}
                type="button"
              >
                🗑️
              </button>
            )}
          </div>
        ))}
        <button 
          className="btn btn-secondary"
          onClick={addSource}
          type="button"
        >
          ➕ Add Another Source
        </button>
      </div>

      <div className="form-group">
        <label className="form-label">Scan Frequency</label>
        <select 
          className="form-select"
          value={scanFrequency}
          onChange={(e) => setScanFrequency(Number(e.target.value))}
        >
          <option value={60}>Every minute</option>
          <option value={300}>Every 5 minutes</option>
          <option value={600}>Every 10 minutes</option>
          <option value={1800}>Every 30 minutes</option>
          <option value={3600}>Every hour</option>
        </select>
        <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
          Current: {scanFrequency} seconds ({Math.round(scanFrequency / 60)} minutes)
        </small>
      </div>

      <button 
        className="btn btn-primary" 
        onClick={saveNewsSettings}
        disabled={loading}
      >
        {loading ? <div className="spinner"></div> : '💾'}
        Save News Settings
      </button>
    </div>
  );
};

export default NewsSources;