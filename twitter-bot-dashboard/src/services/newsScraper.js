import axios from 'axios';

export class NewsScraper {
  // CORS Proxy URL (free service)
  static getCorsProxy(url) {
    // Use a free CORS proxy service
    return `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  }

  // Enhanced RSS Feeds with international coverage
  static getRSSFeeds() {
    return [
      // Middle East Sources
      {
        name: 'Al Jazeera English',
        url: 'https://www.aljazeera.com/xml/rss/all.xml',
        category: 'middle-east',
        country: 'Qatar',
        language: 'english'
      },
      {
        name: 'Press TV (Iran)',
        url: 'https://www.presstv.ir/RSS/Main/1',
        category: 'middle-east',
        country: 'Iran',
        language: 'english'
      },
      {
        name: 'Tehran Times',
        url: 'https://www.tehrantimes.com/rss',
        category: 'middle-east',
        country: 'Iran',
        language: 'english'
      },
      {
        name: 'Arab News (Saudi Arabia)',
        url: 'https://www.arabnews.com/rss.xml',
        category: 'middle-east',
        country: 'Saudi Arabia',
        language: 'english'
      },
      {
        name: 'Al Arabiya English',
        url: 'https://english.alarabiya.net/rss',
        category: 'middle-east',
        country: 'UAE',
        language: 'english'
      },
      {
        name: 'Jerusalem Post',
        url: 'https://www.jpost.com/Rss/RssFeedsHeadlines',
        category: 'middle-east',
        country: 'Israel',
        language: 'english'
      },
      {
        name: 'Haaretz English',
        url: 'https://www.haaretz.com/rss',
        category: 'middle-east',
        country: 'Israel',
        language: 'english'
      },
      {
        name: 'Daily Sabah (Turkey)',
        url: 'https://www.dailysabah.com/rss',
        category: 'middle-east',
        country: 'Turkey',
        language: 'english'
      },
      {
        name: 'Hurriyet Daily News (Turkey)',
        url: 'https://www.hurriyetdailynews.com/rss',
        category: 'middle-east',
        country: 'Turkey',
        language: 'english'
      },

      // Asian Sources
      {
        name: 'China Daily',
        url: 'https://www.chinadaily.com.cn/rss/world_rss.xml',
        category: 'asia',
        country: 'China',
        language: 'english'
      },
      {
        name: 'Global Times (China)',
        url: 'https://www.globaltimes.cn/rss/world.xml',
        category: 'asia',
        country: 'China',
        language: 'english'
      },
      {
        name: 'Xinhua News (China)',
        url: 'http://www.xinhuanet.com/english/rss/worldrss.xml',
        category: 'asia',
        country: 'China',
        language: 'english'
      },
      {
        name: 'The Hindu (India)',
        url: 'https://www.thehindu.com/news/international/feeder/default.rss',
        category: 'asia',
        country: 'India',
        language: 'english'
      },
      {
        name: 'Times of India - World',
        url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms',
        category: 'asia',
        country: 'India',
        language: 'english'
      },
      {
        name: 'Japan Times',
        url: 'https://www.japantimes.co.jp/feed',
        category: 'asia',
        country: 'Japan',
        language: 'english'
      },
      {
        name: 'Korean Times',
        url: 'https://www.koreatimes.co.kr/rss/202_n.xml',
        category: 'asia',
        country: 'South Korea',
        language: 'english'
      },

      // African Sources
      {
        name: 'Premium Times (Nigeria)',
        url: 'https://www.premiumtimesng.com/feed',
        category: 'africa',
        country: 'Nigeria',
        language: 'english'
      },
      {
        name: 'Daily Nation (Kenya)',
        url: 'https://www.nation.co.ke/rss',
        category: 'africa',
        country: 'Kenya',
        language: 'english'
      },
      {
        name: 'News24 (South Africa)',
        url: 'https://www.news24.com/rss',
        category: 'africa',
        country: 'South Africa',
        language: 'english'
      },
      {
        name: 'Egypt Today',
        url: 'https://www.egypttoday.com/rss',
        category: 'africa',
        country: 'Egypt',
        language: 'english'
      },

      // European Sources
      {
        name: 'BBC News',
        url: 'http://feeds.bbci.co.uk/news/rss.xml',
        category: 'europe',
        country: 'UK',
        language: 'english'
      },
      {
        name: 'The Guardian World',
        url: 'https://www.theguardian.com/world/rss',
        category: 'europe',
        country: 'UK',
        language: 'english'
      },
      {
        name: 'Reuters World News',
        url: 'https://www.reutersagency.com/feed/?best-topics=world-news&post_type=best',
        category: 'europe',
        country: 'UK',
        language: 'english'
      },
      {
        name: 'DW News (Germany)',
        url: 'https://rss.dw.com/rdf/rss-en-all',
        category: 'europe',
        country: 'Germany',
        language: 'english'
      },
      {
        name: 'France 24 English',
        url: 'https://www.france24.com/en/rss',
        category: 'europe',
        country: 'France',
        language: 'english'
      },
      {
        name: 'EU Observer',
        url: 'https://euobserver.com/news/rss',
        category: 'europe',
        country: 'EU',
        language: 'english'
      },

      // Americas Sources
      {
        name: 'CNN World',
        url: 'http://rss.cnn.com/rss/edition.rss',
        category: 'americas',
        country: 'USA',
        language: 'english'
      },
      {
        name: 'NBC News World',
        url: 'https://feeds.nbcnews.com/nbcnews/public/world',
        category: 'americas',
        country: 'USA',
        language: 'english'
      },
      {
        name: 'ABC News World',
        url: 'https://abcnews.go.com/abcnews/internationalheadlines',
        category: 'americas',
        country: 'USA',
        language: 'english'
      },
      {
        name: 'CBC News World',
        url: 'https://rss.cbc.ca/lineup/world.xml',
        category: 'americas',
        country: 'Canada',
        language: 'english'
      },
      {
        name: 'Buenos Aires Herald',
        url: 'https://buenosairesherald.com/rss',
        category: 'americas',
        country: 'Argentina',
        language: 'english'
      },

      // Business & Technology
      {
        name: 'Reuters Business',
        url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best',
        category: 'business',
        country: 'International',
        language: 'english'
      },
      {
        name: 'Bloomberg Technology',
        url: 'https://feeds.bloomberg.com/technology/news.rss',
        category: 'technology',
        country: 'USA',
        language: 'english'
      },
      {
        name: 'Financial Times',
        url: 'https://www.ft.com/?format=rss',
        category: 'business',
        country: 'UK',
        language: 'english'
      },
      {
        name: 'CNBC World News',
        url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html',
        category: 'business',
        country: 'USA',
        language: 'english'
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

      for (let i = 0; i < Math.min(items.length, 15); i++) {
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
        timeout: 20000, // Increased timeout for international sources
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
        console.log(`📰 Processing: ${feed.name} (${feed.country})`);
        const articles = await this.scrapeRSSFeed(feed.url, feed.name);

        if (articles.length > 0) {
          // Add country and category info to articles
          const articlesWithMeta = articles.map(article => ({
            ...article,
            country: feed.country,
            category: feed.category,
            language: feed.language
          }));
          allArticles.push(...articlesWithMeta);
          console.log(`✅ Successfully got ${articles.length} articles from ${feed.name}`);
        } else {
          console.log(`⚠️ No articles found from ${feed.name}`);
        }

        // Respectful delay between requests
        await new Promise(resolve => setTimeout(resolve, 1500));

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

    return uniqueArticles.slice(0, 100); // Increased limit for more content
  }

  // Alternative: Use JSON feeds (no CORS issues)
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
      },
      {
        name: 'Reddit International News',
        url: 'https://www.reddit.com/r/InternationalNews.json',
        category: 'general',
        country: 'International',
        language: 'english'
      },
      {
        name: 'Reddit Technology',
        url: 'https://www.reddit.com/r/technology.json',
        category: 'technology',
        country: 'International',
        language: 'english'
      },
      {
        name: 'Reddit Business',
        url: 'https://www.reddit.com/r/business.json',
        category: 'business',
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
        data.data.children.slice(0, 15).forEach(child => {
          const post = child.data;
          if (post.title && post.url) {
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

  // Combined method that tries both RSS and JSON
  static async scrapeAllFeeds() {
    console.log('🚀 Starting global feed scraping...');

    const rssArticles = await this.scrapeAllRSSFeeds();
    const jsonArticles = await this.scrapeAllJSONFeeds();

    const allArticles = [...rssArticles, ...jsonArticles];

    console.log(`🎯 Total articles from all sources: ${allArticles.length}`);

    // Log statistics by region
    const stats = {
      total: allArticles.length,
      byRegion: {}
    };

    allArticles.forEach(article => {
      const region = article.category || 'unknown';
      stats.byRegion[region] = (stats.byRegion[region] || 0) + 1;
    });

    console.log('📊 Regional distribution:', stats.byRegion);

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

  // Method to get sources by region
  static getSourcesByRegion(region) {
    return this.getRSSFeeds().filter(source => source.category === region);
  }

  // Method to get sources by country
  static getSourcesByCountry(country) {
    return this.getRSSFeeds().filter(source => source.country === country);
  }
}