import React, { useState } from 'react';

const Header = ({ activeSection, scrollToSection }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        </ul>
      </nav>
    </header>
  );
};

export default Header;