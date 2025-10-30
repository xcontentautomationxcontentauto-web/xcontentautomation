import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { LanguageUtils } from '../utils/language';
import { NewsScraper } from '../services/newsScraper';

const NewsSources = ({ user, language }) => {
  const [sources, setSources] = useState([]);
  const [scanInterval, setScanInterval] = useState(10);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [feedType, setFeedType] = useState('rss'); // 'rss' or 'json'

  // Get predefined RSS sources
  const rssSources = NewsScraper.getRSSFeeds();
  const jsonSources = NewsScraper.getJSONFeeds();
  const allSources = [...rssSources, ...jsonSources];

  useEffect(() => {
    if (user) {
      loadNewsSettings();
    }
  }, [user]);

  const loadNewsSettings = async () => {
    try {
      if (!db || !user) return;

      const docRef = doc(db, 'settings', `news_${user.uid}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSources(data.sources || []);
        setScanInterval(data.scanInterval || 10);
        setFeedType(data.feedType || 'rss');
        setSaveStatus(LanguageUtils.getText('👤 Loaded news settings for: ', language) + user.email);
      } else {
        // Set default RSS sources (all enabled by default)
        setSources(rssSources.map(s => s.url));
        setScanInterval(10);
        setFeedType('rss');
        setSaveStatus(LanguageUtils.getText('👤 Signed in as: ', language) + user.email);
      }
    } catch (error) {
      console.error('Error loading news settings:', error);
      setSaveStatus('❌ ' + error.message);
    }
  };

  const saveNewsSettings = async () => {
    if (!db || !user) {
      setSaveStatus(LanguageUtils.getText('❌ Please sign in to save settings', language));
      return;
    }

    setLoading(true);
    setSaveStatus(LanguageUtils.getText('Saving news sources...', language));
    
    try {
      await setDoc(doc(db, 'settings', `news_${user.uid}`), {
        sources: sources,
        scanInterval: parseInt(scanInterval),
        feedType: feedType,
        userId: user.uid,
        userEmail: user.email,
        lastUpdated: new Date(),
        createdAt: new Date()
      });
      
      setSaveStatus(LanguageUtils.getText('✅ News settings saved! Auto-scan: every ', language) + scanInterval + LanguageUtils.getText(' minutes', language));
      
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving news settings:', error);
      setSaveStatus('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = (sourceUrl) => {
    setSources(prev => 
      prev.includes(sourceUrl) 
        ? prev.filter(url => url !== sourceUrl)
        : [...prev, sourceUrl]
    );
  };

  const testSource = async (source) => {
    if (!source.url) return;
    
    setSaveStatus(LanguageUtils.getText('🔍 Testing source: ', language) + source.name);
    
    try {
      let articles = [];
      
      if (source.url.includes('reddit.com')) {
        articles = await NewsScraper.scrapeJSONFeed(source.url, source.name);
      } else {
        articles = await NewsScraper.scrapeRSSFeed(source.url, source.name);
      }
      
      setSaveStatus(`✅ ${source.name}: ${articles.length} articles found`);
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      setSaveStatus(`❌ ${source.name}: Test failed - ${error.message}`);
      setTimeout(() => setSaveStatus(''), 5000);
    }
  };

  const resetToDefaults = () => {
    if (feedType === 'rss') {
      setSources(rssSources.map(s => s.url));
    } else {
      setSources(jsonSources.map(s => s.url));
    }
    setSaveStatus(LanguageUtils.getText('🔄 Reset to default sources', language));
  };

  const selectAllSources = () => {
    if (feedType === 'rss') {
      setSources(rssSources.map(s => s.url));
    } else {
      setSources(jsonSources.map(s => s.url));
    }
    setSaveStatus(LanguageUtils.getText('✅ All sources selected', language));
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const deselectAllSources = () => {
    setSources([]);
    setSaveStatus(LanguageUtils.getText('✅ All sources deselected', language));
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const testAllEnabledSources = async () => {
    const enabledSources = allSources.filter(source => sources.includes(source.url));
    
    if (enabledSources.length === 0) {
      setSaveStatus(LanguageUtils.getText('❌ No sources enabled to test', language));
      return;
    }

    setSaveStatus(LanguageUtils.getText('🔍 Testing all enabled sources...', language));
    
    let totalArticles = 0;
    let successfulSources = 0;
    
    for (const source of enabledSources) {
      try {
        let articles = [];
        
        if (source.url.includes('reddit.com')) {
          articles = await NewsScraper.scrapeJSONFeed(source.url, source.name);
        } else {
          articles = await NewsScraper.scrapeRSSFeed(source.url, source.name);
        }
        
        if (articles.length > 0) {
          totalArticles += articles.length;
          successfulSources++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Test failed for ${source.name}:`, error);
      }
    }
    
    setSaveStatus(`✅ Test completed: ${successfulSources}/${enabledSources.length} sources working, ${totalArticles} total articles`);
    setTimeout(() => setSaveStatus(''), 5000);
  };

  const filteredSources = feedType === 'rss' ? rssSources : jsonSources;

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">{LanguageUtils.getText('News Sources & Auto-Scan', language)}</h2>
        <span className="status-badge status-active">{LanguageUtils.getText('Active', language)}</span>
      </div>
      
      <p className="card-subtitle">
        {LanguageUtils.getText('Configure news sources and automatic scanning frequency. Uses CORS proxy for RSS feeds.', language)}
      </p>

      {/* Status Message */}
      {saveStatus && (
        <div className={`status-message ${
          saveStatus.includes('✅') ? 'success' : 
          saveStatus.includes('❌') ? 'error' : 'info'
        }`}>
          {saveStatus}
        </div>
      )}

      {!user && (
        <div className="status-message info">
          🔐 {LanguageUtils.getText('Please sign in to access and manage news sources.', language)}
        </div>
      )}

      {/* Feed Type Selection */}
      <div className="form-group">
        <label className="form-label">{LanguageUtils.getText('Feed Type', language)}</label>
        <div className="feed-type-selector">
          <button 
            className={`feed-type-btn ${feedType === 'rss' ? 'active' : ''}`}
            onClick={() => setFeedType('rss')}
          >
            📰 RSS Feeds
          </button>
          <button 
            className={`feed-type-btn ${feedType === 'json' ? 'active' : ''}`}
            onClick={() => setFeedType('json')}
          >
            🔗 JSON Feeds
          </button>
        </div>
        <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
          {feedType === 'rss' 
            ? LanguageUtils.getText('RSS feeds work with CORS proxy. Some may be blocked.', language)
            : LanguageUtils.getText('JSON feeds (Reddit) work directly without CORS issues.', language)
          }
        </small>
      </div>

      {/* Auto-Scan Interval */}
      <div className="form-group">
        <label className="form-label">{LanguageUtils.getText('Auto-Scan Frequency', language)}</label>
        <select 
          className="form-select"
          value={scanInterval}
          onChange={(e) => setScanInterval(parseInt(e.target.value))}
          disabled={!user}
        >
          <option value={5}>{LanguageUtils.getText('5 minutes', language)}</option>
          <option value={10}>{LanguageUtils.getText('10 minutes', language)}</option>
          <option value={15}>{LanguageUtils.getText('15 minutes', language)}</option>
          <option value={30}>{LanguageUtils.getText('30 minutes', language)}</option>
          <option value={60}>{LanguageUtils.getText('1 hour', language)}</option>
        </select>
        <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
          {LanguageUtils.getText('System will automatically scan for new content', language)}
        </small>
      </div>

      {/* Source Selection */}
      <div className="form-group">
        <label className="form-label">{LanguageUtils.getText('Select News Sources', language)}</label>
        
        {/* Bulk Actions */}
        <div className="button-group" style={{ marginBottom: '1rem' }}>
          <button 
            className="btn btn-secondary btn-small"
            onClick={selectAllSources}
            disabled={!user}
          >
            ✅ {LanguageUtils.getText('Select All', language)}
          </button>
          <button 
            className="btn btn-secondary btn-small"
            onClick={deselectAllSources}
            disabled={!user}
          >
            ❌ {LanguageUtils.getText('Deselect All', language)}
          </button>
          <button 
            className="btn btn-secondary btn-small"
            onClick={resetToDefaults}
            disabled={!user}
          >
            🔄 {LanguageUtils.getText('Reset', language)}
          </button>
          <button 
            className="btn btn-secondary btn-small"
            onClick={testAllEnabledSources}
            disabled={!user || sources.length === 0}
          >
            🧪 {LanguageUtils.getText('Test All', language)}
          </button>
        </div>
        
        <small style={{ color: 'var(--text-secondary)', marginBottom: '1rem', display: 'block' }}>
          {LanguageUtils.getText('Choose which news sources to monitor. JSON feeds work better for CORS.', language)}
        </small>
        
        <div className="sources-grid">
          {filteredSources.map((source, index) => (
            <div key={index} className="source-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={sources.includes(source.url)}
                  onChange={() => toggleSource(source.url)}
                  disabled={!user}
                />
                <span className="source-name">{source.name}</span>
                <span className="source-category">{source.category}</span>
                <span className="source-type">{source.url.includes('reddit.com') ? 'JSON' : 'RSS'}</span>
                <div className="source-actions">
                  <button 
                    type="button"
                    className="btn-test-source"
                    onClick={() => testSource(source)}
                    disabled={!user}
                    title={LanguageUtils.getText('Test this source', language)}
                  >
                    🔍
                  </button>
                </div>
              </label>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: '0.5rem' }}>
          <small style={{ color: 'var(--text-secondary)' }}>
            <strong>{LanguageUtils.getText('Selected:', language)}</strong> {sources.length} / {filteredSources.length} {LanguageUtils.getText('sources', language)}
          </small>
        </div>
      </div>

      <div className="button-group">
        <button 
          className="btn btn-primary" 
          onClick={saveNewsSettings}
          disabled={loading || !user}
        >
          {loading ? <div className="spinner"></div> : '💾'}
          {LanguageUtils.getText('Save Settings', language)}
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={loadNewsSettings}
          disabled={!user}
        >
          🔄 {LanguageUtils.getText('Load Settings', language)}
        </button>
      </div>

      {user && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#4e4e4eff', borderRadius: '8px' }}>
          <h4>{LanguageUtils.getText('Feed Status:', language)}</h4>
          <p><strong>{LanguageUtils.getText('User:', language)}</strong> {user.email}</p>
          <p><strong>{LanguageUtils.getText('Feed Type:', language)}</strong> {feedType.toUpperCase()}</p>
          <p><strong>{LanguageUtils.getText('Sources Selected:', language)}</strong> {sources.length}</p>
          <p><strong>{LanguageUtils.getText('Scan Frequency:', language)}</strong> {LanguageUtils.getText('Every', language)} {scanInterval} {LanguageUtils.getText('minutes', language)}</p>
          <p><strong>{LanguageUtils.getText('CORS Proxy:', language)}</strong> {LanguageUtils.getText('Enabled', language)}</p>
        </div>
      )}
    </div>
  );
};

export default NewsSources;