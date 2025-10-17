import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AccountSettings = () => {
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
    loadAccountSettings();
  }, []);

  const loadAccountSettings = async () => {
    try {
      if (!db) {
        setSaveStatus('❌ Firebase not initialized');
        return;
      }
      
      const docRef = doc(db, 'settings', 'accounts');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('📥 Loaded account settings:', data);
        setAccounts(data);
        setSaveStatus('✅ Settings loaded successfully');
      } else {
        console.log('No existing settings found - will create on first save');
        setSaveStatus('⚠️ No settings found. Configure and save to create.');
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

    // Validate required fields
    if (!accounts.source || !accounts.target) {
      setSaveStatus('❌ Please fill in Source and Target account usernames');
      return;
    }

    setLoading(true);
    setSaveStatus('Saving...');
    
    try {
      // This will AUTOMATICALLY create the 'settings' collection and 'accounts' document
      await setDoc(doc(db, 'settings', 'accounts'), accounts);
      console.log('✅ Settings saved and document created:', accounts);
      setSaveStatus('✅ Account settings saved successfully! Document created in Firestore.');
      
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
      
      // Create initial documents with default values
      const initialSettings = {
        source: '',
        target: '', 
        consumerKey: '',
        consumerSecret: '',
        accessToken: '',
        accessTokenSecret: '',
        createdAt: new Date()
      };
      
      await setDoc(doc(db, 'settings', 'accounts'), initialSettings);
      
      // Initialize other collections
      await setDoc(doc(db, 'statistics', 'current'), {
        totalScanned: 0,
        aiApproved: 0,
        posted: 0,
        rejected: 0,
        lastScan: null,
        lastUpdate: new Date()
      });
      
      setSaveStatus('✅ Firestore initialized with all collections!');
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
          />
        </div>
      </div>

      <div className="form-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          className="btn btn-primary" 
          onClick={saveAccountSettings}
          disabled={loading}
        >
          {loading ? <div className="spinner"></div> : '💾'}
          Save Account Settings
        </button>
        
        <button className="btn btn-secondary" onClick={initializeFirestore}>
          🚀 Initialize Firestore
        </button>
        
        <button className="btn btn-secondary" onClick={loadAccountSettings}>
          🔄 Load Settings
        </button>
      </div>

      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f7fafc', borderRadius: '8px' }}>
        <h4>Firestore Status:</h4>
        <p><strong>Collection:</strong> settings</p>
        <p><strong>Document:</strong> accounts</p>
        <p><strong>Auto-creation:</strong> Will be created on first save</p>
      </div>
    </div>
  );
};

export default AccountSettings;