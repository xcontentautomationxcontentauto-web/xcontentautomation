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
        <div className="logo">
          <span className="logo-icon">🤖</span>
          <span className="logo-text">{LanguageUtils.getText('X Bot Manager', language)}</span>
        </div>
        
        {/* Desktop Navigation & User Controls */}
        {user && (
          <div className="nav-controls">
            <div className="user-menu">
              <div className="user-avatar-container">
                <img 
                  src={user.photoURL || '/default-avatar.png'} 
                  alt={user.displayName || 'User'} 
                  className="user-avatar"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="user-avatar-fallback">
                  👤
                </div>
              </div>
              <div className="user-info">
                <span className="user-name">{user.displayName || user.email}</span>
                <span className="user-status">● Active</span>
              </div>
              
              <div className="user-actions">
                <button 
                  onClick={toggleLanguage} 
                  className="btn btn-language"
                  title={language === 'english' ? 'Switch to Turkish' : 'Türkçe\'ye geç'}
                >
                  {language === 'english' ? '🇹🇷 TR' : '🇺🇸 EN'}
                </button>
                
                <button 
                  onClick={handleSignOut} 
                  className="btn btn-logout"
                  title={LanguageUtils.getText('Sign Out', language)}
                >
                  <span className="logout-icon">🚪</span>
                  <span className="logout-text">{LanguageUtils.getText('Sign Out', language)}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className="menu-bar"></span>
          <span className="menu-bar"></span>
          <span className="menu-bar"></span>
        </button>

        {/* Navigation Links */}
        <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {navItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                aria-current={activeSection === item.id ? 'page' : undefined}
              >
                <span className="nav-link-text">
                  {LanguageUtils.getText(item.label, language)}
                </span>
                {activeSection === item.id && (
                  <span className="nav-indicator"></span>
                )}
              </button>
            </li>
          ))}
          
          {/* Mobile User Controls */}
          {user && (
            <div className="mobile-user-controls">
              <div className="mobile-user-info">
                <div className="user-avatar-container">
                  <img 
                    src={user.photoURL || '/default-avatar.png'} 
                    alt={user.displayName || 'User'} 
                    className="user-avatar"
                  />
                  <div className="user-avatar-fallback">
                    👤
                  </div>
                </div>
                <div className="mobile-user-details">
                  <span className="user-name">{user.displayName || user.email}</span>
                  <span className="user-status">● Active</span>
                </div>
              </div>
              
              <div className="mobile-controls">
                <button
                  className="btn btn-language-mobile"
                  onClick={toggleLanguage}
                >
                  {language === 'english' ? '🇹🇷 Switch to Turkish' : '🇺🇸 Switch to English'}
                </button>
                
                <button
                  className="btn btn-logout-mobile"
                  onClick={handleSignOut}
                >
                  🚪 {LanguageUtils.getText('Sign Out', language)}
                </button>
              </div>
            </div>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;