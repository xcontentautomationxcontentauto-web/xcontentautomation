import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AISettings = ({ user }) => {
  const [settings, setSettings] = useState({
    keywords: ['stocks', 'jumpy sales', 'rebots'],
    customText: '🚀 Check this out:',
    openaiApiKey: '',
    enableSentiment: false,
    requireApproval: true
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (user) {
      loadAISettings();
    }
  }, [user]);

  const loadAISettings = async () => {
    try {
      if (!db) {
        setSaveStatus('❌ Firebase not initialized');
        return;
      }

      if (!user) {
        setSaveStatus('⚠️ Please sign in to load settings');
        return;
      }

      const docRef = doc(db, 'settings', `ai_${user.uid}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings(data);
        setSaveStatus(`👤 Loaded AI settings for: ${user.email}`);
      } else {
        setSaveStatus(`👤 Signed in as: ${user.email} - Configure and save AI settings.`);
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
      setSaveStatus('❌ Error loading AI settings: ' + error.message);
    }
  };

  const saveAISettings = async () => {
    if (!db) {
      setSaveStatus('❌ Firebase not connected');
      return;
    }

    if (!user) {
      setSaveStatus('❌ Please sign in to save settings');
      return;
    }

    setLoading(true);
    setSaveStatus('Saving AI settings...');
    
    try {
      await setDoc(doc(db, 'settings', `ai_${user.uid}`), {
        ...settings,
        userId: user.uid,
        userEmail: user.email,
        lastUpdated: new Date(),
        createdAt: settings.createdAt || new Date()
      });
      setSaveStatus(`✅ AI settings saved for: ${user.email}`);
      
      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving AI settings:', error);
      setSaveStatus('❌ Error saving AI settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !settings.keywords.includes(newKeyword.trim())) {
      setSettings(prev => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keywordToRemove) => {
    setSettings(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keywordToRemove)
    }));
  };

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testAIConnection = async () => {
    if (!settings.openaiApiKey) {
      setSaveStatus('❌ Please enter your OpenAI API key first');
      return;
    }

    setSaveStatus('Testing AI connection...');
    
    // Simulate AI connection test (you can replace this with actual OpenAI API call)
    setTimeout(() => {
      setSaveStatus('✅ AI connection test completed (simulated)');
      setTimeout(() => setSaveStatus(''), 3000);
    }, 1500);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Artificial Intelligence Settings</h2>
        <span className="status-badge status-active">AI Active</span>
      </div>
      
      <p className="card-subtitle">
        Configure AI analysis for content filtering and enhancement.
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
          🔐 Please sign in to access and save AI settings.
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Keywords for Analysis</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Enter new keyword"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
            disabled={!user}
          />
          <button 
            className="btn btn-secondary" 
            onClick={addKeyword}
            disabled={!user}
          >
            ➕ Add
          </button>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {settings.keywords.map((keyword, index) => (
            <span 
              key={index}
              className="keyword-tag"
            >
              {keyword}
              <button 
                onClick={() => removeKeyword(keyword)}
                className="keyword-remove"
                disabled={!user}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
          Content containing these keywords will be automatically filtered and shared
        </small>
      </div>

      <div className="form-group">
        <label className="form-label">Custom Text</label>
        <input
          type="text"
          className="form-input"
          placeholder="Text to add before shared content"
          value={settings.customText}
          onChange={(e) => handleSettingChange('customText', e.target.value)}
          disabled={!user}
        />
        <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
          This text will be prepended to all shared content
        </small>
      </div>

      <div className="form-group">
        <label className="form-label">OpenAI API Key</label>
        <input
          type="password"
          className="form-input"
          placeholder="sk-..."
          value={settings.openaiApiKey}
          onChange={(e) => handleSettingChange('openaiApiKey', e.target.value)}
          disabled={!user}
        />
        <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
          Required for AI content analysis and filtering. Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI</a>
        </small>
      </div>

      <div className="grid grid-2">
        <div className="form-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings.enableSentiment}
              onChange={(e) => handleSettingChange('enableSentiment', e.target.checked)}
              disabled={!user}
            />
            <span className="toggle-slider"></span>
            <span>Enable Sentiment Analysis</span>
          </label>
          <small style={{ color: 'var(--text-secondary)', display: 'block', marginLeft: '60px' }}>
            Analyze emotional tone of content before sharing
          </small>
        </div>

        <div className="form-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings.requireApproval}
              onChange={(e) => handleSettingChange('requireApproval', e.target.checked)}
              disabled={!user}
            />
            <span className="toggle-slider"></span>
            <span>Require Approval Before Sharing</span>
          </label>
          <small style={{ color: 'var(--text-secondary)', display: 'block', marginLeft: '60px' }}>
            Manual approval required before content is posted
          </small>
        </div>
      </div>

      <div className="button-group">
        <button 
          className="btn btn-primary" 
          onClick={saveAISettings}
          disabled={loading || !user}
        >
          {loading ? <div className="spinner"></div> : '💾'}
          Save AI Settings
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={testAIConnection}
          disabled={!user}
        >
          🤖 Test AI Connection
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={loadAISettings}
          disabled={!user}
        >
          🔄 Load Settings
        </button>
      </div>

      {user && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#4e4e4eff', borderRadius: '8px' }}>
          <h4>AI Settings Status:</h4>
          <p><strong>User:</strong> {user.email}</p>
          <p><strong>Collection:</strong> settings</p>
          {/* <p><strong>Document:</strong> ai_{user.uid}</p> */}
          <p><strong>Keywords:</strong> {settings.keywords.length} configured</p>
          <p><strong>Sentiment Analysis:</strong> {settings.enableSentiment ? 'Enabled' : 'Disabled'}</p>
          <p><strong>Auto-approval:</strong> {settings.requireApproval ? 'Disabled' : 'Enabled'}</p>
        </div>
      )}
    </div>
  );
};

export default AISettings;