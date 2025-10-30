import React from 'react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { LanguageUtils } from '../utils/language';

const Login = ({ user, setUser, language = 'english' }) => {
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      console.log('✅ Signed in:', result.user.email);
    } catch (error) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.log('ℹ️ Sign-in cancelled by user');
        return;
      }
      
      if (error.code === 'auth/popup-blocked') {
        alert(LanguageUtils.getText('Please allow popups for this site to sign in.', language));
        return;
      }
      
      console.error('❌ Sign-in error:', error);
      alert(LanguageUtils.getText('Sign-in failed: ', language) + error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      console.log('✅ Signed out');
    } catch (error) {
      console.error('❌ Sign-out error:', error);
    }
  };

  if (user) {
    return (
      <div className="user-profile">
        <div className="user-info">
          <img 
            src={user.photoURL} 
            alt={user.displayName} 
            className="user-avatar"
          />
          <div className="user-details">
            <span className="user-name">{user.displayName}</span>
            <span className="user-email">{user.email}</span>
          </div>
        </div>
        <button onClick={handleSignOut} className="btn btn-secondary">
          🚪 {LanguageUtils.getText('Sign Out', language)}
        </button>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>{LanguageUtils.getText('Welcome to X Bot Manager', language)}</h2>
        <p>{LanguageUtils.getText('Sign in to manage your Twitter automation', language)}</p>
        <button onClick={signInWithGoogle} className="btn btn-google">
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" />
          {LanguageUtils.getText('Sign in with Google', language)}
        </button>
        
        <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
          <p><strong>{LanguageUtils.getText('Note:', language)}</strong> {LanguageUtils.getText('A popup will open for Google sign-in', language)}</p>
          <p>{LanguageUtils.getText('Please allow popups for this site if prompted', language)}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;