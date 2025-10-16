import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AISettings = () => {
  const [settings, setSettings] = useState({
    keywords: ['stocks', 'jumpy sales', 'rebots'],
    customText: '🚀 Check this out:',
    openaiApiKey: '',
    enableSentiment: false,
    requireApproval: true
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAISettings();
  }, []);

  const loadAISettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'ai');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  const saveAISettings = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'ai'), settings);
      alert('AI settings saved successfully!');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      alert('Error saving settings');
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

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Artificial Intelligence Settings</h2>
        <span className="status-badge status-active">AI Active</span>
      </div>
      
      <p className="card-subtitle">
        Configure AI analysis for content filtering and enhancement.
      </p>

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
          />
          <button className="btn btn-secondary" onClick={addKeyword}>
            ➕ Add
          </button>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {settings.keywords.map((keyword, index) => (
            <span 
              key={index}
              style={{
                background: 'var(--primary-color)',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {keyword}
              <button 
                onClick={() => removeKeyword(keyword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.7rem'
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Custom Text</label>
        <input
          type="text"
          className="form-input"
          placeholder="Text to add before shared content"
          value={settings.customText}
          onChange={(e) => handleSettingChange('customText', e.target.value)}
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
        />
      </div>

      <div className="grid grid-2">
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={settings.enableSentiment}
              onChange={(e) => handleSettingChange('enableSentiment', e.target.checked)}
            />
            Enable Sentiment Analysis
          </label>
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={settings.requireApproval}
              onChange={(e) => handleSettingChange('requireApproval', e.target.checked)}
            />
            Require Approval Before Sharing
          </label>
        </div>
      </div>

      <button 
        className="btn btn-primary" 
        onClick={saveAISettings}
        disabled={loading}
      >
        {loading ? <div className="spinner"></div> : '💾'}
        Save AI Settings
      </button>
    </div>
  );
};

export default AISettings;