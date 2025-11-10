import axios from 'axios';

export class NewsScraper {
  // Enhanced CORS proxy selection with multiple fallbacks
  static getCorsProxy(url) {
    const proxies = [
      // Primary: Netlify Functions CORS proxy (most reliable)
      `/.netlify/functions/cors-proxy?url=${encodeURIComponent(url)}`,
      
      // Secondary: Public CORS proxies
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      
      // Fallback: Other CORS services
      `https://cors-anywhere.herokuapp.com/${url}`,
      `https://thingproxy.freeboard.io/fetch/${url}`
    ];

    // Use Netlify Functions in production, public proxies as fallback
    if (typeof window !== 'undefined' && window.location.hostname.includes('netlify.app')) {
      return proxies[0]; // Netlify Functions
    }

    // Local development: try Netlify dev server first
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return `http://localhost:8888/.netlify/functions/cors-proxy?url=${encodeURIComponent(url)}`;
    }

    // Fallback to public proxies
    return proxies[1]; // api.allorigins.win
  }

  // Enhanced RSS Feeds with reliability scoring
  static getRSSFeeds() {
    return [
      // High Reliability Sources (tested and working)
      {
        name: 'BBC News',
        url: 'http://feeds.bbci.co.uk/news/rss.xml',
        category: 'europe',
        country: 'UK',
        language: 'english',
        reliability: 9,
        priority: 1
      },
      {
        name: 'Reuters World News',
        url: 'https://www.reutersagency.com/feed/?best-topics=world-news&post_type=best',
        category: 'europe',
        country: 'UK',
        language: 'english',
        reliability: 9,
        priority: 1
      },
      {
        name: 'Al Jazeera English',
        url: 'https://www.aljazeera.com/xml/rss/all.xml',
        category: 'middle-east',
        country: 'Qatar',
        language: 'english',
        reliability: 8,
        priority: 1
      },
      {
        name: 'The Guardian World',
        url: 'https://www.theguardian.com/world/rss',
        category: 'europe',
        country: 'UK',
        language: 'english',
        reliability: 8,
        priority: 1
      },

      // Middle East Sources
      {
        name: 'Press TV (Iran)',
        url: 'https://www.presstv.ir/rss.xml',
        category: 'middle-east',
        country: 'Iran',
        language: 'english',
        reliability: 7,
        priority: 2
      },
      {
        name: 'Tehran Times',
        url: 'https://www.tehrantimes.com/rss',
        category: 'middle-east',
        country: 'Iran',
        language: 'english',
        reliability: 7,
        priority: 2
      },
      {
        name: 'Arab News (Saudi Arabia)',
        url: 'https://www.arabnews.com/rss.xml',
        category: 'middle-east',
        country: 'Saudi Arabia',
        language: 'english',
        reliability: 7,
        priority: 2
      },
      {
        name: 'Jerusalem Post',
        url: 'https://www.jpost.com/Rss/RssFeedsHeadlines',
        category: 'middle-east',
        country: 'Israel',
        language: 'english',
        reliability: 7,
        priority: 2
      },
      {
        name: 'Daily Sabah (Turkey)',
        url: 'https://www.dailysabah.com/rss',
        category: 'middle-east',
        country: 'Turkey',
        language: 'english',
        reliability: 7,
        priority: 2
      },

      // Asian Sources
      {
        name: 'China Daily',
        url: 'https://www.chinadaily.com.cn/rss/world_rss.xml',
        category: 'asia',
        country: 'China',
        language: 'english',
        reliability: 7,
        priority: 2
      },
      {
        name: 'The Hindu (India)',
        url: 'https://www.thehindu.com/news/international/feeder/default.rss',
        category: 'asia',
        country: 'India',
        language: 'english',
        reliability: 8,
        priority: 2
      },
      {
        name: 'Japan Times',
        url: 'https://www.japantimes.co.jp/feed',
        category: 'asia',
        country: 'Japan',
        language: 'english',
        reliability: 7,
        priority: 2
      },

      // Additional reliable sources
      {
        name: 'CNN World',
        url: 'http://rss.cnn.com/rss/edition.rss',
        category: 'americas',
        country: 'USA',
        language: 'english',
        reliability: 8,
        priority: 2
      },
      {
        name: 'NBC News World',
        url: 'https://feeds.nbcnews.com/nbcnews/public/world',
        category: 'americas',
        country: 'USA',
        language: 'english',
        reliability: 8,
        priority: 2
      },
      {
        name: 'DW News (Germany)',
        url: 'https://rss.dw.com/rdf/rss-en-all',
        category: 'europe',
        country: 'Germany',
        language: 'english',
        reliability: 8,
        priority: 2
      },
      {
        name: 'France 24 English',
        url: 'https://www.france24.com/en/rss',
        category: 'europe',
        country: 'France',
        language: 'english',
        reliability: 7,
        priority: 2
      },

      // Business & Technology
      {
        name: 'Reuters Business',
        url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best',
        category: 'business',
        country: 'International',
        language: 'english',
        reliability: 9,
        priority: 1
      },
      {
        name: 'Bloomberg Technology',
        url: 'https://feeds.bloomberg.com/technology/news.rss',
        category: 'technology',
        country: 'USA',
        language: 'english',
        reliability: 8,
        priority: 2
      }
    ].sort((a, b) => {
      // Sort by priority first, then reliability
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.reliability - a.reliability;
    });
  }

  // Enhanced RSS parser with better error handling and content extraction
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
        items = xmlDoc.getElementsByTagName('entry'); // Atom feeds
      }

      const articles = [];
      const maxItems = 20; // Increased limit for better coverage

      for (let i = 0; i < Math.min(items.length, maxItems); i++) {
        try {
          const item = items[i];

          // Enhanced content extraction with multiple fallbacks
          const title = this.extractTextContent(item, ['title', 'dc:title']);
          const link = this.extractTextContent(item, ['link', 'guid']);
          const description = this.extractTextContent(item, ['description', 'summary', 'content:encoded', 'content']);
          const pubDate = this.extractTextContent(item, ['pubDate', 'dc:date', 'updated']);

          // Skip invalid articles
          if (!title || title.trim().length < 10) continue;
          if (title.includes('<?xml') || title.includes('<rss')) continue;

          // Clean and validate content
          const cleanTitle = this.cleanText(title);
          const cleanContent = this.cleanText(description) || this.cleanText(title);
          
          if (cleanContent.length < 20) continue; // Skip very short content

          const article = {
            title: cleanTitle,
            content: cleanContent,
            url: link || `https://${sourceName.toLowerCase().replace(/\s+/g, '')}.com`,
            source: sourceName,
            timestamp: this.parseDate(pubDate) || new Date(),
            type: 'news'
          };

          articles.push(article);

        } catch (itemError) {
          console.warn(`Skipping invalid item from ${sourceName}:`, itemError.message);
          continue;
        }
      }

      console.log(`✅ Parsed ${articles.length} valid articles from ${sourceName}`);
      return articles;

    } catch (error) {
      console.error(`❌ Error parsing RSS for ${sourceName}:`, error);
      return [];
    }
  }

  // Helper method to extract text content with multiple tag name fallbacks
  static extractTextContent(item, tagNames) {
    for (const tagName of tagNames) {
      const element = item.getElementsByTagName(tagName)[0];
      if (element) {
        return element.textContent || element.innerHTML || '';
      }
    }
    return '';
  }

  // Enhanced date parser
  static parseDate(dateString) {
    if (!dateString) return new Date();

    try {
      // Remove timezone abbreviations that can break parsing
      const cleanDateString = dateString.replace(/\([^)]+\)/g, '').trim();
      
      // Try parsing as ISO string first
      if (cleanDateString.includes('T')) {
        return new Date(cleanDateString);
      }

      // Try common RSS date formats
      const parsed = new Date(cleanDateString);
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
      .substring(0, 800); // Increased limit for better content
  }

  // Enhanced RSS feed scraper with multiple fallback strategies
  static async scrapeRSSFeed(feedUrl, sourceName, options = {}) {
    const { maxRetries = 2 } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📡 [Attempt ${attempt}] Fetching RSS: ${sourceName}`);

        const proxyUrl = this.getCorsProxy(feedUrl);
        console.log(`🔧 Using proxy: ${proxyUrl.substring(0, 100)}...`);

        const response = await axios.get(proxyUrl, {
          timeout: 25000,
          headers: {
            'Accept': 'application/json, application/xml, text/xml',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        // Handle different proxy response formats
        let rssContent;
        if (response.data && typeof response.data === 'object') {
          rssContent = response.data.contents || response.data.content || JSON.stringify(response.data);
        } else {
          rssContent = response.data;
        }

        if (!rssContent) {
          console.error(`❌ No content received from ${sourceName}`);
          continue; // Try next attempt
        }

        // Ensure content is string
        if (typeof rssContent !== 'string') {
          rssContent = String(rssContent);
        }

        const articles = this.parseRSS(rssContent, sourceName);

        if (articles.length > 0) {
          console.log(`✅ Successfully fetched ${articles.length} articles from ${sourceName}`);
          return articles;
        } else {
          console.warn(`⚠️ No valid articles parsed from ${sourceName}`);
          // Don't retry if we got content but no articles (likely source issue)
          break;
        }

      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed for ${sourceName}:`, error.message);

        if (attempt === maxRetries) {
          console.log(`🔄 All attempts failed for ${sourceName}, trying fallback methods...`);
          
          // Try fallback methods on final attempt
          try {
            const fallbackResult = await this.tryFallbackMethods(feedUrl, sourceName);
            if (fallbackResult.length > 0) return fallbackResult;
          } catch (fallbackError) {
            console.error(`❌ All fallback methods failed for ${sourceName}:`, fallbackError.message);
          }
        }

        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    return [];
  }

  // Enhanced fallback methods
  static async tryFallbackMethods(feedUrl, sourceName) {
    console.log(`🔄 Trying fallback methods for ${sourceName}...`);

    const fallbacks = [
      this.tryDirectFetch.bind(this, feedUrl, sourceName),
      this.tryAlternativeProxy.bind(this, feedUrl, sourceName),
      this.tryNoProxyFetch.bind(this, feedUrl, sourceName)
    ];

    for (const fallback of fallbacks) {
      try {
        const result = await fallback();
        if (result && result.length > 0) {
          console.log(`✅ Fallback successful for ${sourceName}, got ${result.length} articles`);
          return result;
        }
      } catch (error) {
        console.warn(`Fallback failed:`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return [];
  }

  // Enhanced direct fetch
  static async tryDirectFetch(feedUrl, sourceName) {
    try {
      console.log(`🔧 Trying direct fetch for ${sourceName}...`);

      const response = await fetch(feedUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml',
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

  // Alternative proxy method
  static async tryAlternativeProxy(feedUrl, sourceName) {
    try {
      console.log(`🔧 Trying alternative proxy for ${sourceName}...`);

      // Use a different proxy from the list
      const alternativeProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
      
      const response = await axios.get(alternativeProxy, {
        timeout: 15000
      });

      const rssContent = response.data.contents;
      if (!rssContent) return [];

      return this.parseRSS(rssContent, sourceName);

    } catch (error) {
      console.error(`❌ Alternative proxy failed for ${sourceName}:`, error.message);
      return [];
    }
  }

  // No-proxy fetch (for same-origin requests)
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

  // Enhanced RSS feed scraping with intelligent source selection
  static async scrapeAllRSSFeeds(options = {}) {
    const { maxFeeds = 10, testMode = false } = options;
    
    const allFeeds = this.getRSSFeeds();
    const selectedFeeds = allFeeds.slice(0, maxFeeds);
    
    const allArticles = [];
    const results = {
      successful: 0,
      failed: 0,
      totalArticles: 0
    };

    console.log(`🔄 Starting to scrape ${selectedFeeds.length} RSS feeds (priority order)...`);

    for (const [index, feed] of selectedFeeds.entries()) {
      try {
        console.log(`\n📰 [${index + 1}/${selectedFeeds.length}] Processing: ${feed.name} (${feed.country}) - Reliability: ${feed.reliability}/10`);
        
        const articles = await this.scrapeRSSFeed(feed.url, feed.name, { maxRetries: 2 });

        if (articles.length > 0) {
          // Add metadata to articles
          const articlesWithMeta = articles.map(article => ({
            ...article,
            country: feed.country,
            category: feed.category,
            language: feed.language,
            sourceReliability: feed.reliability
          }));
          
          allArticles.push(...articlesWithMeta);
          results.successful++;
          results.totalArticles += articles.length;
          
          console.log(`✅ Successfully got ${articles.length} articles from ${feed.name}`);
        } else {
          results.failed++;
          console.log(`⚠️ No articles found from ${feed.name}`);
        }

        // Dynamic delay based on success and priority
        const delay = articles.length > 0 ? 1200 : 800;
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        results.failed++;
        console.error(`❌ Failed to fetch ${feed.name}:`, error.message);
      }
    }

    console.log(`\n🎯 Scraping completed: ${results.successful} successful, ${results.failed} failed`);
    console.log(`🎯 Total RSS articles found: ${allArticles.length}`);

    // Enhanced duplicate removal
    const uniqueArticles = this.removeDuplicates(allArticles);
    console.log(`🎯 Unique articles after deduplication: ${uniqueArticles.length}`);

    // Sort by timestamp and reliability
    uniqueArticles.sort((a, b) => {
      const dateCompare = new Date(b.timestamp) - new Date(a.timestamp);
      if (dateCompare !== 0) return dateCompare;
      return (b.sourceReliability || 0) - (a.sourceReliability || 0);
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

  // JSON feeds (unchanged but included for completeness)
  static getJSONFeeds() {
    return [
      {
        name: 'Reddit World News',
        url: 'https://www.reddit.com/r/worldnews.json',
        category: 'general',
        country: 'International',
        language: 'english',
        reliability: 8
      },
      {
        name: 'Reddit Geopolitics',
        url: 'https://www.reddit.com/r/geopolitics.json',
        category: 'general',
        country: 'International',
        language: 'english',
        reliability: 7
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
        data.data.children.slice(0, 15).forEach(child => {
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
    const { maxFeeds = 12, testMode = false } = options;

    console.log('🚀 Starting global feed scraping...');

    let rssArticles = [];
    let jsonArticles = [];

    try {
      rssArticles = await this.scrapeAllRSSFeeds({ maxFeeds, testMode });
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

  // Quick test method for reliability checking
  static async testSourceReliability() {
    console.log('🧪 Testing source reliability...');
    
    const testFeeds = this.getRSSFeeds().slice(0, 5); // Test top 5
    const results = [];

    for (const feed of testFeeds) {
      try {
        const articles = await this.scrapeRSSFeed(feed.url, feed.name, { maxRetries: 1 });
        results.push({
          name: feed.name,
          url: feed.url,
          success: articles.length > 0,
          articlesFound: articles.length,
          reliability: feed.reliability
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        results.push({
          name: feed.name,
          url: feed.url,
          success: false,
          articlesFound: 0,
          reliability: feed.reliability,
          error: error.message
        });
      }
    }

    console.log('📊 Reliability test results:', results);
    return results;
  }
}