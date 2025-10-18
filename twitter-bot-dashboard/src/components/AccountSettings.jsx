import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AccountSettings = ({ user }) => {
  const [accounts, setAccounts] = useState({
    source: '',
    target: '',
    consumerKey: '',
    consumerSecret: '',
    accessToken: '',
    accessTokenSecret: ''
  });

  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (user) {
      loadAccountSettings();
    }
  }, [user]);

  const loadAccountSettings = async () => {
    try {
      if (!db) {
        setSaveStatus('❌ Firebase not initialized');
        return;
      }

      if (!user) {
        setSaveStatus('⚠️ Please sign in to load settings');
        return;
      }
      
      // Use user-specific document path that matches your Firestore rules
      const docRef = doc(db, 'settings', `accounts_${user.uid}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('📥 Loaded account settings:', data);
        setAccounts(data);
        setSaveStatus(`👤 Loaded settings for: ${user.email}`); // Changed this line
      } else {
        console.log('No existing settings found - will create on first save');
        setSaveStatus(`👤 Signed in as: ${user.email} - Configure and save to create settings.`);
        // Initialize with empty values
        setAccounts({
          source: '',
          target: '',
          consumerKey: '',
          consumerSecret: '',
          accessToken: '',
          accessTokenSecret: ''
        });
      }
    } catch (error) {
      console.error('❌ Error loading account settings:', error);
      setSaveStatus('❌ Error: ' + error.message);
    }
  };

  const saveAccountSettings = async () => {
    if (!db) {
      setSaveStatus('❌ Firebase not connected');
      return;
    }

    if (!user) {
      setSaveStatus('❌ Please sign in to save settings');
      return;
    }

    // Validate required fields
    if (!accounts.source || !accounts.target) {
      setSaveStatus('❌ Please fill in Source and Target account usernames');
      return;
    }

    setLoading(true);
    setSaveStatus('Saving...');
    
    try {
      // Save to user-specific document that matches your Firestore rules
      await setDoc(doc(db, 'settings', `accounts_${user.uid}`), {
        ...accounts,
        userId: user.uid,
        userEmail: user.email,
        lastUpdated: new Date(),
        createdAt: accounts.createdAt || new Date()
      });
      
      console.log('✅ Settings saved and document created:', accounts);
      setSaveStatus(`✅ Settings saved for: ${user.email}`); // Changed this line
      
      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('❌ Error saving account settings:', error);
      setSaveStatus('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setAccounts(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const initializeFirestore = async () => {
    try {
      if (!db) {
        setSaveStatus('❌ Firebase not initialized');
        return;
      }

      if (!user) {
        setSaveStatus('❌ Please sign in to initialize Firestore');
        return;
      }
      
      // Create initial documents with default values for this user
      const initialSettings = {
        source: '',
        target: '', 
        consumerKey: '',
        consumerSecret: '',
        accessToken: '',
        accessTokenSecret: '',
        userId: user.uid,
        userEmail: user.email,
        createdAt: new Date()
      };
      
      await setDoc(doc(db, 'settings', `accounts_${user.uid}`), initialSettings);
      
      // Initialize user-specific statistics
      await setDoc(doc(db, 'statistics', `current_${user.uid}`), {
        totalScanned: 0,
        aiApproved: 0,
        posted: 0,
        rejected: 0,
        lastScan: null,
        lastUpdate: new Date(),
        userId: user.uid
      });

      // Initialize user-specific AI settings
      await setDoc(doc(db, 'settings', `ai_${user.uid}`), {
        keywords: ['stocks', 'jumpy sales', 'rebots'],
        customText: '🚀 Check this out:',
        enableSentiment: false,
        requireApproval: true,
        userId: user.uid,
        createdAt: new Date()
      });

      // Initialize user-specific news settings
      await setDoc(doc(db, 'settings', `news_${user.uid}`), {
        sources: ['https://www.bbcedge.org/us/en/', 'https://www.reuters.com/business/'],
        scanFrequency: 300,
        userId: user.uid,
        createdAt: new Date()
      });
      
      setSaveStatus(`✅ Firestore initialized for: ${user.email}`); // Changed this line
      
      // Reload the settings
      setTimeout(() => {
        loadAccountSettings();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error initializing Firestore:', error);
      setSaveStatus('❌ Initialization failed: ' + error.message);
    }
  };

  const testFirebaseConnection = async () => {
    try {
      if (!db) {
        setSaveStatus('❌ Firebase not initialized');
        return;
      }

      if (!user) {
        setSaveStatus('❌ Please sign in to test connection');
        return;
      }
      
      // Test by trying to read a document
      const testDoc = doc(db, 'settings', `test_${user.uid}`);
      await setDoc(testDoc, { test: true, timestamp: new Date() });
      await getDoc(testDoc);
      setSaveStatus(`✅ Firebase connection successful for: ${user.email}`); // Changed this line
    } catch (error) {
      setSaveStatus('❌ Firebase connection failed: ' + error.message);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">X Account Settings</h2>
        <span className="status-badge status-active">Active</span>
      </div>
      
      <p className="card-subtitle">
        Configure your source and target X accounts. Posts from Account A will be shared via Account B after AI analysis.
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
          🔐 Please sign in to access and save account settings.
        </div>
      )}

      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Source Account (Account A) *</label>
          <input
            type="text"
            className="form-input"
            placeholder="@username"
            value={accounts.source}
            onChange={(e) => handleInputChange('source', e.target.value)}
            required
            disabled={!user}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Target Account (Account B) *</label>
          <input
            type="text"
            className="form-input"
            placeholder="@username"
            value={accounts.target}
            onChange={(e) => handleInputChange('target', e.target.value)}
            required
            disabled={!user}
          />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Consumer Key</label>
          <input
            type="password"
            className="form-input"
            placeholder="Enter consumer key"
            value={accounts.consumerKey}
            onChange={(e) => handleInputChange('consumerKey', e.target.value)}
            disabled={!user}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Consumer Secret</label>
          <input
            type="password"
            className="form-input"
            placeholder="Enter consumer secret"
            value={accounts.consumerSecret}
            onChange={(e) => handleInputChange('consumerSecret', e.target.value)}
            disabled={!user}
          />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Access Token</label>
          <input
            type="password"
            className="form-input"
            placeholder="Enter access token"
            value={accounts.accessToken}
            onChange={(e) => handleInputChange('accessToken', e.target.value)}
            disabled={!user}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Access Token Secret</label>
          <input
            type="password"
            className="form-input"
            placeholder="Enter access token secret"
            value={accounts.accessTokenSecret}
            onChange={(e) => handleInputChange('accessTokenSecret', e.target.value)}
            disabled={!user}
          />
        </div>
      </div>

      <div className="form-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          className="btn btn-primary" 
          onClick={saveAccountSettings}
          disabled={loading || !user}
        >
          {loading ? <div className="spinner"></div> : '💾'}
          Save Account Settings
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={initializeFirestore}
          disabled={!user}
        >
          🚀 Initialize Firestore
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={loadAccountSettings}
          disabled={!user}
        >
          🔄 Load Settings
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={testFirebaseConnection}
          disabled={!user}
        >
          🔍 Test Connection
        </button>
      </div>

      {user && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#4e4e4eff', borderRadius: '8px' }}>
          <h4>Firestore Status:</h4>
          <p><strong>User ID:</strong> {user.uid}</p>
          <p><strong>User Email:</strong> {user.email}</p>
          <p><strong>Collection:</strong> settings</p>
          <p><strong>Document:</strong> accounts_{user.uid}</p>
          <p><strong>Auto-creation:</strong> Will be created on first save</p>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;