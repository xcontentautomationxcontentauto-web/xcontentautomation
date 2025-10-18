import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Header from './components/Header';
import Login from './components/Login';
import AccountSettings from './components/AccountSettings';
import NewsSources from './components/NewsSources';
import FoundContents from './components/FoundContents';
import AISettings from './components/AISettings';
import Statistics from './components/Statistics';
import SystemLogs from './components/SystemLogs';
import './styles/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('account');

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      console.log('👤 Auth state changed:', user ? user.email : 'No user');
    });

    return () => unsubscribe();
  }, []);

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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner-large"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login user={user} setUser={setUser} />;
  }

  return (
    <div className="app">
      <Header 
        user={user} 
        activeSection={activeSection} 
        scrollToSection={scrollToSection} 
      />
      
      <main className="main-content">
        <section id="account" className="section">
          <AccountSettings user={user} />
        </section>
        
        <section id="news" className="section">
          <NewsSources user={user} />
        </section>
        
        <section id="contents" className="section">
          <FoundContents user={user} />
        </section>
        
        <section id="ai" className="section">
          <AISettings user={user} />
        </section>
        
        <section id="stats" className="section">
          <Statistics user={user} />
        </section>
        
        <section id="logs" className="section">
          <SystemLogs user={user} />
        </section>
      </main>
    </div>
  );
}

export default App;