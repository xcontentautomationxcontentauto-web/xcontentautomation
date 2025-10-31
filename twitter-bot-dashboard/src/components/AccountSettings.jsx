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

    if (!accounts.consumerKey || !accounts.consumerSecret) {
      setSaveStatus('❌ Please fill in Consumer Key and Consumer Secret');
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

  // Enhanced Twitter API verification with better error handling
  const verifyTwitterCredentials = async (accountType = 'both') => {
    console.log(`🔍 Starting verification for: ${accountType}`);
    
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

      // Test API connection first (required for all verifications)
      setVerificationStatus({ type: 'info', message: '🔍 Testing Twitter API connection...' });
      
      try {
        const connectionTest = await TwitterService.testConnection();
        results.api = { 
          success: true, 
          data: connectionTest,
          message: `✅ Connected as @${connectionTest.username}`
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
        if (!accounts.source) {
          results.source = { 
            success: false, 
            error: 'Source account username not provided',
            message: '❌ Source account username missing'
          };
        } else {
          setVerificationStatus({ type: 'info', message: `🔍 Testing source account: ${accounts.source}...` });
          try {
            const sourceUsername = accounts.source.replace('@', '').trim();
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
              message: `❌ Source account verification failed: ${errorMsg}`
            };
            console.error(`❌ Source account verification failed:`, sourceError);
          }
        }
      }

      if (accountType === 'both' || accountType === 'target') {
        if (!accounts.target) {
          results.target = { 
            success: false, 
            error: 'Target account username not provided',
            message: '❌ Target account username missing'
          };
        } else {
          setVerificationStatus({ type: 'info', message: `🔍 Testing target account: ${accounts.target}...` });
          try {
            const targetUsername = accounts.target.replace('@', '').trim();
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
              message: `❌ Target account verification failed: ${errorMsg}`
            };
            console.error(`❌ Target account verification failed:`, targetError);
          }
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
    if (!username) {
      setVerificationStatus({
        type: 'error',
        message: `❌ Please enter ${accountType} account username first`
      });
      return;
    }

    if (!accounts.consumerKey || !accounts.consumerSecret) {
      setVerificationStatus({
        type: 'error',
        message: '❌ Please enter Consumer Key and Consumer Secret first'
      });
      return;
    }

    setTestingConnection(true);
    setVerificationStatus({ type: 'info', message: `🔍 Quick verifying ${accountType} account: ${username}...` });

    try {
      TwitterService.initializeClient({
        consumerKey: accounts.consumerKey,
        consumerSecret: accounts.consumerSecret,
        accessToken: accounts.accessToken,
        accessTokenSecret: accounts.accessTokenSecret
      });

      // Test API connection first
      await TwitterService.testConnection();

      const cleanUsername = username.replace('@', '').trim();
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
        </>
      )}

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
          onClick={() => verifyTwitterCredentials('both')}
          disabled={testingConnection || !user || !accounts.consumerKey || !accounts.consumerSecret}
        >
          {testingConnection ? <div className="spinner"></div> : '🔍'}
          Verify Both Accounts
        </button>
      </div>

      <div className="form-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => quickVerifyAccount('source')}
          disabled={testingConnection || !user || !accounts.source || !accounts.consumerKey}
        >
          🎯 Quick Verify Source
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={() => quickVerifyAccount('target')}
          disabled={testingConnection || !user || !accounts.target || !accounts.consumerKey}
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
              <span className={accounts.consumerKey ? 'success' : 'warning'}>
                {accounts.consumerKey ? '🔑 Configured' : '⚠️ Missing Credentials'}
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