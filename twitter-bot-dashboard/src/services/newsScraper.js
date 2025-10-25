import axios from 'axios';
import * as cheerio from 'cheerio';

export class NewsScraper {
  static async scrapeWebsite(url) {
    try {
      console.log(`🔍 Scraping: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 15000,
        // Remove unsafe headers - browser will set appropriate headers automatically
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });
      
      const $ = cheerio.load(response.data);
      const articles = [];
      
      // BBC News scraping
      if (url.includes('bbc.com') || url.includes('bbcedge.org')) {
        $('a[href*="/news/"]').each((i, element) => {
          const title = $(element).text().trim();
          const link = $(element).attr('href');
          if (title && link && title.length > 30 && !title.includes('BBC') && !title.includes('Homepage')) {
            const fullUrl = link.startsWith('http') ? link : `https://www.bbc.com${link}`;
            articles.push({
              title,
              url: fullUrl,
              source: 'BBC News',
              timestamp: new Date(),
              content: title
            });
          }
        });
      }
      
      // Reuters scraping
      else if (url.includes('reuters.com')) {
        $('a[data-testid*="Heading"], h2 a, h3 a').each((i, element) => {
          const title = $(element).text().trim();
          const link = $(element).attr('href');
          if (title && link && title.length > 30) {
            const fullUrl = link.startsWith('http') ? link : `https://www.reuters.com${link}`;
            articles.push({
              title,
              url: fullUrl,
              source: 'Reuters',
              timestamp: new Date(),
              content: title
            });
          }
        });
      }
      
      // CNBC scraping
      else if (url.includes('cnbc.com')) {
        $('a.Card-title, .Headline a').each((i, element) => {
          const title = $(element).text().trim();
          const link = $(element).attr('href');
          if (title && link && title.length > 30) {
            const fullUrl = link.startsWith('http') ? link : `https://www.cnbc.com${link}`;
            articles.push({
              title,
              url: fullUrl,
              source: 'CNBC',
              timestamp: new Date(),
              content: title
            });
          }
        });
      }
      
      // Generic news scraping
      else {
        $('h1 a, h2 a, h3 a, .headline a, .title a').each((i, element) => {
          const title = $(element).text().trim();
          const link = $(element).attr('href');
          if (title && link && title.length > 30 && title.length < 200) {
            const fullUrl = link.startsWith('http') ? link : new URL(link, url).href;
            articles.push({
              title,
              url: fullUrl,
              source: new URL(url).hostname.replace('www.', ''),
              timestamp: new Date(),
              content: title
            });
          }
        });
      }
      
      // Remove duplicates based on title
      const uniqueArticles = articles.filter((article, index, self) =>
        index === self.findIndex(a => a.title === article.title)
      );
      
      console.log(`✅ Found ${uniqueArticles.length} real articles from ${url}`);
      return uniqueArticles.slice(0, 15);
      
    } catch (error) {
      console.error(`❌ Error scraping ${url}:`, error.message);
      throw new Error(`Failed to scrape ${url}: ${error.message}`);
    }
  }

  static async scrapeAllWebsites(urls) {
    const allArticles = [];
    
    for (const url of urls) {
      try {
        console.log(`📰 Scraping: ${url}`);
        const articles = await this.scrapeWebsite(url);
        allArticles.push(...articles);
        
        // Respectful delay between requests
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`❌ Failed to scrape ${url}:`, error.message);
      }
    }
    
    console.log(`🎯 Total real articles found: ${allArticles.length}`);
    return allArticles;
  }
}