import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { TwitterService } from '../services/twitterService';

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
  const [verificationStatus, setVerificationStatus] = useState({});
  const [testingConnection, setTestingConnection] = useState(false);

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
      
      const docRef = doc(db, 'settings', `accounts_${user.uid}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('📥 Loaded account settings:', data);
        setAccounts(data);
        setSaveStatus(`👤 Loaded settings for: ${user.email}`);
      } else {
        console.log('No existing settings found - will create on first save');
        setSaveStatus(`👤 Signed in as: ${user.email} - Configure and save to create settings.`);
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
      await setDoc(doc(db, 'settings', `accounts_${user.uid}`), {
        ...accounts,
        userId: user.uid,
        userEmail: user.email,
        lastUpdated: new Date(),
        createdAt: accounts.createdAt || new Date()
      });
      
      console.log('✅ Settings saved and document created:', accounts);
      setSaveStatus(`✅ Settings saved for: ${user.email}`);
      
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

  // Enhanced Twitter API verification
  const verifyTwitterCredentials = async (accountType = 'both') => {
    if (!accounts.consumerKey || !accounts.consumerSecret) {
      setVerificationStatus({
        type: 'error',
        message: '❌ Please enter Consumer Key and Consumer Secret first'
      });
      return;
    }

    setTestingConnection(true);
    setVerificationStatus({});

    try {
      // Initialize Twitter client
      TwitterService.initializeClient({
        consumerKey: accounts.consumerKey,
        consumerSecret: accounts.consumerSecret,
        accessToken: accounts.accessToken,
        accessTokenSecret: accounts.accessTokenSecret
      });

      const results = {};

      // Test API connection
      setVerificationStatus({ type: 'info', message: '🔍 Testing Twitter API connection...' });
      
      const connectionTest = await TwitterService.testConnection();
      results.api = { success: true, data: connectionTest };

      // Test source account if specified
      if ((accountType === 'both' || accountType === 'source') && accounts.source) {
        setVerificationStatus({ type: 'info', message: `🔍 Testing source account: ${accounts.source}...` });
        try {
          const sourceTweets = await TwitterService.getUserTweets(accounts.source.replace('@', ''), 5);
          results.source = { 
            success: true, 
            data: { 
              tweetsFound: sourceTweets.length,
              latestTweet: sourceTweets[0]?.text?.substring(0, 100) + '...' || 'No tweets found'
            }
          };
        } catch (error) {
          results.source = { success: false, error: error.message };
        }
      }

      // Test target account if specified
      if ((accountType === 'both' || accountType === 'target') && accounts.target) {
        setVerificationStatus({ type: 'info', message: `🔍 Testing target account: ${accounts.target}...` });
        try {
          const targetTweets = await TwitterService.getUserTweets(accounts.target.replace('@', ''), 5);
          results.target = { 
            success: true, 
            data: { 
              tweetsFound: targetTweets.length,
              latestTweet: targetTweets[0]?.text?.substring(0, 100) + '...' || 'No tweets found'
            }
          };
        } catch (error) {
          results.target = { success: false, error: error.message };
        }
      }

      // Update verification status
      setVerificationStatus({
        type: 'success',
        message: '✅ Twitter credentials verified successfully!',
        details: results
      });

      console.log('🔍 Verification results:', results);

    } catch (error) {
      console.error('❌ Twitter verification failed:', error);
      setVerificationStatus({
        type: 'error',
        message: `❌ Twitter verification failed: ${error.message}`,
        details: { error: error.message }
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const verifySourceAccount = () => verifyTwitterCredentials('source');
  const verifyTargetAccount = () => verifyTwitterCredentials('target');
  const verifyBothAccounts = () => verifyTwitterCredentials('both');

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
      
      const testDoc = doc(db, 'settings', `test_${user.uid}`);
      await setDoc(testDoc, { test: true, timestamp: new Date() });
      await getDoc(testDoc);
      setSaveStatus(`✅ Firebase connection successful for: ${user.email}`);
    } catch (error) {
      setSaveStatus('❌ Firebase connection failed: ' + error.message);
    }
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
      
      await setDoc(doc(db, 'statistics', `current_${user.uid}`), {
        totalScanned: 0,
        aiApproved: 0,
        posted: 0,
        rejected: 0,
        lastScan: null,
        lastUpdate: new Date(),
        userId: user.uid
      });

      await setDoc(doc(db, 'settings', `ai_${user.uid}`), {
        keywords: ['stocks', 'jumpy sales', 'rebots'],
        customText: '🚀 Check this out:',
        enableSentiment: false,
        requireApproval: true,
        userId: user.uid,
        createdAt: new Date()
      });

      await setDoc(doc(db, 'settings', `news_${user.uid}`), {
        sources: ['https://www.bbcedge.org/us/en/', 'https://www.reuters.com/business/'],
        scanFrequency: 300,
        userId: user.uid,
        createdAt: new Date()
      });
      
      setSaveStatus(`✅ Firestore initialized for: ${user.email}`);
      
      setTimeout(() => {
        loadAccountSettings();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error initializing Firestore:', error);
      setSaveStatus('❌ Initialization failed: ' + error.message);
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

      {/* Status Messages */}
      {saveStatus && (
        <div className={`status-message ${
          saveStatus.includes('✅') ? 'success' : 
          saveStatus.includes('❌') ? 'error' : 
          saveStatus.includes('⚠️') ? 'info' : 'info'
        }`}>
          {saveStatus}
        </div>
      )}

      {verificationStatus.message && (
        <div className={`status-message ${verificationStatus.type === 'success' ? 'success' : verificationStatus.type === 'error' ? 'error' : 'info'}`}>
          {verificationStatus.message}
          
          {verificationStatus.details && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              <h4>Verification Details:</h4>
              {verificationStatus.details.api && (
                <div>
                  <strong>API Connection:</strong> {verificationStatus.details.api.success ? '✅ Success' : '❌ Failed'}
                  {verificationStatus.details.api.data && (
                    <div style={{ marginLeft: '1rem', fontSize: '0.9rem' }}>
                      Username: {verificationStatus.details.api.data.username}<br />
                      User ID: {verificationStatus.details.api.data.id}
                    </div>
                  )}
                </div>
              )}
              {verificationStatus.details.source && (
                <div>
                  <strong>Source Account ({accounts.source}):</strong> {verificationStatus.details.source.success ? '✅ Success' : '❌ Failed'}
                  {verificationStatus.details.source.data && (
                    <div style={{ marginLeft: '1rem', fontSize: '0.9rem' }}>
                      Tweets Found: {verificationStatus.details.source.data.tweetsFound}<br />
                      Latest: {verificationStatus.details.source.data.latestTweet}
                    </div>
                  )}
                  {verificationStatus.details.source.error && (
                    <div style={{ marginLeft: '1rem', fontSize: '0.9rem', color: '#ff6b6b' }}>
                      Error: {verificationStatus.details.source.error}
                    </div>
                  )}
                </div>
              )}
              {verificationStatus.details.target && (
                <div>
                  <strong>Target Account ({accounts.target}):</strong> {verificationStatus.details.target.success ? '✅ Success' : '❌ Failed'}
                  {verificationStatus.details.target.data && (
                    <div style={{ marginLeft: '1rem', fontSize: '0.9rem' }}>
                      Tweets Found: {verificationStatus.details.target.data.tweetsFound}<br />
                      Latest: {verificationStatus.details.target.data.latestTweet}
                    </div>
                  )}
                  {verificationStatus.details.target.error && (
                    <div style={{ marginLeft: '1rem', fontSize: '0.9rem', color: '#ff6b6b' }}>
                      Error: {verificationStatus.details.target.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
          <label className="form-label">Consumer Key *</label>
          <input
            type="password"
            className="form-input"
            placeholder="Enter consumer key"
            value={accounts.consumerKey}
            onChange={(e) => handleInputChange('consumerKey', e.target.value)}
            disabled={!user}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Consumer Secret *</label>
          <input
            type="password"
            className="form-input"
            placeholder="Enter consumer secret"
            value={accounts.consumerSecret}
            onChange={(e) => handleInputChange('consumerSecret', e.target.value)}
            disabled={!user}
            required
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

      {/* Enhanced Action Buttons */}
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
          className="btn btn-success" 
          onClick={verifyBothAccounts}
          disabled={testingConnection || !user || !accounts.consumerKey || !accounts.consumerSecret}
        >
          {testingConnection ? <div className="spinner"></div> : '🔍'}
          Verify Both Accounts
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={verifySourceAccount}
          disabled={testingConnection || !user || !accounts.source || !accounts.consumerKey}
        >
          🎯 Verify Source Only
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={verifyTargetAccount}
          disabled={testingConnection || !user || !accounts.target || !accounts.consumerKey}
        >
          🎯 Verify Target Only
        </button>
      </div>

      <div className="form-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
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
          🔍 Test Firebase
        </button>
      </div>

      {user && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#4e4e4eff', borderRadius: '8px' }}>
          <h4>Connection Status:</h4>
          <p><strong>User:</strong> {user.email}</p>
          <p><strong>Firebase:</strong> {db ? '✅ Connected' : '❌ Disconnected'}</p>
          <p><strong>Twitter API:</strong> {accounts.consumerKey ? '🔑 Configured' : '❌ Missing Credentials'}</p>
          <p><strong>Source Account:</strong> {accounts.source || 'Not set'}</p>
          <p><strong>Target Account:</strong> {accounts.target || 'Not set'}</p>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;