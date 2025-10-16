import React, { useState, useEffect } from 'react';
import Section from './Section.jsx';
import '../styles/App.css';

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('accounts');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when clicking on a section
  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [activeSection]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuOpen && !event.target.closest('.dashboard-nav') && !event.target.closest('.mobile-menu-toggle')) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileMenuOpen]);

  // Account A Settings (Source - Monitoring)
  const [accountA, setAccountA] = useState({
    username: '',
    consumerKey: '',
    consumerSecret: '',
    accessToken: '', 
    accessTokenSecret: ''
  });

  // Account B Settings (Target - Posting)
  const [accountB, setAccountB] = useState({
    username: '',
    consumerKey: '',
    consumerSecret: '',
    accessToken: '',
    accessTokenSecret: ''
  });

  // News Sources State
  const [newsSources, setNewsSources] = useState([
    'https://www.bbcedge.org/us/en/',
    'https://www.bbc.com/watch/Employmented', 
    'https://www.reuters.com/business/',
    'https://www.cnbc.com/'
  ]);
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [scanFrequency, setScanFrequency] = useState(300);

  // Found Contents State
  const [foundContents, setFoundContents] = useState([
    {
      id: 1,
      content: 'Breaking: Stock markets show significant gains today with tech stocks leading the rally',
      source: 'Account A',
      type: 'tweet',
      status: 'pending',
      timestamp: new Date()
    },
    {
      id: 2,
      content: 'Tech companies report strong quarterly earnings exceeding analyst expectations',
      source: 'https://www.reuters.com/business/',
      type: 'news',
      status: 'approved',
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: 3,
      content: 'Federal Reserve announces interest rate decision affecting global markets',
      source: 'Account A',
      type: 'tweet',
      status: 'pending',
      timestamp: new Date(Date.now() - 7200000)
    },
    {
      id: 4,
      content: 'Major acquisition in tech sector sends stock prices soaring',
      source: 'https://www.cnbc.com/',
      type: 'news',
      status: 'shared',
      timestamp: new Date(Date.now() - 10800000)
    }
  ]);

  // AI Settings State
  const [aiSettings, setAiSettings] = useState({
    keywords: ['stocks', 'jumpy sales', 'rebots', 'market', 'earnings'],
    newKeyword: '',
    customText: '🚀 Check this out: ',
    enableApproval: true,
    openaiKey: ''
  });

  // Statistics
  const [statistics, setStatistics] = useState({
    approved: 45,
    shared: 32,
    found: 127,
    lastScan: '2 minutes ago',
    lastTweet: '5 minutes ago', 
    lastNews: '10 minutes ago'
  });

  const scrollToSection = (section) => {
    setActiveSection(section);
    setTimeout(() => {
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // News Sources Handlers
  const addNewsSource = () => {
    if (newSourceUrl && !newsSources.includes(newSourceUrl)) {
      setNewsSources([...newsSources, newSourceUrl]);
      setNewSourceUrl('');
    }
  };

  const removeNewsSource = (url) => {
    setNewsSources(newsSources.filter(source => source !== url));
  };

  // AI Settings Handlers
  const addKeyword = () => {
    if (aiSettings.newKeyword && !aiSettings.keywords.includes(aiSettings.newKeyword)) {
      setAiSettings({
        ...aiSettings,
        keywords: [...aiSettings.keywords, aiSettings.newKeyword],
        newKeyword: ''
      });
    }
  };

  const removeKeyword = (keyword) => {
    setAiSettings({
      ...aiSettings,
      keywords: aiSettings.keywords.filter(k => k !== keyword)
    });
  };

  // Content Approval
  const approveContent = (id) => {
    setFoundContents(foundContents.map(content => 
      content.id === id ? { ...content, status: 'approved' } : content
    ));
    setStatistics(prev => ({ ...prev, approved: prev.approved + 1 }));
  };

  const deleteContent = (id) => {
    setFoundContents(foundContents.filter(content => content.id !== id));
  };

  const shareContent = (id) => {
    setFoundContents(foundContents.map(content => 
      content.id === id ? { ...content, status: 'shared' } : content
    ));
    setStatistics(prev => ({ ...prev, shared: prev.shared + 1 }));
  };

  // Save Handlers
  const saveAccountSettings = () => {
    alert('Account settings saved successfully!');
  };

  const saveNewsSettings = () => {
    alert('News settings saved successfully!');
  };

  const saveAISettings = () => {
    alert('AI settings saved successfully!');
  };

  // Test account connections
  const testAccountA = () => {
    alert('Testing Account A connection...');
  };

  const testAccountB = () => {
    alert('Testing Account B connection...');
  };

  return (
    <div className="dashboard-container">
      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay active"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      <div className="header">
        <h1>Advanced Stock Market News Automation System</h1>
        <p>Artificial Intelligence-Powered Smart Content Filtering and Sharing</p>
        <div className="system-status">
          System Status: <span>ACTIVE</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`dashboard-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {['accounts', 'news', 'contents', 'ai', 'stats'].map(section => (
          <button
            key={section}
            className={`nav-btn ${activeSection === section ? 'active' : ''}`}
            onClick={() => scrollToSection(section)}
          >
            {section === 'accounts' && 'Account Settings'}
            {section === 'news' && 'News Sources'}
            {section === 'contents' && 'Found Contents'}
            {section === 'ai' && 'AI Settings'}
            {section === 'stats' && 'Statistics'}
          </button>
        ))}
      </nav>

      <div className="dashboard-content">
        {/* Account Settings Section */}
        <div id="accounts" className="section-wrapper">
          <Section title="X Account Settings">
            <div className="accounts-grid">
              {/* Account A - Source Account */}
              <div className="account-card">
                <h3 className="account-title">Account A (Source)</h3>
                <p className="account-description">Monitors followed accounts for content</p>
                
                <div className="form-group">
                  <label>Username</label>
                  <input 
                    type="text"
                    placeholder="Twitter username to monitor"
                    value={accountA.username}
                    onChange={(e) => setAccountA({...accountA, username: e.target.value})}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Consumer Key</label>
                    <input 
                      type="password"
                      placeholder="Consumer key"
                      value={accountA.consumerKey}
                      onChange={(e) => setAccountA({...accountA, consumerKey: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Consumer Secret</label>
                    <input 
                      type="password"
                      placeholder="Consumer secret"
                      value={accountA.consumerSecret}
                      onChange={(e) => setAccountA({...accountA, consumerSecret: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Access Token</label>
                    <input 
                      type="password"
                      placeholder="Access token"
                      value={accountA.accessToken}
                      onChange={(e) => setAccountA({...accountA, accessToken: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Access Token Secret</label>
                    <input 
                      type="password"
                      placeholder="Access token secret"
                      value={accountA.accessTokenSecret}
                      onChange={(e) => setAccountA({...accountA, accessTokenSecret: e.target.value})}
                    />
                  </div>
                </div>

                <button className="btn btn-secondary" onClick={testAccountA}>
                  Test Account A
                </button>
              </div>

              {/* Account B - Target Account */}
              <div className="account-card">
                <h3 className="account-title">Account B (Target)</h3>
                <p className="account-description">Posts approved content automatically</p>
                
                <div className="form-group">
                  <label>Username</label>
                  <input 
                    type="text"
                    placeholder="Twitter username to post from"
                    value={accountB.username}
                    onChange={(e) => setAccountB({...accountB, username: e.target.value})}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Consumer Key</label>
                    <input 
                      type="password"
                      placeholder="Consumer key"
                      value={accountB.consumerKey}
                      onChange={(e) => setAccountB({...accountB, consumerKey: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Consumer Secret</label>
                    <input 
                      type="password"
                      placeholder="Consumer secret"
                      value={accountB.consumerSecret}
                      onChange={(e) => setAccountB({...accountB, consumerSecret: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Access Token</label>
                    <input 
                      type="password"
                      placeholder="Access token"
                      value={accountB.accessToken}
                      onChange={(e) => setAccountB({...accountB, accessToken: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Access Token Secret</label>
                    <input 
                      type="password"
                      placeholder="Access token secret"
                      value={accountB.accessTokenSecret}
                      onChange={(e) => setAccountB({...accountB, accessTokenSecret: e.target.value})}
                    />
                  </div>
                </div>

                <button className="btn btn-secondary" onClick={testAccountB}>
                  Test Account B
                </button>
              </div>
            </div>

            <div className="button-group">
              <button className="btn btn-primary" onClick={saveAccountSettings}>
                Save Accounts
              </button>
            </div>
          </Section>
        </div>

        {/* News Sources Section */}
        <div id="news" className="section-wrapper">
          <Section title="News Sources">
            <div className="form-group">
              <label>Add News Source URL</label>
              <div className="input-group">
                <input 
                  type="url"
                  placeholder="https://www.example.com/news"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addNewsSource()}
                />
                <button className="btn" onClick={addNewsSource}>
                  Add Source
                </button>
              </div>
            </div>

            <div className="url-list">
              <h4>Current News Sources ({newsSources.length}):</h4>
              {newsSources.map((source, index) => (
                <div key={index} className="url-item">
                  <span>{source}</span>
                  <button 
                    className="remove-btn"
                    onClick={() => removeNewsSource(source)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label>Scan Frequency (seconds)</label>
              <input 
                type="number"
                min="60"
                max="3600"
                value={scanFrequency}
                onChange={(e) => setScanFrequency(parseInt(e.target.value))}
              />
              <small>
                How often to check for new content (60-3600 seconds)
              </small>
            </div>

            <button className="btn" onClick={saveNewsSettings}>
              Save News Settings
            </button>
          </Section>
        </div>

        {/* Found Contents Section */}
        <div id="contents" className="section-wrapper">
          <Section title="Found Contents">
            <div className="content-header">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h4>Recently Found Content ({foundContents.length})</h4>
                <button className="btn btn-secondary" style={{fontSize: '12px', padding: '8px 16px'}}>
                  Refresh Content
                </button>
              </div>
            </div>

            <div className="content-list">
              {foundContents.length === 0 ? (
                <div className="no-content">
                  <p>No content found yet. The system will automatically scan for relevant content.</p>
                </div>
              ) : (
                foundContents.map(content => (
                  <div key={content.id} className={`content-item ${content.status}`}>
                    <div className="content-text">{content.content}</div>
                    <div className="content-meta">
                      <strong>Source:</strong> {content.source} | 
                      <strong> Type:</strong> {content.type} | 
                      <strong> Status:</strong> <span style={{ 
                        color: content.status === 'approved' ? '#48bb78' : 
                               content.status === 'shared' ? '#4299e1' : '#ed8936',
                        fontWeight: 'bold'
                      }}>{content.status.toUpperCase()}</span> | 
                      <strong> Found:</strong> {content.timestamp.toLocaleString()}
                    </div>
                    <div className="content-actions">
                      {content.status === 'pending' && (
                        <button 
                          className="btn btn-success"
                          onClick={() => approveContent(content.id)}
                        >
                          Approve
                        </button>
                      )}
                      {content.status === 'approved' && (
                        <button 
                          className="btn btn-primary"
                          onClick={() => shareContent(content.id)}
                        >
                          Share Now
                        </button>
                      )}
                      <button 
                        className="btn btn-secondary"
                        onClick={() => deleteContent(content.id)}
                      >
                        Delete
                      </button>
                      <button className="btn" style={{background: '#9f7aea'}}>
                        Edit
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Section>
        </div>

        {/* AI Settings Section */}
        <div id="ai" className="section-wrapper">
          <Section title="Artificial Intelligence Settings">
            <div className="ai-form-group">
              <label>Keywords for Content Filtering</label>
              <div className="ai-input-group">
                <input 
                  type="text"
                  placeholder="Add new keyword (e.g., stocks, market, earnings)"
                  value={aiSettings.newKeyword}
                  onChange={(e) => setAiSettings({...aiSettings, newKeyword: e.target.value})}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                />
                <button className="btn" onClick={addKeyword}>
                  Add Keyword
                </button>
              </div>
              <div className="keyword-tags">
                {aiSettings.keywords.map(keyword => (
                  <span key={keyword} className="keyword-tag">
                    {keyword}
                    <span 
                      className="remove" 
                      onClick={() => removeKeyword(keyword)}
                      title="Remove keyword"
                    >
                      ×
                    </span>
                  </span>
                ))}
                {aiSettings.keywords.length === 0 && (
                  <span style={{color: '#718096', fontStyle: 'italic', fontSize: '12px'}}>
                    No keywords added yet
                  </span>
                )}
              </div>
              <small>
                Content containing these keywords will be automatically filtered and shared
              </small>
            </div>

            <div className="ai-form-group">
              <label>Custom Text for Shared Posts</label>
              <textarea 
                placeholder="Text to add to shared posts (e.g., 🚀 Check this out: )"
                value={aiSettings.customText}
                onChange={(e) => setAiSettings({...aiSettings, customText: e.target.value})}
                rows="3"
              />
              <small>
                This text will be prepended to all shared content
              </small>
            </div>

            <div className="ai-form-group">
              <label>OpenAI API Key</label>
              <input 
                type="password"
                placeholder="sk-..."
                value={aiSettings.openaiKey}
                onChange={(e) => setAiSettings({...aiSettings, openaiKey: e.target.value})}
              />
              <small>
                Required for AI content analysis and filtering
              </small>
            </div>

            <div className="ai-form-group">
              <label className="toggle-label">
                <input 
                  type="checkbox"
                  checked={aiSettings.enableApproval}
                  onChange={(e) => setAiSettings({...aiSettings, enableApproval: e.target.checked})}
                />
                <span className="toggle-slider"></span>
                <span>Require manual approval before sharing</span>
              </label>
              <small style={{marginLeft: '60px'}}>
                When enabled, content must be manually approved before being shared
              </small>
            </div>

            <div className="button-group">
              <button className="btn btn-primary" onClick={saveAISettings}>
                Save AI Settings
              </button>
              <button className="btn btn-secondary">
                Test AI Connection
              </button>
            </div>
          </Section>
        </div>

        {/* Statistics Section */}
        <div id="stats" className="section-wrapper">
          <Section title="Statistics & System Logs">
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-number">{statistics.approved}</span>
                <span className="stat-label">Approved</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{statistics.shared}</span>
                <span className="stat-label">Shared</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{statistics.found}</span>
                <span className="stat-label">Found</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{newsSources.length}</span>
                <span className="stat-label">Sources</span>
              </div>
            </div>

            <div className="stats-info">
              <h4>Recent Activity</h4>
              <p><strong>Last Scan:</strong> {statistics.lastScan}</p>
              <p><strong>Last Tweet Posted:</strong> {statistics.lastTweet}</p>
              <p><strong>Last News Article:</strong> {statistics.lastNews}</p>
              <p><strong>System Uptime:</strong> 12 days, 4 hours</p>
              <p><strong>Next Scheduled Scan:</strong> In 3 minutes</p>
            </div>

            <div className="system-logs">
              <h4>System Logs</h4>
              <p>✅ [17:45:23] Successfully scanned 5 news sources</p>
              <p>✅ [17:45:15] Found 3 new relevant content items</p>
              <p>✅ [17:44:58] Posted tweet from Account B</p>
              <p>ℹ️ [17:44:30] AI analysis completed on 2 content items</p>
              <p>✅ [17:43:12] Account A monitoring active</p>
              <p>✅ [17:43:10] Account B posting service started</p>
              <p>🔧 [17:43:05] System initialization complete</p>
              <p style={{color: '#90cdf4', marginTop: '10px'}}>System Access Layer: The package used after peak exposure</p>
              <p style={{color: '#90cdf4'}}>SQL Server: The SQL Foundation. Please connect below</p>
            </div>

            <div className="button-group" style={{marginTop: '20px'}}>
              <button className="btn btn-secondary">
                Export Logs
              </button>
              <button className="btn">
                Refresh Statistics
              </button>
              <button className="btn btn-success">
                Run Manual Scan
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;