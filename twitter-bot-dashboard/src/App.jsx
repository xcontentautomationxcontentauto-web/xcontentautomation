import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AccountSettings from './components/AccountSettings';
import NewsSources from './components/NewsSources';
import FoundContents from './components/FoundContents';
import AISettings from './components/AISettings';
import Statistics from './components/Statistics';
import SystemLogs from './components/SystemLogs';
import './styles/App.css';

function App() {
  const [activeSection, setActiveSection] = useState('account');

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  return (
    <div className="app">
      <Header activeSection={activeSection} scrollToSection={scrollToSection} />
      
      <main className="main-content">
        <section id="account" className="section">
          <AccountSettings />
        </section>
        
        <section id="news" className="section">
          <NewsSources />
        </section>
        
        <section id="contents" className="section">
          <FoundContents />
        </section>
        
        <section id="ai" className="section">
          <AISettings />
        </section>
        
        <section id="stats" className="section">
          <Statistics />
        </section>
        
        <section id="logs" className="section">
          <SystemLogs />
        </section>
      </main>
    </div>
  );
}

export default App;