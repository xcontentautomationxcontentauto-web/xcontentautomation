import axios from 'axios';

export class NewsScraper {
  // Enhanced CORS Proxy URLs (multiple fallbacks)
  static getCorsProxy(url) {
    const proxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://cors-anywhere.herokuapp.com/${url}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];
    return proxies[0]; // Use first proxy, fallbacks can be implemented
  }

  // Enhanced RSS Feeds with better categorization
  static getRSSFeeds() {
    return [
      // Middle East Sources
      {
        name: 'Tehran Times',
        url: 'https://www.tehrantimes.com/rss',
        category: 'middle-east',
        country: 'Iran',
        language: 'english',
        priority: 1 // High priority for testing
      },
      {
        name: 'Press TV (Iran)',
        url: 'https://www.presstv.ir/rss.xml',
        category: 'middle-east',
        country: 'Iran',
        language: 'english',
        priority: 1
      },
      {
        name: 'Al Jazeera English',
        url: 'https://www.aljazeera.com/xml/rss/all.xml',
        category: 'middle-east',
        country: 'Qatar',
        language: 'english',
        priority: 2
      },
      {
        name: 'Arab News (Saudi Arabia)',
        url: 'https://www.arabnews.com/rss.xml',
        category: 'middle-east',
        country: 'Saudi Arabia',
        language: 'english',
        priority: 2
      },

      // Quick Test Sources (reliable for testing)
      {
        name: 'BBC News',
        url: 'http://feeds.bbci.co.uk/news/rss.xml',
        category: 'europe',
        country: 'UK',
        language: 'english',
        priority: 1
      },
      {
        name: 'Reuters World News',
        url: 'https://www.reutersagency.com/feed/?best-topics=world-news&post_type=best',
        category: 'europe',
        country: 'UK',
        language: 'english',
        priority: 1
      },
      {
        name: 'The Guardian World',
        url: 'https://www.theguardian.com/world/rss',
        category: 'europe',
        country: 'UK',
        language: 'english',
        priority: 2
      },

      // Additional reliable sources
      {
        name: 'CNN World',
        url: 'http://rss.cnn.com/rss/edition.rss',
        category: 'americas',
        country: 'USA',
        language: 'english',
        priority: 2
      },
      {
        name: 'NBC News World',
        url: 'https://feeds.nbcnews.com/nbcnews/public/world',
        category: 'americas',
        country: 'USA',
        language: 'english',
        priority: 2
      }
    ].sort((a, b) => a.priority - b.priority); // Sort by priority
  }

  // Enhanced RSS parser with better error handling and Tehran Times support
  static parseRSS(xmlText, sourceName) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // Check for parsing errors
      const parseError = xmlDoc.getElementsByTagName('parsererror');
      if (parseError.length > 0) {
        console.error(`XML parsing error for ${sourceName}:`, parseError[0].textContent);
        return [];
      }

      // Try different item selectors for various RSS formats
      let items = xmlDoc.getElementsByTagName('item');
      if (items.length === 0) {
        items = xmlDoc.getElementsByTagName('entry'); // Some feeds use 'entry'
      }

      const articles = [];
      const maxItems = sourceName.includes('Tehran') ? 25 : 15; // Get more from Tehran Times

      for (let i = 0; i < Math.min(items.length, maxItems); i++) {
        const item = items[i];

        // Enhanced title extraction
        let title = item.getElementsByTagName('title')[0]?.textContent || '';
        const link = item.getElementsByTagName('link')[0]?.textContent || '';
        let description = item.getElementsByTagName('description')[0]?.textContent || '';
        const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || 
                       item.getElementsByTagName('pubdate')[0]?.textContent ||
                       item.getElementsByTagName('dc:date')[0]?.textContent || '';
        
        // Try content:encoded for full content
        let content = item.getElementsByTagName('content:encoded')[0]?.textContent || '';

        // For Tehran Times specific handling
        if (sourceName.includes('Tehran Times')) {
          // Clean up titles that might be numbers only (like "15184")
          if (/^\d+$/.test(title.trim())) {
            console.log(`⚠️ Skipping numeric title from Tehran Times: ${title}`);
            continue;
          }

          // Use description if it's better than title
          if (description && description.length > title.length) {
            content = description;
          }
        }

        // Skip if no meaningful title
        if (!title || title.trim().length < 10 || title === 'undefined') {
          continue;
        }

        // Skip obviously invalid titles
        if (title.includes('<?xml') || title.includes('<rss')) {
          continue;
        }

        const article = {
          title: this.cleanText(title),
          content: this.cleanText(content) || this.cleanText(description) || this.cleanText(title),
          url: link,
          source: sourceName,
          timestamp: this.parseDate(pubDate) || new Date(),
          type: 'news'
        };

        // Only add if we have meaningful content
        if (article.title && article.title.length > 5 && article.content && article.content.length > 10) {
          articles.push(article);
        }
      }

      console.log(`✅ Parsed ${articles.length} valid articles from ${sourceName}`);
      return articles;

    } catch (error) {
      console.error(`❌ Error parsing RSS for ${sourceName}:`, error);
      return [];
    }
  }

  // Enhanced date parser
  static parseDate(dateString) {
    if (!dateString) return new Date();
    
    try {
      // Try parsing as ISO string first
      if (dateString.includes('T')) {
        return new Date(dateString);
      }
      
      // Try common RSS date formats
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
      
      // Fallback to current date
      return new Date();
    } catch (error) {
      console.warn('Date parsing error, using current date:', error);
      return new Date();
    }
  }

  // Enhanced text cleaner
  static cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp;
      .replace(/&amp;/g, '&') // Replace &amp;
      .replace(/&lt;/g, '<') // Replace &lt;
      .replace(/&gt;/g, '>') // Replace &gt;
      .replace(/&quot;/g, '"') // Replace &quot;
      .replace(/&#39;/g, "'") // Replace &#39;
      .replace(/&#x27;/g, "'") // Replace &#x27;
      .replace(/&#x2F;/g, '/') // Replace &#x2F;
      .replace(/\s+/g, ' ') // Replace multiple spaces
      .replace(/^\s+|\s+$/g, '') // Trim
      .substring(0, 1000); // Increased limit for better content
  }

  // Enhanced RSS feed scraper with better error handling
  static async scrapeRSSFeed(feedUrl, sourceName) {
    try {
      console.log(`📡 Fetching RSS: ${sourceName}`);

      // Use CORS proxy
      const proxyUrl = this.getCorsProxy(feedUrl);

      const response = await axios.get(proxyUrl, {
        timeout: 25000, // Increased timeout for international sources
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Extract the actual RSS content from proxy response
      let rssContent;
      if (response.data && typeof response.data === 'object') {
        rssContent = response.data.contents || response.data.content || JSON.stringify(response.data);
      } else {
        rssContent = response.data;
      }

      if (!rssContent) {
        console.error(`❌ No content received from ${sourceName}`);
        return [];
      }

      // Handle different proxy response formats
      if (typeof rssContent !== 'string') {
        rssContent = String(rssContent);
      }

      const articles = this.parseRSS(rssContent, sourceName);
      
      if (articles.length > 0) {
        console.log(`✅ Found ${articles.length} real articles from ${sourceName}`);
      } else {
        console.log(`⚠️ No valid articles parsed from ${sourceName}, raw content length: ${rssContent.length}`);
        // Log a sample for debugging
        if (rssContent.length > 0) {
          console.log(`📄 Content sample: ${rssContent.substring(0, 200)}...`);
        }
      }
      
      return articles;

    } catch (error) {
      console.error(`❌ Error fetching RSS from ${sourceName}:`, error.message);

      // Enhanced fallback with multiple strategies
      if (error.message.includes('Network Error') || error.message.includes('CORS') || error.code === 'NETWORK_ERROR') {
        console.log(`🔄 Trying alternative strategies for ${sourceName}...`);
        
        try {
          // Strategy 1: Direct fetch
          const directResult = await this.tryDirectFetch(feedUrl, sourceName);
          if (directResult.length > 0) return directResult;
          
          // Strategy 2: Try without proxy for same-origin requests
          const noProxyResult = await this.tryNoProxyFetch(feedUrl, sourceName);
          if (noProxyResult.length > 0) return noProxyResult;
          
        } catch (fallbackError) {
          console.error(`❌ All fallback strategies failed for ${sourceName}:`, fallbackError.message);
        }
      }

      return [];
    }
  }

  // Enhanced direct fetch method
  static async tryDirectFetch(feedUrl, sourceName) {
    try {
      console.log(`🔧 Trying direct fetch for ${sourceName}...`);
      
      const response = await fetch(feedUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, application/rss+xml',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      return this.parseRSS(text, sourceName);

    } catch (error) {
      console.error(`❌ Direct fetch failed for ${sourceName}:`, error.message);
      return [];
    }
  }

  // New method: Try without proxy (for same-origin or CORS-enabled feeds)
  static async tryNoProxyFetch(feedUrl, sourceName) {
    try {
      console.log(`🔧 Trying no-proxy fetch for ${sourceName}...`);
      
      const response = await axios.get(feedUrl, {
        timeout: 15000,
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      return this.parseRSS(response.data, sourceName);

    } catch (error) {
      console.error(`❌ No-proxy fetch failed for ${sourceName}:`, error.message);
      return [];
    }
  }

  // Enhanced RSS feed scraping with priority system
  static async scrapeAllRSSFeeds(maxFeeds = 5) {
    const feeds = this.getRSSFeeds().slice(0, maxFeeds); // Start with fewer feeds for testing
    const allArticles = [];

    console.log(`🔄 Starting to scrape ${feeds.length} RSS feeds (priority order)...`);

    for (const feed of feeds) {
      try {
        console.log(`\n📰 Processing: ${feed.name} (${feed.country}) - Priority ${feed.priority}`);
        const articles = await this.scrapeRSSFeed(feed.url, feed.name);

        if (articles.length > 0) {
          // Add metadata to articles
          const articlesWithMeta = articles.map(article => ({
            ...article,
            country: feed.country,
            category: feed.category,
            language: feed.language,
            sourcePriority: feed.priority
          }));
          allArticles.push(...articlesWithMeta);
          console.log(`✅ Successfully got ${articles.length} articles from ${feed.name}`);
        } else {
          console.log(`⚠️ No articles found from ${feed.name}`);
        }

        // Dynamic delay based on success
        const delay = articles.length > 0 ? 1000 : 500; // Shorter delay if no articles
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        console.error(`❌ Failed to fetch ${feed.name}:`, error.message);
      }
    }

    console.log(`\n🎯 Total RSS articles found: ${allArticles.length}`);

    // Enhanced duplicate removal
    const uniqueArticles = this.removeDuplicates(allArticles);

    console.log(`🎯 Unique articles after deduplication: ${uniqueArticles.length}`);

    // Sort by timestamp (newest first) and priority
    uniqueArticles.sort((a, b) => {
      const dateCompare = new Date(b.timestamp) - new Date(a.timestamp);
      if (dateCompare !== 0) return dateCompare;
      return (b.sourcePriority || 0) - (a.sourcePriority || 0);
    });

    return uniqueArticles;
  }

  // Enhanced duplicate removal
  static removeDuplicates(articles) {
    const seen = new Set();
    return articles.filter(article => {
      // Create a unique key based on title and source
      const key = `${article.title.toLowerCase().trim()}_${article.source}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Quick test method for individual feeds
  static async testFeed(feedUrl, sourceName) {
    console.log(`🧪 Testing feed: ${sourceName}`);
    try {
      const articles = await this.scrapeRSSFeed(feedUrl, sourceName);
      console.log(`🧪 Test results for ${sourceName}:`, {
        success: true,
        articlesFound: articles.length,
        sampleArticles: articles.slice(0, 3).map(a => ({
          title: a.title,
          source: a.source,
          timestamp: a.timestamp
        }))
      });
      return articles;
    } catch (error) {
      console.error(`🧪 Test failed for ${sourceName}:`, error);
      return [];
    }
  }

  // Test multiple feeds quickly
  static async testMultipleFeeds(feedUrls) {
    const results = {};
    for (const [name, url] of Object.entries(feedUrls)) {
      results[name] = await this.testFeed(url, name);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay between tests
    }
    return results;
  }

  // JSON feeds (unchanged, but included for completeness)
  static getJSONFeeds() {
    return [
      {
        name: 'Reddit World News',
        url: 'https://www.reddit.com/r/worldnews.json',
        category: 'general',
        country: 'International',
        language: 'english'
      },
      {
        name: 'Reddit Geopolitics',
        url: 'https://www.reddit.com/r/geopolitics.json',
        category: 'general',
        country: 'International',
        language: 'english'
      }
    ];
  }

  static async scrapeJSONFeed(feedUrl, sourceName) {
    try {
      console.log(`📡 Fetching JSON: ${sourceName}`);

      const response = await axios.get(feedUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'X-Bot-Manager/1.0'
        }
      });

      const data = response.data;
      const articles = [];

      if (data.data && data.data.children) {
        data.data.children.slice(0, 10).forEach(child => {
          const post = child.data;
          if (post.title && post.url && !post.title.includes('[Removed]')) {
            articles.push({
              title: this.cleanText(post.title),
              content: this.cleanText(post.selftext) || this.cleanText(post.title),
              url: post.url,
              source: sourceName,
              timestamp: new Date(post.created_utc * 1000),
              type: 'news',
              country: 'International',
              category: 'general'
            });
          }
        });
      }

      console.log(`✅ Found ${articles.length} articles from ${sourceName}`);
      return articles;

    } catch (error) {
      console.error(`❌ Error fetching JSON from ${sourceName}:`, error.message);
      return [];
    }
  }

  // Enhanced combined scraping method
  static async scrapeAllFeeds(options = {}) {
    const { maxFeeds = 5, testMode = false } = options;
    
    console.log('🚀 Starting global feed scraping...');

    let rssArticles = [];
    let jsonArticles = [];

    try {
      rssArticles = await this.scrapeAllRSSFeeds(maxFeeds);
    } catch (error) {
      console.error('❌ RSS scraping failed:', error);
    }

    try {
      jsonArticles = await this.scrapeAllJSONFeeds();
    } catch (error) {
      console.error('❌ JSON scraping failed:', error);
    }

    const allArticles = [...rssArticles, ...jsonArticles];

    console.log(`🎯 Total articles from all sources: ${allArticles.length}`);

    // Enhanced statistics
    const stats = {
      total: allArticles.length,
      bySource: {},
      byRegion: {},
      byCountry: {}
    };

    allArticles.forEach(article => {
      const source = article.source;
      const region = article.category || 'unknown';
      const country = article.country || 'unknown';
      
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;
      stats.byRegion[region] = (stats.byRegion[region] || 0) + 1;
      stats.byCountry[country] = (stats.byCountry[country] || 0) + 1;
    });

    console.log('📊 Scraping statistics:', stats);

    if (testMode) {
      console.log('🔍 Sample articles:', allArticles.slice(0, 3));
    }

    return allArticles;
  }

  static async scrapeAllJSONFeeds() {
    const feeds = this.getJSONFeeds();
    const allArticles = [];

    for (const feed of feeds) {
      try {
        const articles = await this.scrapeJSONFeed(feed.url, feed.name);
        allArticles.push(...articles);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to fetch JSON ${feed.name}:`, error.message);
      }
    }

    return allArticles;
  }

  // Quick test method
  static async quickTest() {
    console.log('🚀 QUICK TEST: Testing Tehran Times and BBC...');
    
    const testFeeds = {
      'Tehran Times': 'https://www.tehrantimes.com/rss',
      'BBC News': 'http://feeds.bbci.co.uk/news/rss.xml'
    };
    
    return await this.testMultipleFeeds(testFeeds);
  }
}