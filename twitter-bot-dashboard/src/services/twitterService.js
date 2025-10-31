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
  const [showCredentials, setShowCredentials] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

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

  const validateCredentials = () => {
    const errors = {};

    // Required field validation
    if (!accounts.source?.trim()) {
      errors.source = 'Source account username is required';
    } else if (!accounts.source.match(/^@?[A-Za-z0-9_]{1,15}$/)) {
      errors.source = 'Invalid Twitter username format';
    }

    if (!accounts.target?.trim()) {
      errors.target = 'Target account username is required';
    } else if (!accounts.target.match(/^@?[A-Za-z0-9_]{1,15}$/)) {
      errors.target = 'Invalid Twitter username format';
    }

    if (!accounts.consumerKey?.trim()) {
      errors.consumerKey = 'Consumer Key is required';
    } else if (accounts.consumerKey.length < 10) {
      errors.consumerKey = 'Consumer Key appears too short';
    }

    if (!accounts.consumerSecret?.trim()) {
      errors.consumerSecret = 'Consumer Secret is required';
    } else if (accounts.consumerSecret.length < 10) {
      errors.consumerSecret = 'Consumer Secret appears too short';
    }

    if (!accounts.accessToken?.trim()) {
      errors.accessToken = 'Access Token is required';
    } else if (accounts.accessToken.length < 10) {
      errors.accessToken = 'Access Token appears too short';
    }

    if (!accounts.accessTokenSecret?.trim()) {
      errors.accessTokenSecret = 'Access Token Secret is required';
    } else if (accounts.accessTokenSecret.length < 10) {
      errors.accessTokenSecret = 'Access Token Secret appears too short';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
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

    // Validate all fields
    if (!validateCredentials()) {
      setSaveStatus('❌ Please fix the validation errors before saving');
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

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Enhanced Twitter API verification with better error handling
  const verifyTwitterCredentials = async (accountType = 'both') => {
    console.log(`🔍 Starting verification for: ${accountType}`);
    
    // Validate credentials before attempting verification
    if (!validateCredentials()) {
      setVerificationStatus({
        type: 'error',
        message: '❌ Please fix all validation errors before verification'
      });
      return;
    }

    setTestingConnection(true);
    setVerificationStatus({});

    try {
      // Initialize Twitter client with all required credentials
      TwitterService.initializeClient({
        consumerKey: accounts.consumerKey.trim(),
        consumerSecret: accounts.consumerSecret.trim(),
        accessToken: accounts.accessToken.trim(),
        accessTokenSecret: accounts.accessTokenSecret.trim()
      });

      const results = {};

      // Test API connection first (required for all verifications)
      setVerificationStatus({ type: 'info', message: '🔍 Testing Twitter API connection...' });
      
      try {
        const connectionTest = await TwitterService.testConnection();
        results.api = { 
          success: true, 
          data: connectionTest,
          message: `✅ Connected as @${connectionTest.username} (${connectionTest.name})`
        };
        console.log('✅ API connection successful:', connectionTest);
      } catch (apiError) {
        const errorMsg = apiError.message || 'Unknown API error';
        results.api = { 
          success: false, 
          error: errorMsg,
          message: `❌ API Connection Failed: ${errorMsg}`
        };
        console.error('❌ API connection failed:', apiError);
        
        // If API connection fails, don't proceed with account verification
        setVerificationStatus({
          type: 'error',
          message: `❌ Twitter API connection failed: ${errorMsg}`,
          details: results
        });
        setTestingConnection(false);
        return;
      }

      // Test specific accounts based on accountType
      if (accountType === 'both' || accountType === 'source') {
        const sourceUsername = accounts.source.replace('@', '').trim();
        setVerificationStatus({ type: 'info', message: `🔍 Testing source account: @${sourceUsername}...` });
        try {
          const sourceTweets = await TwitterService.getUserTweets(sourceUsername, 3);
          results.source = { 
            success: true, 
            data: { 
              username: sourceUsername,
              tweetsFound: sourceTweets.length,
              latestTweet: sourceTweets[0]?.text?.substring(0, 100) + '...' || 'No tweets found',
              accountExists: true
            },
            message: `✅ Source account @${sourceUsername} verified (${sourceTweets.length} tweets found)`
          };
          console.log(`✅ Source account verified: ${sourceUsername}`, results.source.data);
        } catch (sourceError) {
          const errorMsg = sourceError.message || 'Unknown error';
          results.source = { 
            success: false, 
            error: errorMsg,
            accountExists: false,
            message: `❌ Source account @${sourceUsername} verification failed: ${errorMsg}`
          };
          console.error(`❌ Source account verification failed:`, sourceError);
        }
      }

      if (accountType === 'both' || accountType === 'target') {
        const targetUsername = accounts.target.replace('@', '').trim();
        setVerificationStatus({ type: 'info', message: `🔍 Testing target account: @${targetUsername}...` });
        try {
          const targetTweets = await TwitterService.getUserTweets(targetUsername, 3);
          results.target = { 
            success: true, 
            data: { 
              username: targetUsername,
              tweetsFound: targetTweets.length,
              latestTweet: targetTweets[0]?.text?.substring(0, 100) + '...' || 'No tweets found',
              accountExists: true
            },
            message: `✅ Target account @${targetUsername} verified (${targetTweets.length} tweets found)`
          };
          console.log(`✅ Target account verified: ${targetUsername}`, results.target.data);
        } catch (targetError) {
          const errorMsg = targetError.message || 'Unknown error';
          results.target = { 
            success: false, 
            error: targetError.message,
            accountExists: false,
            message: `❌ Target account @${targetUsername} verification failed: ${errorMsg}`
          };
          console.error(`❌ Target account verification failed:`, targetError);
        }
      }

      // Determine overall success
      const accountResults = Object.entries(results).filter(([key]) => key !== 'api');
      const successfulAccounts = accountResults.filter(([_, result]) => result.success);
      
      if (successfulAccounts.length === accountResults.length) {
        setVerificationStatus({
          type: 'success',
          message: `✅ All verifications completed successfully!`,
          details: results
        });
      } else if (successfulAccounts.length > 0) {
        const failedAccounts = accountResults
          .filter(([_, result]) => !result.success)
          .map(([key]) => key);
        
        setVerificationStatus({
          type: 'warning',
          message: `⚠️ Partial success: ${failedAccounts.join(', ')} failed`,
          details: results
        });
      } else {
        setVerificationStatus({
          type: 'error',
          message: `❌ All account verifications failed`,
          details: results
        });
      }

    } catch (error) {
      console.error('❌ Twitter verification failed:', error);
      setVerificationStatus({
        type: 'error',
        message: `❌ Verification process error: ${error.message}`,
        details: { error: error.message }
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Quick verification for individual accounts
  const quickVerifyAccount = async (accountType) => {
    const username = accountType === 'source' ? accounts.source : accounts.target;
    
    // Quick validation
    if (!username?.trim()) {
      setVerificationStatus({
        type: 'error',
        message: `❌ Please enter ${accountType} account username first`
      });
      return;
    }

    if (!accounts.consumerKey?.trim() || !accounts.consumerSecret?.trim() || 
        !accounts.accessToken?.trim() || !accounts.accessTokenSecret?.trim()) {
      setVerificationStatus({
        type: 'error',
        message: '❌ Please enter all Twitter API credentials first'
      });
      return;
    }

    setTestingConnection(true);
    const cleanUsername = username.replace('@', '').trim();
    setVerificationStatus({ type: 'info', message: `🔍 Quick verifying ${accountType} account: @${cleanUsername}...` });

    try {
      TwitterService.initializeClient({
        consumerKey: accounts.consumerKey.trim(),
        consumerSecret: accounts.consumerSecret.trim(),
        accessToken: accounts.accessToken.trim(),
        accessTokenSecret: accounts.accessTokenSecret.trim()
      });

      // Test API connection first
      await TwitterService.testConnection();

      const tweets = await TwitterService.getUserTweets(cleanUsername, 2);
      
      setVerificationStatus({
        type: 'success',
        message: `✅ ${accountType === 'source' ? 'Source' : 'Target'} account @${cleanUsername} verified! Found ${tweets.length} recent tweets.`,
        details: {
          [accountType]: {
            success: true,
            data: {
              username: cleanUsername,
              tweetsFound: tweets.length,
              latestTweet: tweets[0]?.text?.substring(0, 80) + '...' || 'No recent tweets'
            }
          }
        }
      });

    } catch (error) {
      const errorMsg = error.message || 'Unknown verification error';
      setVerificationStatus({
        type: 'error',
        message: `❌ ${accountType === 'source' ? 'Source' : 'Target'} account verification failed: ${errorMsg}`,
        details: {
          [accountType]: {
            success: false,
            error: errorMsg
          }
        }
      });
    } finally {
      setTestingConnection(false);
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
      
      const testDoc = doc(db, 'settings', `test_${user.uid}`);
      await setDoc(testDoc, { test: true, timestamp: new Date(), userId: user.uid });
      const docSnap = await getDoc(testDoc);
      
      if (docSnap.exists()) {
        setSaveStatus(`✅ Firebase connection successful for: ${user.email}`);
      } else {
        setSaveStatus('❌ Firebase test failed: Document not found');
      }
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
        source: accounts.source || '',
        target: accounts.target || '', 
        consumerKey: accounts.consumerKey || '',
        consumerSecret: accounts.consumerSecret || '',
        accessToken: accounts.accessToken || '',
        accessTokenSecret: accounts.accessTokenSecret || '',
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

  const clearVerificationStatus = () => {
    setVerificationStatus({});
  };

  const clearValidationErrors = () => {
    setValidationErrors({});
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
        <div className={`verification-status ${verificationStatus.type}`}>
          <div className="verification-header">
            <span>{verificationStatus.message}</span>
            <button 
              className="btn-clear"
              onClick={clearVerificationStatus}
              title="Clear status"
            >
              ×
            </button>
          </div>
          
          {verificationStatus.details && (
            <div className="verification-details">
              <h4>Verification Details:</h4>
              {verificationStatus.details.api && (
                <div className="verification-item">
                  <strong>API Connection:</strong> 
                  <span className={verificationStatus.details.api.success ? 'success' : 'error'}>
                    {verificationStatus.details.api.success ? '✅ Success' : '❌ Failed'}
                  </span>
                  {verificationStatus.details.api.data && (
                    <div className="verification-data">
                      Username: {verificationStatus.details.api.data.username}<br />
                      Name: {verificationStatus.details.api.data.name}<br />
                      User ID: {verificationStatus.details.api.data.id}
                    </div>
                  )}
                  {verificationStatus.details.api.error && (
                    <div className="verification-error">
                      Error: {verificationStatus.details.api.error}
                    </div>
                  )}
                </div>
              )}
              {verificationStatus.details.source && (
                <div className="verification-item">
                  <strong>Source Account ({accounts.source}):</strong> 
                  <span className={verificationStatus.details.source.success ? 'success' : 'error'}>
                    {verificationStatus.details.source.success ? '✅ Success' : '❌ Failed'}
                  </span>
                  {verificationStatus.details.source.data && (
                    <div className="verification-data">
                      Tweets Found: {verificationStatus.details.source.data.tweetsFound}<br />
                      Latest: {verificationStatus.details.source.data.latestTweet}
                    </div>
                  )}
                  {verificationStatus.details.source.error && (
                    <div className="verification-error">
                      Error: {verificationStatus.details.source.error}
                    </div>
                  )}
                </div>
              )}
              {verificationStatus.details.target && (
                <div className="verification-item">
                  <strong>Target Account ({accounts.target}):</strong> 
                  <span className={verificationStatus.details.target.success ? 'success' : 'error'}>
                    {verificationStatus.details.target.success ? '✅ Success' : '❌ Failed'}
                  </span>
                  {verificationStatus.details.target.data && (
                    <div className="verification-data">
                      Tweets Found: {verificationStatus.details.target.data.tweetsFound}<br />
                      Latest: {verificationStatus.details.target.data.latestTweet}
                    </div>
                  )}
                  {verificationStatus.details.target.error && (
                    <div className="verification-error">
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
            className={`form-input ${validationErrors.source ? 'error' : ''}`}
            placeholder="@username"
            value={accounts.source}
            onChange={(e) => handleInputChange('source', e.target.value)}
            required
            disabled={!user}
          />
          {validationErrors.source && (
            <div className="validation-error">{validationErrors.source}</div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Target Account (Account B) *</label>
          <input
            type="text"
            className={`form-input ${validationErrors.target ? 'error' : ''}`}
            placeholder="@username"
            value={accounts.target}
            onChange={(e) => handleInputChange('target', e.target.value)}
            required
            disabled={!user}
          />
          {validationErrors.target && (
            <div className="validation-error">{validationErrors.target}</div>
          )}
        </div>
      </div>

      {/* Credentials Toggle */}
      <div className="form-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showCredentials}
            onChange={(e) => setShowCredentials(e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>Show API Credentials</span>
        </label>
      </div>

      {showCredentials && (
        <>
          <div className="credentials-info">
            <h4>🔑 Twitter API Credentials</h4>
            <p>You need all four credentials from the <a href="https://developer.twitter.com/" target="_blank" rel="noopener noreferrer">Twitter Developer Portal</a>:</p>
            <ul>
              <li>API Key (Consumer Key)</li>
              <li>API Secret Key (Consumer Secret)</li>
              <li>Access Token</li>
              <li>Access Token Secret</li>
            </ul>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Consumer Key *</label>
              <input
                type="password"
                className={`form-input ${validationErrors.consumerKey ? 'error' : ''}`}
                placeholder="Enter consumer key"
                value={accounts.consumerKey}
                onChange={(e) => handleInputChange('consumerKey', e.target.value)}
                disabled={!user}
                required
              />
              {validationErrors.consumerKey && (
                <div className="validation-error">{validationErrors.consumerKey}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Consumer Secret *</label>
              <input
                type="password"
                className={`form-input ${validationErrors.consumerSecret ? 'error' : ''}`}
                placeholder="Enter consumer secret"
                value={accounts.consumerSecret}
                onChange={(e) => handleInputChange('consumerSecret', e.target.value)}
                disabled={!user}
                required
              />
              {validationErrors.consumerSecret && (
                <div className="validation-error">{validationErrors.consumerSecret}</div>
              )}
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Access Token *</label>
              <input
                type="password"
                className={`form-input ${validationErrors.accessToken ? 'error' : ''}`}
                placeholder="Enter access token"
                value={accounts.accessToken}
                onChange={(e) => handleInputChange('accessToken', e.target.value)}
                disabled={!user}
                required
              />
              {validationErrors.accessToken && (
                <div className="validation-error">{validationErrors.accessToken}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Access Token Secret *</label>
              <input
                type="password"
                className={`form-input ${validationErrors.accessTokenSecret ? 'error' : ''}`}
                placeholder="Enter access token secret"
                value={accounts.accessTokenSecret}
                onChange={(e) => handleInputChange('accessTokenSecret', e.target.value)}
                disabled={!user}
                required
              />
              {validationErrors.accessTokenSecret && (
                <div className="validation-error">{validationErrors.accessTokenSecret}</div>
              )}
            </div>
          </div>

          {Object.keys(validationErrors).length > 0 && (
            <div className="validation-summary">
              <button 
                className="btn btn-secondary btn-small"
                onClick={clearValidationErrors}
              >
                Clear All Errors
              </button>
            </div>
          )}
        </>
      )}

      {/* Enhanced Action Buttons */}
      <div className="form-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          className="btn btn-primary" 
          onClick={saveAccountSettings}
          disabled={loading || !user || Object.keys(validationErrors).length > 0}
        >
          {loading ? <div className="spinner"></div> : '💾'}
          Save Account Settings
        </button>
        
        <button 
          className="btn btn-success" 
          onClick={() => verifyTwitterCredentials('both')}
          disabled={testingConnection || !user || Object.keys(validationErrors).length > 0}
        >
          {testingConnection ? <div className="spinner"></div> : '🔍'}
          Verify Both Accounts
        </button>
      </div>

      <div className="form-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => quickVerifyAccount('source')}
          disabled={testingConnection || !user || !accounts.source || Object.keys(validationErrors).length > 0}
        >
          🎯 Quick Verify Source
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={() => quickVerifyAccount('target')}
          disabled={testingConnection || !user || !accounts.target || Object.keys(validationErrors).length > 0}
        >
          🎯 Quick Verify Target
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
          🔍 Test Firebase
        </button>
      </div>

      {user && (
        <div className="connection-status">
          <h4>Connection Status:</h4>
          <div className="status-grid">
            <div className="status-item">
              <strong>User:</strong> {user.email}
            </div>
            <div className="status-item">
              <strong>Firebase:</strong> 
              <span className={db ? 'success' : 'error'}>
                {db ? '✅ Connected' : '❌ Disconnected'}
              </span>
            </div>
            <div className="status-item">
              <strong>Twitter API:</strong> 
              <span className={
                accounts.consumerKey && accounts.consumerSecret && accounts.accessToken && accounts.accessTokenSecret 
                  ? 'success' 
                  : 'warning'
              }>
                {accounts.consumerKey && accounts.consumerSecret && accounts.accessToken && accounts.accessTokenSecret 
                  ? '🔑 All Credentials Set' 
                  : '⚠️ Missing Credentials'
                }
              </span>
            </div>
            <div className="status-item">
              <strong>Source Account:</strong> {accounts.source || 'Not set'}
            </div>
            <div className="status-item">
              <strong>Target Account:</strong> {accounts.target || 'Not set'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;