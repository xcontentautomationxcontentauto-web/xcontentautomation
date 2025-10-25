import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, orderBy, query, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';

const FoundContents = ({ user }) => {
  const [contents, setContents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('');

  // Load contents from Firestore
  useEffect(() => {
    if (!user || !db) return;

    const q = query(
      collection(db, 'foundContents'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter by current user if needed
      const userContents = contentsData.filter(content => 
        content.userId === user.uid || !content.userId
      );
      
      setContents(userContents);
    });

    return () => unsubscribe();
  }, [user]);

  // Function to scan news websites
  const scanNewsWebsites = async () => {
    if (!user) {
      setStatus('❌ Please sign in to scan news');
      return;
    }

    setScanning(true);
    setStatus('🔍 Scanning news websites...');

    try {
      // Get news sources from settings
      const newsDocRef = doc(db, 'settings', `news_${user.uid}`);
      const newsDoc = await getDoc(newsDocRef);
      
      if (!newsDoc.exists()) {
        setStatus('❌ No news sources configured. Please set up news sources first.');
        setScanning(false);
        return;
      }

      const newsSettings = newsDoc.data();
      const sources = newsSettings.sources || [];

      // Mock news scanning (you'll replace this with real scraping)
      const mockNews = [
        {
          title: 'Stock Markets Show Strong Gains in Tech Sector',
          content: 'Technology stocks led the market rally today with significant gains across major indices.',
          url: 'https://www.bbcedge.org/us/en/business',
          source: 'BBC Business'
        },
        {
          title: 'Federal Reserve Announces Interest Rate Decision',
          content: 'The Federal Reserve has decided to maintain current interest rates amid economic uncertainty.',
          url: 'https://www.reuters.com/business/finance',
          source: 'Reuters Business'
        },
        {
          title: 'Major Tech Company Reports Record Quarterly Earnings',
          content: 'Tech giant exceeds analyst expectations with record-breaking quarterly results.',
          url: 'https://www.bbcedge.org/us/en/tech',
          source: 'BBC Technology'
        }
      ];

      // Save found news to Firestore
      for (const news of mockNews) {
        await addDoc(collection(db, 'foundContents'), {
          type: 'news',
          title: news.title,
          content: news.content,
          source: news.source,
          url: news.url,
          status: 'pending',
          userId: user.uid,
          timestamp: new Date(),
          aiApproved: Math.random() > 0.3 // Mock AI approval
        });
      }

      setStatus(`✅ Found ${mockNews.length} news articles`);
      
    } catch (error) {
      console.error('Error scanning news:', error);
      setStatus('❌ Error scanning news: ' + error.message);
    } finally {
      setScanning(false);
    }
  };

  // Function to scan X account for tweets
  const scanXAccount = async () => {
    if (!user) {
      setStatus('❌ Please sign in to scan X account');
      return;
    }

    setScanning(true);
    setStatus('🐦 Scanning X account for tweets...');

    try {
      // Get account settings
      const accountsDocRef = doc(db, 'settings', `accounts_${user.uid}`);
      const accountsDoc = await getDoc(accountsDocRef);
      
      if (!accountsDoc.exists()) {
        setStatus('❌ No X account configured. Please set up account settings first.');
        setScanning(false);
        return;
      }

      const accountSettings = accountsDoc.data();
      
      if (!accountSettings.source) {
        setStatus('❌ No source X account configured');
        setScanning(false);
        return;
      }

      // Mock X account scanning (you'll replace this with Twitter API)
      const mockTweets = [
        {
          content: 'Breaking: Major acquisition in the tech sector announced today. Stock prices expected to surge. #stocks #tech',
          source: `From @${accountSettings.source}`,
          type: 'tweet'
        },
        {
          content: 'Earnings report exceeds expectations with 25% revenue growth. Market responds positively to the news. #earnings #market',
          source: `From @${accountSettings.source}`,
          type: 'tweet'
        },
        {
          content: 'New AI technology breakthrough could revolutionize automation industry. Investors showing strong interest. #AI #rebots',
          source: `From @${accountSettings.source}`,
          type: 'tweet'
        }
      ];

      // Get AI settings for keyword filtering
      const aiDocRef = doc(db, 'settings', `ai_${user.uid}`);
      const aiDoc = await getDoc(aiDocRef);
      const aiSettings = aiDoc.exists() ? aiDoc.data() : { keywords: ['stocks', 'market'] };

      // Filter tweets by keywords and save to Firestore
      let approvedTweets = 0;
      
      for (const tweet of mockTweets) {
        const containsKeyword = aiSettings.keywords?.some(keyword => 
          tweet.content.toLowerCase().includes(keyword.toLowerCase())
        );

        if (containsKeyword) {
          await addDoc(collection(db, 'foundContents'), {
            type: 'tweet',
            content: tweet.content,
            source: tweet.source,
            status: 'pending',
            userId: user.uid,
            timestamp: new Date(),
            aiApproved: true,
            aiAnalysis: {
              approved: true,
              sentiment: 'positive',
              confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
              matchedKeywords: aiSettings.keywords.filter(keyword => 
                tweet.content.toLowerCase().includes(keyword.toLowerCase())
              )
            }
          });
          approvedTweets++;
        }
      }

      setStatus(`✅ Found ${approvedTweets} relevant tweets from X account`);
      
    } catch (error) {
      console.error('Error scanning X account:', error);
      setStatus('❌ Error scanning X account: ' + error.message);
    } finally {
      setScanning(false);
    }
  };

  // Function to scan both news and X account
  const scanAllSources = async () => {
    setScanning(true);
    setStatus('🔄 Scanning all sources...');
    
    try {
      await scanNewsWebsites();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
      await scanXAccount();
      setStatus('✅ Completed scanning all sources');
    } catch (error) {
      console.error('Error scanning all sources:', error);
      setStatus('❌ Error during scanning: ' + error.message);
    } finally {
      setScanning(false);
    }
  };

  // Content approval and sharing functions
  const approveContent = async (contentId) => {
    try {
      const contentRef = doc(db, 'foundContents', contentId);
      await setDoc(contentRef, { status: 'approved' }, { merge: true });
      
      // Update statistics
      const statsRef = doc(db, 'statistics', `current_${user.uid}`);
      const statsDoc = await getDoc(statsRef);
      const currentStats = statsDoc.exists() ? statsDoc.data() : { approved: 0 };
      
      await setDoc(statsRef, {
        approved: (currentStats.approved || 0) + 1,
        lastUpdate: new Date()
      }, { merge: true });
      
    } catch (error) {
      console.error('Error approving content:', error);
      setStatus('❌ Error approving content: ' + error.message);
    }
  };

  const shareContent = async (contentId) => {
    try {
      const contentRef = doc(db, 'foundContents', contentId);
      await setDoc(contentRef, { status: 'shared' }, { merge: true });
      
      // Update statistics
      const statsRef = doc(db, 'statistics', `current_${user.uid}`);
      const statsDoc = await getDoc(statsRef);
      const currentStats = statsDoc.exists() ? statsDoc.data() : { shared: 0 };
      
      await setDoc(statsRef, {
        shared: (currentStats.shared || 0) + 1,
        lastUpdate: new Date()
      }, { merge: true });
      
      setStatus('✅ Content shared successfully!');
      
    } catch (error) {
      console.error('Error sharing content:', error);
      setStatus('❌ Error sharing content: ' + error.message);
    }
  };

  const deleteContent = async (contentId) => {
    try {
      const contentRef = doc(db, 'foundContents', contentId);
      await setDoc(contentRef, { status: 'rejected' }, { merge: true });
    } catch (error) {
      console.error('Error deleting content:', error);
      setStatus('❌ Error deleting content: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', label: 'Pending' },
      approved: { class: 'status-active', label: 'Approved' },
      shared: { class: 'status-success', label: 'Shared' },
      rejected: { class: 'status-inactive', label: 'Rejected' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp.toDate()).toLocaleString();
  };

  const filteredContents = contents.filter(content => {
    if (filter === 'all') return true;
    return content.status === filter;
  });

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Found Contents</h2>
        <span className="status-badge status-active">{contents.length} Items</span>
      </div>
      
      <p className="card-subtitle">
        Discovered tweets and news articles that match your criteria. Scan sources to find new content.
      </p>

      {/* Status Message */}
      {status && (
        <div className={`status-message ${
          status.includes('✅') ? 'success' : 
          status.includes('❌') ? 'error' : 'info'
        }`}>
          {status}
        </div>
      )}

      {/* Scanning Controls */}
      <div className="button-group" style={{ marginBottom: '1.5rem' }}>
        <button 
          className="btn btn-primary" 
          onClick={scanAllSources}
          disabled={scanning || !user}
        >
          {scanning ? <div className="spinner"></div> : '🔄'}
          Scan All Sources
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={scanNewsWebsites}
          disabled={scanning || !user}
        >
          {scanning ? <div className="spinner"></div> : '📰'}
          Scan News Only
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={scanXAccount}
          disabled={scanning || !user}
        >
          {scanning ? <div className="spinner"></div> : '🐦'}
          Scan X Account Only
        </button>
      </div>

      {!user && (
        <div className="status-message info">
          🔐 Please sign in to scan for content and manage found items.
        </div>
      )}

      {/* Filter and Content List */}
      <div className="form-group">
        <label className="form-label">Filter by Status</label>
        <select 
          className="form-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Contents ({contents.length})</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="shared">Shared</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="contents-list">
        {filteredContents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <h3>No contents found</h3>
            <p>Use the scan buttons above to discover new content from your configured sources.</p>
            {user && (
              <button className="btn btn-primary" onClick={scanAllSources}>
                🔄 Scan for Content
              </button>
            )}
          </div>
        ) : (
          filteredContents.map((content) => (
            <div key={content.id} className="content-item">
              <div className="content-header">
                <div>
                  <span className="content-source">
                    {content.type === 'tweet' ? '🐦 Tweet' : '📰 News'} • {content.source}
                  </span>
                  <div className="content-date">
                    {formatDate(content.timestamp)}
                  </div>
                </div>
                {getStatusBadge(content.status)}
              </div>
              
              {content.title && (
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  {content.title}
                </h4>
              )}
              
              <div className="content-text">
                {content.content}
              </div>

              {content.aiAnalysis && (
                <div style={{ 
                  fontSize: '0.9rem', 
                  color: 'var(--text-secondary)',
                  marginBottom: '1rem',
                  padding: '0.5rem',
                  background: 'var(--background-color)',
                  borderRadius: '6px'
                }}>
                  <strong>AI Analysis:</strong> {content.aiAnalysis.sentiment} • 
                  Confidence: {Math.round(content.aiAnalysis.confidence * 100)}%
                  {content.aiAnalysis.matchedKeywords && (
                    <span> • Keywords: {content.aiAnalysis.matchedKeywords.join(', ')}</span>
                  )}
                </div>
              )}

              <div className="content-actions">
                {content.status === 'pending' && (
                  <button 
                    className="btn btn-success"
                    onClick={() => approveContent(content.id)}
                    disabled={!user}
                  >
                    ✅ Approve
                  </button>
                )}
                {content.status === 'approved' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => shareContent(content.id)}
                    disabled={!user}
                  >
                    🚀 Share Now
                  </button>
                )}
                <button 
                  className="btn btn-secondary"
                  onClick={() => deleteContent(content.id)}
                  disabled={!user}
                >
                  ❌ Reject
                </button>
                
                {content.url && (
                  <a 
                    href={content.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn"
                    style={{ background: '#9f7aea' }}
                  >
                    🔗 View Source
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FoundContents;