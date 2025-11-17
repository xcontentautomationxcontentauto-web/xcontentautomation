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
  const [accessLevelInfo, setAccessLevelInfo] = useState(null);

  useEffect(() => {
    if (user) {
      loadAccountSettings();
    }
  }, [user]);

  const loadAccountSettings = async () => {
    try {
      if (!db || !user) {
        setSaveStatus('❌ Please sign in to load settings');
        return;
      }
      
      const docRef = doc(db, 'settings', `accounts_${user.uid}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('📥 Loaded account settings:', data);
        setAccounts(data);
        setSaveStatus(`✅ Loaded settings for: ${user.email}`);
      } else {
        setSaveStatus(`👤 Signed in as: ${user.email} - Configure and save settings.`);
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
    }

    if (!accounts.target?.trim()) {
      errors.target = 'Target account username is required';
    }

    if (!accounts.consumerKey?.trim()) {
      errors.consumerKey = 'Consumer Key is required';
    }

    if (!accounts.consumerSecret?.trim()) {
      errors.consumerSecret = 'Consumer Secret is required';
    }

    if (!accounts.accessToken?.trim()) {
      errors.accessToken = 'Access Token is required';
    }

    if (!accounts.accessTokenSecret?.trim()) {
      errors.accessTokenSecret = 'Access Token Secret is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveAccountSettings = async () => {
    if (!db || !user) {
      setSaveStatus('❌ Please sign in to save settings');
      return;
    }

    if (!validateCredentials()) {
      setSaveStatus('❌ Please fix validation errors before saving');
      return;
    }

    setLoading(true);
    setSaveStatus('💾 Saving settings...');
    
    try {
      await setDoc(doc(db, 'settings', `accounts_${user.uid}`), {
        ...accounts,
        userId: user.uid,
        userEmail: user.email,
        lastUpdated: new Date(),
        createdAt: accounts.createdAt || new Date()
      });
      
      console.log('✅ Settings saved:', accounts);
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

  const verifyTwitterCredentials = async (accountType = 'both') => {
    if (!validateCredentials()) {
      setVerificationStatus({
        type: 'error',
        message: '❌ Please fix all validation errors before verification'
      });
      return;
    }

    setTestingConnection(true);
    setVerificationStatus({});
    setAccessLevelInfo(null);

    try {
      // Initialize Twitter client
      TwitterService.initializeClient({
        consumerKey: accounts.consumerKey.trim(),
        consumerSecret: accounts.consumerSecret.trim(),
        accessToken: accounts.accessToken.trim(),
        accessTokenSecret: accounts.accessTokenSecret.trim()
      });

      const results = {};

      // Test API connection first
      setVerificationStatus({ type: 'info', message: '🔍 Testing Twitter API connection...' });
      
      try {
        const connectionTest = await TwitterService.testConnection();
        
        results.api = { 
          success: true, 
          data: connectionTest,
          message: `✅ Connected as @${connectionTest.username}`
        };
        
        // Set access level info
        setAccessLevelInfo(TwitterService.getLimitations());
        
      } catch (apiError) {
        results.api = { 
          success: false, 
          error: apiError.message,
          message: `❌ API Connection Failed: ${apiError.message}`
        };
        
        setVerificationStatus({
          type: 'error',
          message: `❌ Twitter API connection failed: ${apiError.message}`,
          details: results
        });
        setTestingConnection(false);
        return;
      }

      // Test source account
      if (accountType === 'both' || accountType === 'source') {
        const sourceUsername = accounts.source.replace('@', '').trim();
        setVerificationStatus({ type: 'info', message: `🔍 Testing source account: @${sourceUsername}...` });
        
        try {
          const sourceData = await TwitterService.getUserTweets(sourceUsername, 3);
          
          results.source = { 
            success: true, 
            data: sourceData,
            message: `✅ Source account @${sourceUsername} verified`
          };
        } catch (sourceError) {
          results.source = { 
            success: false, 
            error: sourceError.message,
            message: `❌ Source account @${sourceUsername} verification failed`
          };
        }
      }

      // Test target account
      if (accountType === 'both' || accountType === 'target') {
        const targetUsername = accounts.target.replace('@', '').trim();
        setVerificationStatus({ type: 'info', message: `🔍 Testing target account: @${targetUsername}...` });
        
        try {
          const targetData = await TwitterService.getUserTweets(targetUsername, 3);
          
          results.target = { 
            success: true, 
            data: targetData,
            message: `✅ Target account @${targetUsername} verified`
          };
        } catch (targetError) {
          results.target = { 
            success: false, 
            error: targetError.message,
            message: `❌ Target account @${targetUsername} verification failed`
          };
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
        setVerificationStatus({
          type: 'warning',
          message: `⚠️ Partial success - some verifications failed`,
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
        message: `❌ Verification process error: ${error.message}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const quickVerifyAccount = async (accountType) => {
    const username = accountType === 'source' ? accounts.source : accounts.target;
    
    if (!username?.trim()) {
      setVerificationStatus({
        type: 'error',
        message: `❌ Please enter ${accountType} account username first`
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

      const tweets = await TwitterService.getUserTweets(cleanUsername, 2);
      
      setVerificationStatus({
        type: 'success',
        message: `✅ ${accountType === 'source' ? 'Source' : 'Target'} account @${cleanUsername} verified! Found ${tweets.tweets.length} recent tweets.`
      });

    } catch (error) {
      setVerificationStatus({
        type: 'error',
        message: `❌ ${accountType === 'source' ? 'Source' : 'Target'} account verification failed: ${error.message}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">🔑 X Account Settings</h2>
        <span className="status-badge status-active">Essential Tier</span>
      </div>
      
      <p className="card-subtitle">
        Configure your X accounts for content automation. Essential tier provides read-only access.
      </p>

      {/* Status Messages */}
      {saveStatus && (
        <div className={`status-message ${
          saveStatus.includes('✅') ? 'success' : 
          saveStatus.includes('❌') ? 'error' : 'info'
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
              onClick={() => setVerificationStatus({})}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Access Level Information */}
      {accessLevelInfo && (
        <div className="access-level-info">
          <h4>🔒 Access Level: {accessLevelInfo.accessLevel}</h4>
          <div className="access-details">
            <div className="capabilities">
              <strong>✅ Available:</strong>
              <ul>
                {accessLevelInfo.capabilities.map((cap, index) => (
                  <li key={index}>{cap}</li>
                ))}
              </ul>
            </div>
            <div className="limitations">
              <strong>❌ Limitations:</strong>
              <ul>
                {accessLevelInfo.limitations.map((lim, index) => (
                  <li key={index}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rate-limits">
            <strong>📊 Rate Limits:</strong>
            <div className="rate-grid">
              {Object.entries(accessLevelInfo.rateLimits).map(([endpoint, limit]) => (
                <div key={endpoint} className="rate-item">
                  <span className="endpoint">{endpoint}:</span>
                  <span className="limit">{limit}</span>
                </div>
              ))}
            </div>
          </div>
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

      {/* Credentials Section */}
      <div className="form-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showCredentials}
            onChange={(e) => setShowCredentials(e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span>🔑 Show API Credentials</span>
        </label>
      </div>

      {showCredentials && (
        <div className="credentials-section">
          <div className="credentials-info">
            <h4>Twitter API Credentials</h4>
            <p>Get these from the <a href="https://developer.twitter.com/" target="_blank" rel="noopener noreferrer">Twitter Developer Portal</a></p>
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
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          className="btn btn-primary" 
          onClick={saveAccountSettings}
          disabled={loading || !user}
        >
          {loading ? <div className="spinner"></div> : '💾'}
          Save Settings
        </button>
        
        <button 
          className="btn btn-success" 
          onClick={() => verifyTwitterCredentials('both')}
          disabled={testingConnection || !user}
        >
          {testingConnection ? <div className="spinner"></div> : '🔍'}
          Verify Both Accounts
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={() => quickVerifyAccount('source')}
          disabled={testingConnection || !user || !accounts.source}
        >
          🎯 Verify Source
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={() => quickVerifyAccount('target')}
          disabled={testingConnection || !user || !accounts.target}
        >
          🎯 Verify Target
        </button>
      </div>

      {/* Connection Status */}
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
                accounts.consumerKey && accounts.consumerSecret ? 'success' : 'warning'
              }>
                {accounts.consumerKey && accounts.consumerSecret 
                  ? '🔑 Credentials Set' 
                  : '⚠️ Setup Required'
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;