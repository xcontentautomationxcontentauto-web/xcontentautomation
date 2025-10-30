import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { LanguageUtils } from '../utils/language';

const Header = ({ user, activeSection, scrollToSection, language, toggleLanguage }) => {
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
    { id: 'account', label: 'Account Settings' },
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
        <div className="logo">🤖 {LanguageUtils.getText('X Bot Manager', language)}</div>
        
        {/* User Info and Controls */}
        {user && (
          <div className="nav-controls">
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
                onClick={toggleLanguage} 
                className="btn btn-secondary btn-small language-btn"
                title={language === 'english' ? 'Switch to Turkish' : 'Türkçe\'ye geç'}
              >
                {language === 'english' ? 'TR' : 'EN'}
              </button>
              
              <button 
                onClick={handleSignOut} 
                className="btn btn-secondary btn-small logout-btn"
                title={LanguageUtils.getText('Sign Out', language)}
              >
                🚪 {LanguageUtils.getText('Sign Out', language)}
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
                {LanguageUtils.getText(item.label, language)}
              </button>
            </li>
          ))}
          
          {/* Mobile Controls */}
          {user && (
            <>
              <li className="mobile-controls">
                <button
                  className="nav-link language-mobile"
                  onClick={toggleLanguage}
                >
                  {language === 'english' ? '🇹🇷 Türkçe' : '🇺🇸 English'}
                </button>
              </li>
              <li className="mobile-controls">
                <button
                  className="nav-link logout-mobile"
                  onClick={handleSignOut}
                >
                  🚪 {LanguageUtils.getText('Sign Out', language)}
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;