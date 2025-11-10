import axios from 'axios';

export interface NewsArticle {
  title: string;
  content: string;
  url: string;
  source: string;
  timestamp: Date;
  type: 'news';
  country?: string;
  category?: string;
  language?: string;
  sourceReliability?: number;
}

export interface RSSFeed {
  name: string;
  url: string;
  category: string;
  country: string;
  language: string;
  reliability: number;
  priority: number;
}

export class NewsScraper {
  // For React Native, we'll use a simpler approach without DOM parsing
  // We'll focus on JSON APIs and simpler RSS parsing

  static getRSSFeeds(): RSSFeed[] {
    return [
      // High Reliability Sources (JSON APIs where possible)
      {
        name: 'BBC News',
        url: 'https://feeds.bbci.co.uk/news/rss.xml',
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
        name: 'DW News (Germany)',
        url: 'https://rss.dw.com/rdf/rss-en-all',
        category: 'europe',
        country: 'Germany',
        language: 'english',
        reliability: 8,
        priority: 2
      }
    ].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.reliability - a.reliability;
    });
  }

  // Simple text cleaner for React Native
  static cleanText(text: string): string {
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
      .replace(/^\s+|\s+$/g, '') // Trim
      .substring(0, 500); // Limit content length
  }

  // Simple RSS parser for React Native (without DOM)
  static parseSimpleRSS(xmlText: string, sourceName: string): NewsArticle[] {
    try {
      const articles: NewsArticle[] = [];
      
      // Simple regex-based parsing for React Native
      const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/g) || 
                         xmlText.match(/<entry>[\s\S]*?<\/entry>/g) || [];

      for (const item of itemMatches.slice(0, 10)) { // Limit to 10 items
        try {
          // Extract title
          const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
          const title = titleMatch ? this.cleanText(titleMatch[1]) : '';

          // Extract description/content
          const descMatch = item.match(/<description>([\s\S]*?)<\/description>/i) ||
                           item.match(/<content>([\s\S]*?)<\/content>/i) ||
                           item.match(/<summary>([\s\S]*?)<\/summary>/i);
          const content = descMatch ? this.cleanText(descMatch[1]) : title;

          // Extract link
          const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i) ||
                           item.match(/<link[^>]*href="([^"]*)"[^>]*>/i);
          const url = linkMatch ? linkMatch[1] : `https://${sourceName.toLowerCase().replace(/\s+/g, '')}.com`;

          // Skip invalid articles
          if (!title || title.trim().length < 10) continue;
          if (title.includes('<?xml') || title.includes('<rss')) continue;
          if (content.length < 20) continue;

          const article: NewsArticle = {
            title: title,
            content: content,
            url: url,
            source: sourceName,
            timestamp: new Date(),
            type: 'news'
          };

          articles.push(article);

        } catch (itemError) {
          console.warn(`Skipping invalid item from ${sourceName}:`, itemError);
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

  // CORS proxy for React Native
  static getCorsProxy(url: string): string {
    const proxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    ];

    return proxies[0]; // Use allorigins.win as primary
  }

  // Enhanced RSS feed scraper for React Native
  static async scrapeRSSFeed(feedUrl: string, sourceName: string, options: { maxRetries?: number } = {}): Promise<NewsArticle[]> {
    const { maxRetries = 2 } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📡 [Attempt ${attempt}] Fetching RSS: ${sourceName}`);

        const proxyUrl = this.getCorsProxy(feedUrl);
        
        const response = await axios.get(proxyUrl, {
          timeout: 15000,
          headers: {
            'Accept': 'application/json, application/xml, text/xml',
            'User-Agent': 'X-Bot-Mobile/1.0'
          }
        });

        let rssContent: string;
        if (response.data && typeof response.data === 'object') {
          rssContent = response.data.contents || response.data.content || JSON.stringify(response.data);
        } else {
          rssContent = response.data;
        }

        if (!rssContent) {
          console.error(`❌ No content received from ${sourceName}`);
          continue;
        }

        if (typeof rssContent !== 'string') {
          rssContent = String(rssContent);
        }

        const articles = this.parseSimpleRSS(rssContent, sourceName);

        if (articles.length > 0) {
          console.log(`✅ Successfully fetched ${articles.length} articles from ${sourceName}`);
          return articles;
        } else {
          console.warn(`⚠️ No valid articles parsed from ${sourceName}`);
          break;
        }

      } catch (error: any) {
        console.error(`❌ Attempt ${attempt} failed for ${sourceName}:`, error.message);

        if (attempt === maxRetries) {
          console.log(`🔄 All attempts failed for ${sourceName}`);
        }

        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    return [];
  }

  // JSON feeds (Reddit) - works well in React Native
  static getJSONFeeds(): RSSFeed[] {
    return [
      {
        name: 'Reddit World News',
        url: 'https://www.reddit.com/r/worldnews.json',
        category: 'general',
        country: 'International',
        language: 'english',
        reliability: 8,
        priority: 1
      },
      {
        name: 'Reddit Technology',
        url: 'https://www.reddit.com/r/technology.json',
        category: 'technology',
        country: 'International',
        language: 'english',
        reliability: 7,
        priority: 2
      }
    ];
  }

  static async scrapeJSONFeed(feedUrl: string, sourceName: string): Promise<NewsArticle[]> {
    try {
      console.log(`📡 Fetching JSON: ${sourceName}`);

      const response = await axios.get(feedUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'X-Bot-Mobile/1.0'
        }
      });

      const data = response.data;
      const articles: NewsArticle[] = [];

      if (data.data && data.data.children) {
        data.data.children.slice(0, 10).forEach((child: any) => {
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

    } catch (error: any) {
      console.error(`❌ Error fetching JSON from ${sourceName}:`, error.message);
      return [];
    }
  }

  // Enhanced combined scraping method for mobile
  static async scrapeAllFeeds(options: { maxFeeds?: number, testMode?: boolean } = {}): Promise<NewsArticle[]> {
    const { maxFeeds = 8, testMode = false } = options;

    console.log('🚀 Starting mobile feed scraping...');

    let rssArticles: NewsArticle[] = [];
    let jsonArticles: NewsArticle[] = [];

    try {
      // Scrape JSON feeds first (more reliable in mobile)
      const jsonFeeds = this.getJSONFeeds();
      for (const feed of jsonFeeds) {
        const articles = await this.scrapeJSONFeed(feed.url, feed.name);
        const articlesWithMeta = articles.map(article => ({
          ...article,
          country: feed.country,
          category: feed.category,
          language: feed.language,
          sourceReliability: feed.reliability
        }));
        rssArticles.push(...articlesWithMeta);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('❌ JSON scraping failed:', error);
    }

    try {
      // Then scrape RSS feeds
      const rssFeeds = this.getRSSFeeds().slice(0, maxFeeds);
      for (const feed of rssFeeds) {
        const articles = await this.scrapeRSSFeed(feed.url, feed.name, { maxRetries: 1 });
        const articlesWithMeta = articles.map(article => ({
          ...article,
          country: feed.country,
          category: feed.category,
          language: feed.language,
          sourceReliability: feed.reliability
        }));
        jsonArticles.push(...articlesWithMeta);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (error) {
      console.error('❌ RSS scraping failed:', error);
    }

    const allArticles = [...rssArticles, ...jsonArticles];

    console.log(`🎯 Total articles from all sources: ${allArticles.length}`);

    // Remove duplicates
    const uniqueArticles = this.removeDuplicates(allArticles);
    console.log(`🎯 Unique articles after deduplication: ${uniqueArticles.length}`);

    // Sort by timestamp
    uniqueArticles.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return uniqueArticles;
  }

  // Enhanced duplicate removal
  static removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set();
    return articles.filter(article => {
      const key = `${article.title.toLowerCase().trim()}_${article.source}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Test method for mobile
  static async testSourceReliability(): Promise<any[]> {
    console.log('🧪 Testing source reliability for mobile...');
    
    const testFeeds = [...this.getJSONFeeds(), ...this.getRSSFeeds().slice(0, 3)];
    const results = [];

    for (const feed of testFeeds) {
      try {
        let articles: NewsArticle[] = [];
        
        if (feed.url.includes('reddit.com')) {
          articles = await this.scrapeJSONFeed(feed.url, feed.name);
        } else {
          articles = await this.scrapeRSSFeed(feed.url, feed.name, { maxRetries: 1 });
        }
        
        results.push({
          name: feed.name,
          url: feed.url,
          success: articles.length > 0,
          articlesFound: articles.length,
          reliability: feed.reliability
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
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

    console.log('📊 Mobile reliability test results:', results);
    return results;
  }
}