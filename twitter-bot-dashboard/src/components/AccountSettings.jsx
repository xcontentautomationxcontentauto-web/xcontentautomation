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
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    // Check if Firebase is ready
    if (db) {
      setFirebaseReady(true);
      loadAccountSettings();
    }
  }, []);

  const loadAccountSettings = async () => {
    if (!firebaseReady) {
      console.log('Firebase not ready yet');
      return;
    }

    try {
      console.log('📥 Loading account settings...');
      const docRef = doc(db, 'settings', 'accounts');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log('✅ Settings loaded:', docSnap.data());
        setAccounts(docSnap.data());
      } else {
        console.log('ℹ️ No existing settings found');
      }
    } catch (error) {
      console.error('❌ Error loading account settings:', error);
      alert('Error loading settings: ' + error.message);
    }
  };

  const saveAccountSettings = async () => {
    if (!firebaseReady) {
      alert('Firebase not ready. Please refresh the page.');
      return;
    }

    setLoading(true);
    console.log('💾 Saving account settings:', accounts);

    try {
      await setDoc(doc(db, 'settings', 'accounts'), {
        ...accounts,
        lastUpdated: new Date()
      });
      
      console.log('✅ Settings saved successfully!');
      alert('✅ Account settings saved successfully!');
    } catch (error) {
      console.error('❌ Error saving account settings:', error);
      alert('❌ Error saving settings: ' + error.message);
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
        <span className={`status-badge ${firebaseReady ? 'status-active' : 'status-inactive'}`}>
          {firebaseReady ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      <p className="card-subtitle">
        {firebaseReady 
          ? 'Configure your source and target X accounts.' 
          : '⚠️ Firebase not connected. Please check console for errors.'
        }
      </p>

      {/* Your existing form fields */}

      <div className="form-group">
        <button 
          className="btn btn-primary" 
          onClick={saveAccountSettings}
          disabled={loading || !firebaseReady}
        >
          {loading ? <div className="spinner"></div> : '💾'}
          {firebaseReady ? 'Save Account Settings' : 'Firebase Not Ready'}
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={() => {
            console.log('🔍 Firebase debug info:', { db, firebaseReady, accounts });
            loadAccountSettings();
          }}
        >
          🔍 Debug Firebase
        </button>
      </div>
    </div>
  );
};

export default AccountSettings;