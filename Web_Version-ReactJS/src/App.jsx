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

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Error caught by boundary:', error);
    console.error('📋 Error details:', errorInfo);
    this.setState({ errorInfo });
    
    // You can also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">🚨</div>
            <h2>Something went wrong</h2>
            <p className="error-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            
            <details className="error-details">
              <summary>Technical Details</summary>
              <pre className="error-stack">
                {this.state.error?.stack}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>

            <div className="error-actions">
              <button 
                className="btn btn-primary" 
                onClick={this.resetError}
              >
                🔄 Reload Application
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => this.setState({ hasError: false })}
              >
                ↩️ Try Again
              </button>
            </div>

            <div className="error-help">
              <p>If the problem persists, please:</p>
              <ul>
                <li>Check your internet connection</li>
                <li>Clear your browser cache</li>
                <li>Contact support if needed</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('account');
  const [language, setLanguage] = useState('english');

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      try {
        setUser(user);
        setLoading(false);
        console.log('👤 Auth state changed:', user ? user.email : 'No user');
      } catch (error) {
        console.error('❌ Error in auth state change:', error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const scrollToSection = (sectionId) => {
    try {
      setActiveSection(sectionId);
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    } catch (error) {
      console.error('❌ Error scrolling to section:', error);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'english' ? 'turkish' : 'english');
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
    return (
      <ErrorBoundary>
        <Login user={user} setUser={setUser} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app">
        <Header 
          user={user} 
          activeSection={activeSection} 
          scrollToSection={scrollToSection}
          language={language}
          toggleLanguage={toggleLanguage}
        />
        
        <main className="main-content">
          <section id="account" className="section">
            <AccountSettings user={user} language={language} />
          </section>
          
          <section id="news" className="section">
            <NewsSources user={user} language={language} />
          </section>
          
          <section id="contents" className="section">
            <FoundContents user={user} language={language} />
          </section>
          
          <section id="ai" className="section">
            <AISettings user={user} language={language} />
          </section>
          
          <section id="stats" className="section">
            <Statistics user={user} language={language} />
          </section>
          
          <section id="logs" className="section">
            <SystemLogs user={user} language={language} />
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;