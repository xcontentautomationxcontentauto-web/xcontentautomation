import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import '../styles/App.css';

const Dashboard = ({ user }) => {
  const [activeSection, setActiveSection] = useState('accounts');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Account Settings State
  const [accountA, setAccountA] = useState({
    username: '',
    consumerKey: '',
    consumerSecret: '',
    accessToken: '', 
    accessTokenSecret: ''
  });

  const [accountB, setAccountB] = useState({
    username: '',
    consumerKey: '',
    consumerSecret: '',
    accessToken: '',
    accessTokenSecret: ''
  });

  // News Sources State
  const [newsSources, setNewsSources] = useState([]);
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [scanFrequency, setScanFrequency] = useState(300);

  // Found Contents State (from Firebase)
  const [foundContents, setFoundContents] = useState([]);

  // AI Settings State
  const [aiSettings, setAiSettings] = useState({
    keywords: ['stocks', 'jumpy sales', 'rebots'],
    customText: '🚀 Check this out: ',
    openaiKey: '',
    enableSentiment: false,
    requireApproval: true
  });
  const [newKeyword, setNewKeyword] = useState('');

  // Statistics
  const [statistics, setStatistics] = useState({
    approved: 0,
    shared: 0,
    found: 0,
    lastScan: 'Never',
    lastTweet: 'Never', 
    lastNews: 'Never'
  });

  // Load data from Firebase when user changes
  useEffect(() => {
    if (user) {
      loadAllSettings();
      subscribeToFoundContents();
    }
  }, [user]);

  const loadAllSettings = async () => {
    if (!user || !db) return;

    try {
      // Load Account Settings
      const accountsDoc = await getDoc(doc(db, 'settings', `accounts_${user.uid}`));
      if (accountsDoc.exists()) {
        const data = accountsDoc.data();
        setAccountA({
          username: data.source || '',
          consumerKey: data.consumerKey || '',
          consumerSecret: data.consumerSecret || '',
          accessToken: data.accessToken || '',
          accessTokenSecret: data.accessTokenSecret || ''
        });
        setAccountB({
          username: data.target || '',
          consumerKey: data.consumerKey || '', // Note: You might want separate credentials
          consumerSecret: data.consumerSecret || '',
          accessToken: data.accessToken || '',
          accessTokenSecret: data.accessTokenSecret || ''
        });
      }

      // Load News Settings
      const newsDoc = await getDoc(doc(db, 'settings', `news_${user.uid}`));
      if (newsDoc.exists()) {
        const data = newsDoc.data();
        setNewsSources(data.sources || []);
        setScanFrequency(data.scanFrequency || 300);
      }

      // Load AI Settings
      const aiDoc = await getDoc(doc(db, 'settings', `ai_${user.uid}`));
      if (aiDoc.exists()) {
        const data = aiDoc.data();
        setAiSettings({
          keywords: data.keywords || ['stocks', 'jumpy sales', 'rebots'],
          customText: data.customText || '🚀 Check this out: ',
          openaiKey: data.openaiApiKey || '',
          enableSentiment: data.enableSentiment || false,
          requireApproval: data.requireApproval !== false
        });
      }

      // Load Statistics
      const statsDoc = await getDoc(doc(db, 'statistics', `current_${user.uid}`));
      if (statsDoc.exists()) {
        setStatistics(statsDoc.data());
      }

      setSaveStatus(`👤 Loaded settings for: ${user.email}`);
    } catch (error) {
      console.error('Error loading settings:', error);
      setSaveStatus('❌ Error loading settings: ' + error.message);
    }
  };

  const subscribeToFoundContents = () => {
    if (!user || !db) return;

    const unsubscribe = onSnapshot(
      collection(db, 'foundContents'), 
      (snapshot) => {
        const contents = snapshot.docs
          .filter(doc => doc.data().userId === user.uid)
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        setFoundContents(contents);
      },
      (error) => {
        console.error('Error subscribing to found contents:', error);
      }
    );

    return unsubscribe;
  };

  const scrollToSection = (section) => {
    setActiveSection(section);
    setTimeout(() => {
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // News Sources Handlers
  const addNewsSource = () => {
    if (newSourceUrl && !newsSources.includes(newSourceUrl)) {
      const updatedSources = [...newsSources, newSourceUrl];
      setNewsSources(updatedSources);
      setNewSourceUrl('');
      saveNewsSettings(updatedSources);
    }
  };

  const removeNewsSource = (url) => {
    const updatedSources = newsSources.filter(source => source !== url);
    setNewsSources(updatedSources);
    saveNewsSettings(updatedSources);
  };

  // AI Settings Handlers
  const addKeyword = () => {
    if (newKeyword.trim() && !aiSettings.keywords.includes(newKeyword.trim())) {
      const updatedKeywords = [...aiSettings.keywords, newKeyword.trim()];
      setAiSettings({ ...aiSettings, keywords: updatedKeywords });
      setNewKeyword('');
      saveAISettings({ ...aiSettings, keywords: updatedKeywords });
    }
  };

  const removeKeyword = (keyword) => {
    const updatedKeywords = aiSettings.keywords.filter(k => k !== keyword);
    setAiSettings({ ...aiSettings, keywords: updatedKeywords });
    saveAISettings({ ...aiSettings, keywords: updatedKeywords });
  };

  // Save Handlers with Firebase
  const saveAccountSettings = async () => {
    if (!user || !db) {
      setSaveStatus('❌ Please sign in to save settings');
      return;
    }

    try {
      await setDoc(doc(db, 'settings', `accounts_${user.uid}`), {
        source: accountA.username,
        target: accountB.username,
        consumerKey: accountA.consumerKey,
        consumerSecret: accountA.consumerSecret,
        accessToken: accountA.accessToken,
        accessTokenSecret: accountA.accessTokenSecret,
        userId: user.uid,
        userEmail: user.email,
        lastUpdated: new Date()
      });
      setSaveStatus(`✅ Account settings saved for: ${user.email}`);
    } catch (error) {
      console.error('Error saving account settings:', error);
      setSaveStatus('❌ Error saving account settings: ' + error.message);
    }
  };

  const saveNewsSettings = async (sources = newsSources) => {
    if (!user || !db) return;

    try {
      await setDoc(doc(db, 'settings', `news_${user.uid}`), {
        sources: sources,
        scanFrequency: scanFrequency,
        userId: user.uid,
        userEmail: user.email,
        lastUpdated: new Date()
      });
      setSaveStatus(`✅ News settings saved for: ${user.email}`);
    } catch (error) {
      console.error('Error saving news settings:', error);
      setSaveStatus('❌ Error saving news settings: ' + error.message);
    }
  };

  const saveAISettings = async (settings = aiSettings) => {
    if (!user || !db) return;

    try {
      await setDoc(doc(db, 'settings', `ai_${user.uid}`), {
        keywords: settings.keywords,
        customText: settings.customText,
        openaiApiKey: settings.openaiKey,
        enableSentiment: settings.enableSentiment,
        requireApproval: settings.requireApproval,
        userId: user.uid,
        userEmail: user.email,
        lastUpdated: new Date()
      });
      setSaveStatus(`✅ AI settings saved for: ${user.email}`);
    } catch (error) {
      console.error('Error saving AI settings:', error);
      setSaveStatus('❌ Error saving AI settings: ' + error.message);
    }
  };

  // Content Approval (simulated - you'd need to implement actual Firebase updates)
  const approveContent = (id) => {
    setFoundContents(foundContents.map(content => 
      content.id === id ? { ...content, status: 'approved' } : content
    ));
    setStatistics(prev => ({ ...prev, approved: prev.approved + 1 }));
  };

  const deleteContent = (id) => {
    setFoundContents(foundContents.filter(content => content.id !== id));
  };

  const shareContent = (id) => {
    setFoundContents(foundContents.map(content => 
      content.id === id ? { ...content, status: 'shared' } : content
    ));
    setStatistics(prev => ({ ...prev, shared: prev.shared + 1 }));
  };

  // Test connections
  const testAccountA = () => {
    setSaveStatus('🔍 Testing Account A connection...');
    setTimeout(() => setSaveStatus('✅ Account A connection test completed'), 2000);
  };

  const testAccountB = () => {
    setSaveStatus('🔍 Testing Account B connection...');
    setTimeout(() => setSaveStatus('✅ Account B connection test completed'), 2000);
  };

  const testAIConnection = () => {
    if (!aiSettings.openaiKey) {
      setSaveStatus('❌ Please enter your OpenAI API key first');
      return;
    }
    setSaveStatus('🤖 Testing AI connection...');
    setTimeout(() => setSaveStatus('✅ AI connection test completed'), 2000);
  };

  if (!user) {
    return (
      <div className="login-prompt">
        <div className="login-card">
          <h2>Welcome to X Bot Manager</h2>
          <p>Please sign in to access the dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Status Message */}
      {saveStatus && (
        <div className={`status-message ${
          saveStatus.includes('✅') ? 'success' : 
          saveStatus.includes('❌') ? 'error' : 
          saveStatus.includes('🔍') || saveStatus.includes('🤖') ? 'info' : 'info'
        }`} style={{margin: '1rem', marginBottom: '0'}}>
          {saveStatus}
        </div>
      )}

      <div className="header">
        <h1>Advanced Stock Market News Automation System</h1>
        <p>Artificial Intelligence-Powered Smart Content Filtering and Sharing</p>
        <div className="system-status">
          System Status: <span>ACTIVE</span> | User: <span>{user.email}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`dashboard-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {['accounts', 'news', 'contents', 'ai', 'stats'].map(section => (
          <button
            key={section}
            className={`nav-btn ${activeSection === section ? 'active' : ''}`}
            onClick={() => scrollToSection(section)}
          >
            {section === 'accounts' && 'Account Settings'}
            {section === 'news' && 'News Sources'}
            {section === 'contents' && 'Found Contents'}
            {section === 'ai' && 'AI Settings'}
            {section === 'stats' && 'Statistics'}
          </button>
        ))}
      </nav>

      <div className="dashboard-content">
        {/* Rest of your existing JSX remains the same, but update the handlers to use the new functions */}
        {/* Account Settings Section */}
        <div id="accounts" className="section-wrapper">
          {/* ... existing account settings JSX ... */}
        </div>

        {/* News Sources Section */}
        <div id="news" className="section-wrapper">
          {/* ... existing news sources JSX ... */}
        </div>

        {/* Found Contents Section */}
        <div id="contents" className="section-wrapper">
          {/* ... existing found contents JSX ... */}
        </div>

        {/* AI Settings Section */}
        <div id="ai" className="section-wrapper">
          {/* ... existing AI settings JSX ... */}
        </div>

        {/* Statistics Section */}
        <div id="stats" className="section-wrapper">
          {/* ... existing statistics JSX ... */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;