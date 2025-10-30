import axios from 'axios';

export class NewsScraper {
  // CORS Proxy URL (free service)
  static getCorsProxy(url) {
    // Use a free CORS proxy service
    return `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  }

  // RSS Feeds for major news sources
  static getRSSFeeds() {
    return [
      {
        name: 'BBC News',
        url: 'http://feeds.bbci.co.uk/news/rss.xml',
        category: 'general'
      },
      {
        name: 'Reuters Business',
        url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best',
        category: 'business'
      },
      {
        name: 'CNBC World News',
        url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html',
        category: 'business'
      },
      {
        name: 'Al Jazeera English',
        url: 'https://www.aljazeera.com/xml/rss/all.xml',
        category: 'general'
      },
      {
        name: 'The Guardian World',
        url: 'https://www.theguardian.com/world/rss',
        category: 'general'
      },
      {
        name: 'Bloomberg Technology',
        url: 'https://feeds.bloomberg.com/technology/news.rss',
        category: 'technology'
      },
      {
        name: 'Financial Times',
        url: 'https://www.ft.com/?format=rss',
        category: 'business'
      },
      {
        name: 'CNN World',
        url: 'http://rss.cnn.com/rss/edition.rss',
        category: 'general'
      },
      {
        name: 'NBC News',
        url: 'https://feeds.nbcnews.com/nbcnews/public/news',
        category: 'general'
      },
      {
        name: 'ABC News',
        url: 'https://abcnews.go.com/abcnews/topstories',
        category: 'general'
      }
    ];
  }

  // Custom RSS parser that works in browser
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
      
      const items = xmlDoc.getElementsByTagName('item');
      const articles = [];
      
      for (let i = 0; i < Math.min(items.length, 10); i++) {
        const item = items[i];
        
        const title = item.getElementsByTagName('title')[0]?.textContent || '';
        const link = item.getElementsByTagName('link')[0]?.textContent || '';
        const description = item.getElementsByTagName('description')[0]?.textContent || '';
        const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || '';
        const content = item.getElementsByTagName('content:encoded')[0]?.textContent || '';
        
        if (title && link && title.length > 10) {
          articles.push({
            title: this.cleanText(title),
            content: this.cleanText(description) || this.cleanText(content) || this.cleanText(title),
            url: link,
            source: sourceName,
            timestamp: new Date(pubDate || Date.now()),
            type: 'news'
          });
        }
      }
      
      console.log(`✅ Parsed ${articles.length} articles from ${sourceName}`);
      return articles;
      
    } catch (error) {
      console.error(`❌ Error parsing RSS for ${sourceName}:`, error);
      return [];
    }
  }

  // Clean text from HTML tags and extra spaces
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
      .replace(/\s+/g, ' ') // Replace multiple spaces
      .trim()
      .substring(0, 500); // Limit length
  }

  static async scrapeRSSFeed(feedUrl, sourceName) {
    try {
      console.log(`📡 Fetching RSS: ${sourceName}`);
      
      // Use CORS proxy
      const proxyUrl = this.getCorsProxy(feedUrl);
      
      const response = await axios.get(proxyUrl, {
        timeout: 15000,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Extract the actual RSS content from proxy response
      const rssContent = response.data.contents;
      
      if (!rssContent) {
        console.error(`❌ No content received from ${sourceName}`);
        return [];
      }
      
      const articles = this.parseRSS(rssContent, sourceName);
      console.log(`✅ Found ${articles.length} real articles from ${sourceName}`);
      return articles;
      
    } catch (error) {
      console.error(`❌ Error fetching RSS from ${sourceName}:`, error.message);
      
      // Fallback: Try direct fetch (might work for some feeds)
      if (error.message.includes('Network Error') || error.message.includes('CORS')) {
        console.log(`🔄 Trying direct fetch for ${sourceName}...`);
        return await this.tryDirectFetch(feedUrl, sourceName);
      }
      
      return [];
    }
  }

  // Fallback direct fetch method
  static async tryDirectFetch(feedUrl, sourceName) {
    try {
      // Use fetch API which might handle some CORS better
      const response = await fetch(feedUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      return this.parseRSS(text, sourceName);
      
    } catch (error) {
      console.error(`❌ Direct fetch also failed for ${sourceName}:`, error.message);
      return [];
    }
  }

  static async scrapeAllRSSFeeds() {
    const feeds = this.getRSSFeeds();
    const allArticles = [];
    
    console.log(`🔄 Starting to scrape ${feeds.length} RSS feeds...`);
    
    for (const feed of feeds) {
      try {
        console.log(`📰 Processing: ${feed.name}`);
        const articles = await this.scrapeRSSFeed(feed.url, feed.name);
        
        if (articles.length > 0) {
          allArticles.push(...articles);
          console.log(`✅ Successfully got ${articles.length} articles from ${feed.name}`);
        } else {
          console.log(`⚠️ No articles found from ${feed.name}`);
        }
        
        // Respectful delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Failed to fetch ${feed.name}:`, error.message);
      }
    }
    
    console.log(`🎯 Total RSS articles found: ${allArticles.length}`);
    
    // Remove duplicates based on title
    const uniqueArticles = allArticles.filter((article, index, self) =>
      index === self.findIndex(a => a.title === article.title)
    );
    
    console.log(`🎯 Unique articles after deduplication: ${uniqueArticles.length}`);
    
    // Sort by timestamp (newest first)
    uniqueArticles.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return uniqueArticles.slice(0, 50); // Limit to 50 articles
  }

  // Alternative: Use JSON feeds (no CORS issues)
  static getJSONFeeds() {
    return [
      {
        name: 'Reddit Programming',
        url: 'https://www.reddit.com/r/programming.json',
        category: 'technology'
      },
      {
        name: 'Reddit Technology',
        url: 'https://www.reddit.com/r/technology.json',
        category: 'technology'
      },
      {
        name: 'Reddit World News',
        url: 'https://www.reddit.com/r/worldnews.json',
        category: 'general'
      }
    ];
  }

  static async scrapeJSONFeed(feedUrl, sourceName) {
    try {
      console.log(`📡 Fetching JSON: ${sourceName}`);
      
      const response = await axios.get(feedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'X-Bot-Manager/1.0'
        }
      });
      
      const data = response.data;
      const articles = [];
      
      if (data.data && data.data.children) {
        data.data.children.slice(0, 10).forEach(child => {
          const post = child.data;
          if (post.title && post.url) {
            articles.push({
              title: this.cleanText(post.title),
              content: this.cleanText(post.selftext) || this.cleanText(post.title),
              url: post.url,
              source: sourceName,
              timestamp: new Date(post.created_utc * 1000),
              type: 'news'
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

  // Combined method that tries both RSS and JSON
  static async scrapeAllFeeds() {
    console.log('🚀 Starting combined feed scraping...');
    
    const rssArticles = await this.scrapeAllRSSFeeds();
    const jsonArticles = await this.scrapeAllJSONFeeds();
    
    const allArticles = [...rssArticles, ...jsonArticles];
    
    console.log(`🎯 Total articles from all sources: ${allArticles.length}`);
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
}