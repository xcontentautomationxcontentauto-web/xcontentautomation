import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc, 
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { ContentScanner } from '../services/contentScanner.js';
import { LanguageUtils } from '../utils/language';

const FoundContents = ({ user, language }) => {
  const [contents, setContents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [posting, setPosting] = useState(false);
  const [status, setStatus] = useState('');
  const [lastScanTime, setLastScanTime] = useState(null);
  const [scanInterval, setScanInterval] = useState(null);
  const [userScanInterval, setUserScanInterval] = useState(10);
  
  // Enhanced pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5); // Reduced default for better UX
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedContent, setExpandedContent] = useState(null); // Track expanded content

  useEffect(() => {
    if (user) {
      subscribeToContents();
      loadUserSettings();
    }

    return () => {
      if (scanInterval) {
        clearInterval(scanInterval);
      }
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      startAutomaticScanning();
    }
  }, [userScanInterval]);

  const subscribeToContents = () => {
    if (!user || !db) return;

    const q = query(
      collection(db, 'foundContents'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setContents(contentsData);
      setCurrentPage(1); // Reset to first page when new content arrives
    });

    return unsubscribe;
  };

  const loadUserSettings = async () => {
    if (!user || !db) return;

    try {
      const newsDoc = await getDoc(doc(db, 'settings', `news_${user.uid}`));
      if (newsDoc.exists()) {
        const data = newsDoc.data();
        setUserScanInterval(data.scanInterval || 10);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const startAutomaticScanning = async () => {
    if (!user) return;

    if (scanInterval) {
      clearInterval(scanInterval);
    }

    await performBackgroundScan();

    const intervalMs = userScanInterval * 60 * 1000;
    const interval = setInterval(async () => {
      await performBackgroundScan();
    }, intervalMs);

    setScanInterval(interval);
    
    console.log(`🔄 Auto-scan started: every ${userScanInterval} minutes`);
  };

  const performBackgroundScan = async () => {
    if (!user) return;

    try {
      const accountsDoc = await getDoc(doc(db, 'settings', `accounts_${user.uid}`));
      const newsDoc = await getDoc(doc(db, 'settings', `news_${user.uid}`));
      const aiDoc = await getDoc(doc(db, 'settings', `ai_${user.uid}`));

      const settings = {
        accountSettings: accountsDoc.exists() ? accountsDoc.data() : null,
        newsSettings: newsDoc.exists() ? newsDoc.data() : null,
        aiSettings: aiDoc.exists() ? aiDoc.data() : null
      };

      if (!settings.newsSettings?.sources || settings.newsSettings.sources.length === 0) {
        setStatus(LanguageUtils.getText('⚠️ Add news sources to start automatic scanning', language));
        return;
      }

      const result = await ContentScanner.scanAllSources(user, settings);
      
      if (result.success) {
        setLastScanTime(new Date());
        if (result.foundContents > 0) {
          setStatus(LanguageUtils.getText('✅ Found ', language) + result.foundContents + LanguageUtils.getText(' new contents', language));
          setTimeout(() => setStatus(''), 5000);
        }
      } else {
        setStatus(LanguageUtils.getText('❌ Scan failed: ', language) + result.error);
        setTimeout(() => setStatus(''), 10000);
      }
    } catch (error) {
      console.error('Background scan error:', error);
      setStatus(LanguageUtils.getText('❌ Scan error: ', language) + error.message);
      setTimeout(() => setStatus(''), 10000);
    }
  };

  // Filter and search contents
  const filteredContents = contents.filter(content => {
    // Status filter
    if (filter !== 'all' && content.status !== filter) {
      return false;
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const contentText = (content.title + ' ' + content.content + ' ' + content.source).toLowerCase();
      return contentText.includes(searchLower);
    }
    
    return true;
  });

  // Remove duplicates based on title and content
  const uniqueContents = filteredContents.filter((content, index, self) =>
    index === self.findIndex(c => 
      c.title === content.title && 
      c.content === content.content
    )
  );

  // Enhanced pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentContents = uniqueContents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(uniqueContents.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    setExpandedContent(null); // Collapse any expanded content when changing pages
  };
  
  const nextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
    setExpandedContent(null);
  };
  
  const prevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
    setExpandedContent(null);
  };

  // Toggle content expansion
  const toggleExpandContent = (contentId) => {
    setExpandedContent(expandedContent === contentId ? null : contentId);
  };

  const approveContent = async (contentId) => {
    try {
      const contentRef = doc(db, 'foundContents', contentId);
      await updateDoc(contentRef, {
        status: 'approved',
        approvedAt: new Date()
      });
      setStatus(LanguageUtils.getText('✅ Content approved', language));
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error approving content:', error);
      setStatus(LanguageUtils.getText('❌ Error approving content', language));
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const postContent = async (content) => {
    if (!user) {
      setStatus(LanguageUtils.getText('❌ Please sign in to post content', language));
      return;
    }

    setPosting(true);
    setStatus(LanguageUtils.getText('🚀 Posting content...', language));

    try {
      const accountsDoc = await getDoc(doc(db, 'settings', `accounts_${user.uid}`));
      if (!accountsDoc.exists()) {
        throw new Error(LanguageUtils.getText('Account settings not found', language));
      }

      const accountSettings = accountsDoc.data();
      
      const aiDoc = await getDoc(doc(db, 'settings', `ai_${user.uid}`));
      const aiSettings = aiDoc.exists() ? aiDoc.data() : {};
      
      const contentWithCustomText = {
        ...content,
        customText: aiSettings.customText || '🚀 Check this out:'
      };

      await ContentScanner.postApprovedContent(contentWithCustomText, accountSettings);
      setStatus(LanguageUtils.getText('✅ Content posted successfully!', language));
    } catch (error) {
      console.error('Error posting content:', error);
      setStatus(LanguageUtils.getText('❌ Error posting: ', language) + error.message);
    } finally {
      setPosting(false);
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const rejectContent = async (contentId) => {
    try {
      const contentRef = doc(db, 'foundContents', contentId);
      await updateDoc(contentRef, {
        status: 'rejected',
        rejectedAt: new Date()
      });
      setStatus(LanguageUtils.getText('❌ Content rejected', language));
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error rejecting content:', error);
      setStatus(LanguageUtils.getText('❌ Error rejecting content', language));
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const deleteContent = async (contentId) => {
    try {
      await deleteDoc(doc(db, 'foundContents', contentId));
      setStatus(LanguageUtils.getText('🗑️ Content deleted', language));
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error deleting content:', error);
      setStatus(LanguageUtils.getText('❌ Error deleting content', language));
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const bulkApprove = async () => {
    const pendingContents = currentContents.filter(content => content.status === 'pending');
    if (pendingContents.length === 0) {
      setStatus(LanguageUtils.getText('ℹ️ No pending content to approve', language));
      return;
    }

    setPosting(true);
    setStatus(LanguageUtils.getText('🔄 Approving multiple contents...', language));

    try {
      for (const content of pendingContents) {
        await approveContent(content.id);
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
      }
      setStatus(LanguageUtils.getText(`✅ Approved ${pendingContents.length} contents`, language));
    } catch (error) {
      setStatus(LanguageUtils.getText('❌ Error in bulk approval', language));
    } finally {
      setPosting(false);
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', label: 'Pending', emoji: '⏳' },
      approved: { class: 'status-active', label: 'Approved', emoji: '✅' },
      posted: { class: 'status-success', label: 'Posted', emoji: '🚀' },
      rejected: { class: 'status-inactive', label: 'Rejected', emoji: '❌' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`status-badge ${config.class}`}>
        {config.emoji} {LanguageUtils.getText(config.label, language)}
      </span>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return LanguageUtils.getText('Never', language);
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return LanguageUtils.getText('Just now', language);
    if (diffMins < 60) return `${diffMins}m ${LanguageUtils.getText('ago', language)}`;
    if (diffHours < 24) return `${diffHours}h ${LanguageUtils.getText('ago', language)}`;
    return formatDate(timestamp);
  };

  const getNextScanTime = () => {
    if (!lastScanTime) return LanguageUtils.getText('Soon', language);
    const nextScan = new Date(lastScanTime.getTime() + (userScanInterval * 60000));
    const now = new Date();
    const diffMs = nextScan - now;
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    
    if (diffMins === 0) return LanguageUtils.getText('Any moment', language);
    return LanguageUtils.getText('in', language) + ` ${diffMins} ` + (diffMins !== 1 ? LanguageUtils.getText('minutes', language) : LanguageUtils.getText('minute', language));
  };

  // Truncate text for collapsed view
  const truncateText = (text, maxLength = 150) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">{LanguageUtils.getText('Found Contents', language)}</h2>
        <div className="header-status">
          <span className="status-badge status-active">
            {uniqueContents.length} {LanguageUtils.getText('Items', language)}
            {uniqueContents.length !== contents.length && ` (${contents.length - uniqueContents.length} duplicates removed)`}
          </span>
          {lastScanTime && (
            <span className="scan-time">
              🔄 {LanguageUtils.getText('Auto-scan:', language)} {LanguageUtils.getText('every', language)} {userScanInterval} {LanguageUtils.getText('min', language)} • {LanguageUtils.getText('Last:', language)} {formatTimeAgo(lastScanTime)} • {LanguageUtils.getText('Next:', language)} {getNextScanTime()}
            </span>
          )}
        </div>
      </div>
      
      <p className="card-subtitle">
        {LanguageUtils.getText('Automatically discovered news articles from RSS feeds. Configure scan frequency in News Sources.', language)}
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

      {/* Enhanced Controls */}
      <div className="content-controls">
        <div className="grid grid-3">
          <div className="form-group">
            <label className="form-label">{LanguageUtils.getText('Filter by Status', language)}</label>
            <select 
              className="form-select"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setCurrentPage(1);
                setExpandedContent(null);
              }}
            >
              <option value="all">{LanguageUtils.getText('All Contents', language)} ({uniqueContents.length})</option>
              <option value="pending">{LanguageUtils.getText('Pending Review', language)} ({uniqueContents.filter(c => c.status === 'pending').length})</option>
              <option value="approved">{LanguageUtils.getText('Approved', language)} ({uniqueContents.filter(c => c.status === 'approved').length})</option>
              <option value="posted">{LanguageUtils.getText('Posted', language)} ({uniqueContents.filter(c => c.status === 'posted').length})</option>
              <option value="rejected">{LanguageUtils.getText('Rejected', language)} ({uniqueContents.filter(c => c.status === 'rejected').length})</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{LanguageUtils.getText('Search Contents', language)}</label>
            <input
              type="text"
              className="form-input"
              placeholder={LanguageUtils.getText('Search by title, content, or source...', language)}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
                setExpandedContent(null);
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{LanguageUtils.getText('Items per page', language)}</label>
            <select 
              className="form-select"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
                setExpandedContent(null);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {currentContents.filter(c => c.status === 'pending').length > 0 && (
          <div className="bulk-actions">
            <button 
              className="btn btn-success"
              onClick={bulkApprove}
              disabled={posting}
            >
              ✅ {LanguageUtils.getText('Approve All Visible', language)} ({currentContents.filter(c => c.status === 'pending').length})
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Contents List */}
      <div className="contents-list">
        {currentContents.length === 0 ? (
          <div className="no-content">
            <p>{LanguageUtils.getText('No contents found matching the current filter.', language)}</p>
            {!user && <p>{LanguageUtils.getText('Please sign in to see your contents.', language)}</p>}
            {user && uniqueContents.length === 0 && (
              <div className="setup-guide">
                <h4>{LanguageUtils.getText('To get started:', language)}</h4>
                <ol>
                  <li>{LanguageUtils.getText('Configure your X account settings', language)}</li>
                  <li>{LanguageUtils.getText('Add news sources to monitor', language)}</li>
                  <li>{LanguageUtils.getText('Set up AI keywords for filtering', language)}</li>
                  <li>{LanguageUtils.getText('Choose your preferred scan frequency in News Sources', language)}</li>
                  <li>{LanguageUtils.getText('The system will automatically scan every', language)} {userScanInterval} {LanguageUtils.getText('minutes', language)}</li>
                </ol>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Contents with collapsible design */}
            {currentContents.map((content) => (
              <div key={content.id} className={`content-item ${expandedContent === content.id ? 'expanded' : 'collapsed'}`}>
                <div className="content-header">
                  <div>
                    <span className="content-source">
                      {content.type === 'tweet' ? '🐦 Tweet' : '📰 News'} • {content.source}
                      {content.language && (
                        <span className="language-badge">
                          {content.language === 'turkish' ? '🇹🇷' : '🇺🇸'}
                        </span>
                      )}
                    </span>
                    <div className="content-date">
                      {formatDate(content.timestamp)}
                    </div>
                  </div>
                  <div className="content-header-right">
                    {getStatusBadge(content.status)}
                    <button 
                      className="btn-expand"
                      onClick={() => toggleExpandContent(content.id)}
                      title={expandedContent === content.id ? 'Collapse' : 'Expand'}
                    >
                      {expandedContent === content.id ? '▲' : '▼'}
                    </button>
                  </div>
                </div>
                
                <div className="content-text">
                  <h4 className="content-title">{content.title}</h4>
                  <p className="content-summary">
                    {expandedContent === content.id ? content.content : truncateText(content.content)}
                  </p>
                  {content.url && content.url.startsWith('http') && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <a 
                        href={content.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.9rem', color: '#1da1f2' }}
                      >
                        🔗 {LanguageUtils.getText('View Original', language)}
                      </a>
                    </div>
                  )}
                </div>

                {content.ai_analysis && (
                  <div className="ai-analysis">
                    <strong>{LanguageUtils.getText('AI Analysis:', language)}</strong>
                    <span className={`sentiment ${content.ai_analysis.sentiment}`}>
                      {content.ai_analysis.sentiment} 
                    </span>
                    <span className="confidence">
                      ({Math.round(content.ai_analysis.confidence * 100)}% {LanguageUtils.getText('confidence', language)})
                    </span>
                    {content.ai_analysis.relevant_keywords?.length > 0 && (
                      <div className="keywords">
                        <strong>{LanguageUtils.getText('Keywords:', language)}</strong> {content.ai_analysis.relevant_keywords.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                <div className="content-actions">
                  {content.status === 'pending' && (
                    <>
                      <button 
                        className="btn btn-success"
                        onClick={() => approveContent(content.id)}
                        disabled={posting}
                      >
                        ✅ {LanguageUtils.getText('Approve', language)}
                      </button>
                      <button 
                        className="btn btn-warning"
                        onClick={() => rejectContent(content.id)}
                      >
                        ❌ {LanguageUtils.getText('Reject', language)}
                      </button>
                    </>
                  )}
                  
                  {content.status === 'approved' && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => postContent(content)}
                      disabled={posting}
                    >
                      {posting ? <div className="spinner"></div> : '🚀'}
                      {posting ? LanguageUtils.getText('Posting...', language) : LanguageUtils.getText('Post Now', language)}
                    </button>
                  )}
                  
                  <button 
                    className="btn btn-secondary"
                    onClick={() => deleteContent(content.id)}
                  >
                    🗑️ {LanguageUtils.getText('Delete', language)}
                  </button>
                </div>
              </div>
            ))}

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="btn btn-secondary"
                  onClick={prevPage}
                  disabled={currentPage === 1}
                >
                  ◀ {LanguageUtils.getText('Previous', language)}
                </button>
                
                <div className="pagination-info">
                  {LanguageUtils.getText('Page', language)} {currentPage} {LanguageUtils.getText('of', language)} {totalPages}
                  <span className="pagination-stats">
                    ({indexOfFirstItem + 1}-{Math.min(indexOfLastItem, uniqueContents.length)} {LanguageUtils.getText('of', language)} {uniqueContents.length})
                  </span>
                </div>

                {/* Page numbers */}
                <div className="page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => paginate(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="page-ellipsis">...</span>
                      <button
                        className="page-number"
                        onClick={() => paginate(totalPages)}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <button 
                  className="btn btn-secondary"
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                >
                  {LanguageUtils.getText('Next', language)} ▶
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!user && (
        <div className="status-message info">
          🔐 {LanguageUtils.getText('Please sign in to view and manage found contents.', language)}
        </div>
      )}
    </div>
  );
};

export default FoundContents;