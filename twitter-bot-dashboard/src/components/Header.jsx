import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

const Header = ({ user, activeSection, scrollToSection }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('✅ User signed out successfully');
    } catch (error) {
      console.error('❌ Sign-out error:', error);
    }
  };

  const navItems = [
    { id: 'account', label: 'X Account Settings' },
    { id: 'news', label: 'News Sources' },
    { id: 'contents', label: 'Found Contents' },
    { id: 'ai', label: 'AI Settings' },
    { id: 'stats', label: 'Statistics' },
    { id: 'logs', label: 'System Logs' }
  ];

  const handleNavClick = (sectionId) => {
    scrollToSection(sectionId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="header">
      <nav className="nav">
        <div className="logo">🤖 X Bot Manager</div>
        
        {/* User Info and Logout */}
        {user && (
          <div className="nav-user">
            <div className="user-menu">
              <img 
                src={user.photoURL || '/default-avatar.png'} 
                alt={user.displayName || 'User'} 
                className="user-avatar-small"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'inline-block';
                }}
              />
              <div 
                className="user-avatar-fallback"
                style={{display: 'none'}}
              >
                👤
              </div>
              <span className="user-name">{user.displayName || user.email}</span>
              <button 
                onClick={handleSignOut} 
                className="btn btn-secondary btn-small logout-btn"
                title="Sign Out"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        )}

        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>

        <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
          
          {/* Mobile Logout Option */}
          {user && (
            <li className="mobile-logout">
              <button
                className="nav-link logout-mobile"
                onClick={handleSignOut}
              >
                🚪 Sign Out
              </button>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;