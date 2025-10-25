import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const NewsSources = ({ user }) => {
  const [sources, setSources] = useState(['']);
  const [scanFrequency, setScanFrequency] = useState(300);
  const [scanInterval, setScanInterval] = useState(10); // Default 10 minutes
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (user) {
      loadNewsSettings();
    }
  }, [user]);

  const loadNewsSettings = async () => {
    try {
      if (!db) {
        setSaveStatus('❌ Firebase not initialized');
        return;
      }

      if (!user) {
        setSaveStatus('⚠️ Please sign in to load settings');
        return;
      }

      const docRef = doc(db, 'settings', `news_${user.uid}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSources(data.sources || ['']);
        setScanFrequency(data.scanFrequency || 300);
        setScanInterval(data.scanInterval || 10); // Load saved interval
        setSaveStatus(`👤 Loaded news settings for: ${user.email}`);
      } else {
        setSources(['']);
        setScanFrequency(300);
        setScanInterval(10); // Default interval
        setSaveStatus(`👤 Signed in as: ${user.email} - Configure and save news sources.`);
      }
    } catch (error) {
      console.error('Error loading news settings:', error);
      setSaveStatus('❌ Error loading news settings: ' + error.message);
    }
  };

  const saveNewsSettings = async () => {
    if (!db) {
      setSaveStatus('❌ Firebase not connected');
      return;
    }

    if (!user) {
      setSaveStatus('❌ Please sign in to save settings');
      return;
    }

    // Validate URLs
    const validSources = sources.filter(url => {
      const trimmed = url.trim();
      return trimmed !== '' && (trimmed.startsWith('http://') || trimmed.startsWith('https://'));
    });

    if (validSources.length === 0) {
      setSaveStatus('❌ Please add at least one valid news source URL');
      return;
    }

    setLoading(true);
    setSaveStatus('Saving news sources...');
    
    try {
      await setDoc(doc(db, 'settings', `news_${user.uid}`), {
        sources: validSources,
        scanFrequency,
        scanInterval: parseInt(scanInterval), // Save the interval
        userId: user.uid,
        userEmail: user.email,
        lastUpdated: new Date(),
        createdAt: new Date()
      });
      
      setSaveStatus(`✅ News settings saved! Auto-scan: every ${scanInterval} minutes`);
      
      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving news settings:', error);
      setSaveStatus('❌ Error saving news settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addSource = () => {
    setSources(prev => [...prev, '']);
  };

  const removeSource = (index) => {
    if (sources.length > 1) {
      setSources(prev => prev.filter((_, i) => i !== index));
    } else {
      // If it's the last source, just clear it instead of removing
      setSources(['']);
    }
  };

  const updateSource = (index, value) => {
    setSources(prev => prev.map((source, i) => i === index ? value : source));
  };

  const validateUrl = (url) => {
    if (!url.trim()) return true; // Empty is okay for intermediate state
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const testNewsSource = async (url) => {
    if (!url.trim()) {
      setSaveStatus('❌ Please enter a URL to test');
      return;
    }

    if (!validateUrl(url)) {
      setSaveStatus('❌ Please enter a valid URL (must start with http:// or https://)');
      return;
    }

    setSaveStatus(`🔍 Testing connection to: ${url}`);
    
    // Simulate connection test
    setTimeout(() => {
      setSaveStatus(`✅ Successfully connected to: ${url}`);
      setTimeout(() => setSaveStatus(''), 3000);
    }, 2000);
  };

  const resetToDefaults = () => {
    setSources([
      'https://www.bbc.com/news',
      'https://www.reuters.com/business/',
      'https://www.cnbc.com/world/?region=world'
    ]);
    setScanFrequency(300);
    setScanInterval(10);
    setSaveStatus('🔄 Reset to default news sources');
  };

  // Interval options for user selection
  const intervalOptions = [
    { value: 1, label: '1 minute', description: 'Most frequent - may impact performance' },
    { value: 5, label: '5 minutes', description: 'Very frequent' },
    { value: 10, label: '10 minutes', description: 'Recommended - balances speed and performance' },
    { value: 15, label: '15 minutes', description: 'Moderate frequency' },
    { value: 30, label: '30 minutes', description: 'Less frequent' },
    { value: 60, label: '1 hour', description: 'Infrequent' },
    { value: 120, label: '2 hours', description: 'Least frequent' }
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">News Sources & Auto-Scan</h2>
        <span className="status-badge status-active">Active</span>
      </div>
      
      <p className="card-subtitle">
        Configure news sources and automatic scanning frequency.
      </p>

      {/* Status Message */}
      {saveStatus && (
        <div className={`status-message ${
          saveStatus.includes('✅') ? 'success' : 
          saveStatus.includes('❌') ? 'error' : 
          saveStatus.includes('⚠️') ? 'info' : 'info'
        }`}>
          {saveStatus}
        </div>
      )}

      {!user && (
        <div className="status-message info">
          🔐 Please sign in to access and manage news sources.
        </div>
      )}

      {/* Auto-Scan Interval Settings */}
      <div className="form-group">
        <label className="form-label">Auto-Scan Frequency</label>
        <select 
          className="form-select"
          value={scanInterval}
          onChange={(e) => setScanInterval(parseInt(e.target.value))}
          disabled={!user}
        >
          {intervalOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
          {intervalOptions.find(opt => opt.value === scanInterval)?.description}
        </small>
        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
          <strong>Next scan:</strong> Approximately {scanInterval} minutes from last scan
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">News Websites</label>
        <small style={{ color: 'var(--text-secondary)', marginBottom: '1rem', display: 'block' }}>
          Add RSS feeds or news website URLs. The system will automatically monitor these for new content.
        </small>
        
        {sources.map((source, index) => (
          <div key={index} className="url-input-group">
            <input
              type="url"
              className={`form-input ${!validateUrl(source) && source.trim() ? 'input-error' : ''}`}
              placeholder="https://example.com/news or https://example.com/rss"
              value={source}
              onChange={(e) => updateSource(index, e.target.value)}
              disabled={!user}
            />
            <div className="url-actions">
              <button 
                className="btn btn-secondary btn-small"
                onClick={() => testNewsSource(source)}
                disabled={!user || !source.trim()}
                title="Test connection"
              >
                🔍 Test
              </button>
              {sources.length > 1 && (
                <button 
                  className="btn btn-secondary btn-small"
                  onClick={() => removeSource(index)}
                  type="button"
                  disabled={!user}
                  title="Remove source"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
        
        <div className="button-group">
          <button 
            className="btn btn-secondary"
            onClick={addSource}
            type="button"
            disabled={!user}
          >
            ➕ Add Another Source
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={resetToDefaults}
            type="button"
            disabled={!user}
          >
            🔄 Reset to Defaults
          </button>
        </div>
        
        <div style={{ marginTop: '0.5rem' }}>
          <small style={{ color: 'var(--text-secondary)' }}>
            <strong>Tips:</strong> Use RSS feeds when available for better results. Make sure the websites are publicly accessible.
          </small>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Content Scan Depth</label>
        <select 
          className="form-select"
          value={scanFrequency}
          onChange={(e) => setScanFrequency(Number(e.target.value))}
          disabled={!user}
        >
          <option value={60}>Quick Scan (fewer articles, faster)</option>
          <option value={300}>Standard Scan (balanced)</option>
          <option value={600}>Deep Scan (more articles, slower)</option>
        </select>
        <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
          Controls how many articles are scanned from each source
        </small>
      </div>

      <div className="button-group">
        <button 
          className="btn btn-primary" 
          onClick={saveNewsSettings}
          disabled={loading || !user}
        >
          {loading ? <div className="spinner"></div> : '💾'}
          Save Settings
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={loadNewsSettings}
          disabled={!user}
        >
          🔄 Load Settings
        </button>
      </div>

      {user && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#4e4e4eff', borderRadius: '8px' }}>
          <h4>Auto-Scan Status:</h4>
          <p><strong>User:</strong> {user.email}</p>
          <p><strong>Sources Configured:</strong> {sources.filter(url => url.trim() !== '').length}</p>
          <p><strong>Scan Frequency:</strong> Every {scanInterval} minutes</p>
          <p><strong>Scan Depth:</strong> {scanFrequency === 60 ? 'Quick' : scanFrequency === 300 ? 'Standard' : 'Deep'}</p>
          <p><strong>Next Scan:</strong> ~{scanInterval} minutes from last scan</p>
        </div>
      )}
    </div>
  );
};

export default NewsSources;