import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { LanguageUtils } from '../utils/language';

const AISettings = ({ user, language }) => {
  const [settings, setSettings] = useState({
    keywords: ['stocks', 'sales', 'market', 'news', 'technology', 'business'],
    customText: '🚀 Check this out:',
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
        setSaveStatus(LanguageUtils.getText('❌ Firebase not initialized', language));
        return;
      }

      if (!user) {
        setSaveStatus(LanguageUtils.getText('⚠️ Please sign in to load settings', language));
        return;
      }

      const docRef = doc(db, 'settings', `ai_${user.uid}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings(data);
        setSaveStatus(LanguageUtils.getText('👤 Loaded AI settings for: ', language) + user.email);
      } else {
        setSaveStatus(LanguageUtils.getText('👤 Signed in as: ', language) + user.email + LanguageUtils.getText(' - Configure and save AI settings.', language));
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
      setSaveStatus(LanguageUtils.getText('❌ Error loading AI settings: ', language) + error.message);
    }
  };

  const saveAISettings = async () => {
    if (!db) {
      setSaveStatus(LanguageUtils.getText('❌ Firebase not connected', language));
      return;
    }

    if (!user) {
      setSaveStatus(LanguageUtils.getText('❌ Please sign in to save settings', language));
      return;
    }

    setLoading(true);
    setSaveStatus(LanguageUtils.getText('Saving AI settings...', language));
    
    try {
      await setDoc(doc(db, 'settings', `ai_${user.uid}`), {
        ...settings,
        userId: user.uid,
        userEmail: user.email,
        lastUpdated: new Date(),
        createdAt: settings.createdAt || new Date()
      });
      setSaveStatus(LanguageUtils.getText('✅ AI settings saved for: ', language) + user.email);
      
      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving AI settings:', error);
      setSaveStatus(LanguageUtils.getText('❌ Error saving AI settings: ', language) + error.message);
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

  const addTurkishKeywords = () => {
    const turkishKeywords = ['hisse', 'borsa', 'satış', 'piyasa', 'haber', 'teknoloji', 'iş'];
    const newKeywords = [...new Set([...settings.keywords, ...turkishKeywords])];
    setSettings(prev => ({
      ...prev,
      keywords: newKeywords
    }));
    setSaveStatus(LanguageUtils.getText('✅ Added Turkish keywords', language));
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const addEnglishKeywords = () => {
    const englishKeywords = ['stocks', 'sales', 'market', 'news', 'technology', 'business', 'finance'];
    const newKeywords = [...new Set([...settings.keywords, ...englishKeywords])];
    setSettings(prev => ({
      ...prev,
      keywords: newKeywords
    }));
    setSaveStatus(LanguageUtils.getText('✅ Added English keywords', language));
    setTimeout(() => setSaveStatus(''), 3000);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">{LanguageUtils.getText('Artificial Intelligence Settings', language)}</h2>
        <span className="status-badge status-active">{LanguageUtils.getText('AI Active', language)}</span>
      </div>
      
      <p className="card-subtitle">
        {LanguageUtils.getText('Configure AI analysis for content filtering and enhancement. Uses free keyword-based analysis.', language)}
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
          🔐 {LanguageUtils.getText('Please sign in to access and save AI settings.', language)}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">{LanguageUtils.getText('Keywords for Analysis', language)}</label>
        
        {/* Quick Add Buttons */}
        <div className="button-group" style={{ marginBottom: '1rem' }}>
          <button 
            className="btn btn-secondary btn-small"
            onClick={addEnglishKeywords}
            disabled={!user}
          >
            🇺🇸 {LanguageUtils.getText('Add English Keywords', language)}
          </button>
          <button 
            className="btn btn-secondary btn-small"
            onClick={addTurkishKeywords}
            disabled={!user}
          >
            🇹🇷 {LanguageUtils.getText('Add Turkish Keywords', language)}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder={LanguageUtils.getText('Enter new keyword', language)}
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
            ➕ {LanguageUtils.getText('Add', language)}
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
          {LanguageUtils.getText('Content containing these keywords will be automatically filtered and shared', language)}
        </small>
      </div>

      <div className="form-group">
        <label className="form-label">{LanguageUtils.getText('Custom Text', language)}</label>
        <input
          type="text"
          className="form-input"
          placeholder={LanguageUtils.getText('Text to add before shared content', language)}
          value={settings.customText}
          onChange={(e) => handleSettingChange('customText', e.target.value)}
          disabled={!user}
        />
        <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
          {LanguageUtils.getText('This text will be prepended to all shared content', language)}
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
            <span>{LanguageUtils.getText('Enable Sentiment Analysis', language)}</span>
          </label>
          <small style={{ color: 'var(--text-secondary)', display: 'block', marginLeft: '60px' }}>
            {LanguageUtils.getText('Analyze emotional tone of content before sharing', language)}
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
            <span>{LanguageUtils.getText('Require Approval Before Sharing', language)}</span>
          </label>
          <small style={{ color: 'var(--text-secondary)', display: 'block', marginLeft: '60px' }}>
            {LanguageUtils.getText('Manual approval required before content is posted', language)}
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
          {LanguageUtils.getText('Save AI Settings', language)}
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={loadAISettings}
          disabled={!user}
        >
          🔄 {LanguageUtils.getText('Load Settings', language)}
        </button>
      </div>

      {user && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#4e4e4eff', borderRadius: '8px' }}>
          <h4>{LanguageUtils.getText('AI Settings Status:', language)}</h4>
          <p><strong>{LanguageUtils.getText('User:', language)}</strong> {user.email}</p>
          <p><strong>{LanguageUtils.getText('Keywords:', language)}</strong> {settings.keywords.length} {LanguageUtils.getText('configured', language)}</p>
          <p><strong>{LanguageUtils.getText('Sentiment Analysis:', language)}</strong> {settings.enableSentiment ? LanguageUtils.getText('Enabled', language) : LanguageUtils.getText('Disabled', language)}</p>
          <p><strong>{LanguageUtils.getText('Auto-approval:', language)}</strong> {settings.requireApproval ? LanguageUtils.getText('Disabled', language) : LanguageUtils.getText('Enabled', language)}</p>
          <p><strong>{LanguageUtils.getText('Analysis Method:', language)}</strong> {LanguageUtils.getText('Free Keyword Matching', language)}</p>
        </div>
      )}
    </div>
  );
};

export default AISettings;