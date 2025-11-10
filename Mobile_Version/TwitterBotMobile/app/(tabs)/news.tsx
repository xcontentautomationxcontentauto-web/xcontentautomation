import { NewsScraper, NewsArticle } from '../../services/newsScraper';

// Add these states to your component
const [scraping, setScraping] = useState(false);
const [scrapedArticles, setScrapedArticles] = useState<NewsArticle[]>([]);
const [scrapingStatus, setScrapingStatus] = useState('');

// Add these functions
const testScraping = async () => {
  if (!user) {
    Alert.alert('Error', 'Please sign in to test scraping');
    return;
  }

  setScraping(true);
  setScrapingStatus('Testing news sources...');

  try {
    const results = await NewsScraper.testSourceReliability();
    
    const successful = results.filter(r => r.success).length;
    const totalArticles = results.reduce((sum, r) => sum + r.articlesFound, 0);
    
    setScrapingStatus(`✅ Test completed: ${successful}/${results.length} sources working, ${totalArticles} total articles`);
    
    // Show detailed results
    Alert.alert(
      'Scraping Test Results',
      results.map(r => 
        `${r.success ? '✅' : '❌'} ${r.name}: ${r.articlesFound} articles`
      ).join('\n')
    );
    
  } catch (error: any) {
    setScrapingStatus(`❌ Test failed: ${error.message}`);
  } finally {
    setScraping(false);
  }
};

const scrapeNews = async () => {
  if (!user) {
    Alert.alert('Error', 'Please sign in to scrape news');
    return;
  }

  setScraping(true);
  setScrapingStatus('Scraping news from all sources...');

  try {
    const articles = await NewsScraper.scrapeAllFeeds({ maxFeeds: 6 });
    setScrapedArticles(articles);
    setScrapingStatus(`✅ Found ${articles.length} articles from news sources`);
    
    // Save to Firebase or process articles
    if (articles.length > 0) {
      // Here you would save to Firebase and process with AI
      Alert.alert('Success', `Found ${articles.length} articles ready for AI analysis`);
    }
    
  } catch (error: any) {
    setScrapingStatus(`❌ Scraping failed: ${error.message}`);
  } finally {
    setScraping(false);
  }
};