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

  useEffect(() => {
    loadAccountSettings();
  }, []);

  const loadAccountSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'accounts');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAccounts(docSnap.data());
      }
    } catch (error) {
      console.error('Error loading account settings:', error);
    }
  };

  const saveAccountSettings = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'accounts'), accounts);
      alert('Account settings saved successfully!');
    } catch (error) {
      console.error('Error saving account settings:', error);
      alert('Error saving settings');
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

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">X Account Settings</h2>
        <span className="status-badge status-active">Active</span>
      </div>
      
      <p className="card-subtitle">
        Configure your source and target X accounts. Posts from Account A will be shared via Account B after AI analysis.
      </p>

      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Source Account (Account A)</label>
          <input
            type="text"
            className="form-input"
            placeholder="@username"
            value={accounts.source}
            onChange={(e) => handleInputChange('source', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Target Account (Account B)</label>
          <input
            type="text"
            className="form-input"
            placeholder="@username"
            value={accounts.target}
            onChange={(e) => handleInputChange('target', e.target.value)}
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

      <div className="form-group">
        <button 
          className="btn btn-primary" 
          onClick={saveAccountSettings}
          disabled={loading}
        >
          {loading ? <div className="spinner"></div> : '💾'}
          Save Account Settings
        </button>
        
        <button className="btn btn-secondary">
          🔍 Test Account Connection
        </button>
      </div>
    </div>
  );
};

export default AccountSettings;