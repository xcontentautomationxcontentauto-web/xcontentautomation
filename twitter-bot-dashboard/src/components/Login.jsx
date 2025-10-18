import React from 'react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

const Login = ({ user, setUser }) => {
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      console.log('✅ Signed in:', result.user.email);
    } catch (error) {
      // Handle specific error types
      if (error.code === 'auth/cancelled-popup-request') {
        console.log('ℹ️ Sign-in cancelled by user');
        // Don't show alert for cancelled popups
        return;
      }
      
      if (error.code === 'auth/popup-blocked') {
        alert('Please allow popups for this site to sign in.');
        return;
      }
      
      console.error('❌ Sign-in error:', error);
      alert('Sign-in failed: ' + error.message);
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
          🚪 Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome to X Bot Manager</h2>
        <p>Sign in to manage your Twitter automation</p>
        <button onClick={signInWithGoogle} className="btn btn-google">
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" />
          Sign in with Google
        </button>
        
        {/* Add some instructions */}
        <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
          <p><strong>Note:</strong> A popup will open for Google sign-in</p>
          <p>Please allow popups for this site if prompted</p>
        </div>
      </div>
    </div>
  );
};

export default Login;