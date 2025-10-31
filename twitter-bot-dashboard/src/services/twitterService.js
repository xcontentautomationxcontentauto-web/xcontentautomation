import axios from 'axios';

// Smart URL detection that works everywhere
const getProxyUrl = () => {
  // Check if we're in development with separate servers
  if (window.location.hostname === 'localhost' && window.location.port === '3000') {
    return 'http://localhost:9999/.netlify/functions/twitter-proxy';
  }
  // Check if we're in development with Vite default port
  else if (window.location.hostname === 'localhost' && window.location.port === '5173') {
    return 'http://localhost:9999/.netlify/functions/twitter-proxy';
  }
  // Production on Netlify
  else if (window.location.hostname === 'xcontentautomation.netlify.app') {
    return '/.netlify/functions/twitter-proxy';
  }
  // Default fallback
  else {
    return '/.netlify/functions/twitter-proxy';
  }
};

export class TwitterService {
  static credentials = null;

  static initializeClient(credentials) {
    this.credentials = {
      consumerKey: credentials.consumerKey?.trim(),
      consumerSecret: credentials.consumerSecret?.trim(),
      accessToken: credentials.accessToken?.trim(),
      accessTokenSecret: credentials.accessTokenSecret?.trim()
    };
    console.log('🔑 Twitter client initialized');
  }

  static async makeProxyRequest(action, data = {}) {
    if (!this.credentials) {
      throw new Error('Twitter client not initialized. Please enter your API credentials.');
    }

    try {
      const proxyUrl = getProxyUrl();
      console.log(`🔍 Making Twitter proxy request to: ${proxyUrl}`, { action });

      const response = await axios.post(proxyUrl, {
        ...this.credentials,
        action,
        ...data
      }, {
        timeout: 15000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Unknown proxy error');
      }

      return response.data;

    } catch (error) {
      console.error('❌ Twitter proxy request failed:', {
        action,
        error: error.response?.data || error.message,
        url: getProxyUrl()
      });
      
      let errorMessage = error.response?.data?.error || error.message;
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error') || error.response?.status === 404) {
        errorMessage = `Cannot connect to Twitter service. Make sure Netlify Functions are running: npx netlify functions:serve`;
      }
      
      if (error.response?.status === 401) {
        errorMessage = 'Invalid Twitter API credentials. Please check your Consumer Key, Consumer Secret, Access Token, and Access Token Secret.';
      }
      
      throw new Error(errorMessage);
    }
  }

  static async testConnection() {
    try {
      const result = await this.makeProxyRequest('test-connection');
      console.log('✅ Twitter API connection successful:', result.data);
      return {
        success: true,
        username: result.data.username,
        id: result.data.id,
        name: result.data.name
      };
    } catch (error) {
      console.error('❌ Twitter API connection failed:', error.message);
      throw new Error(`Twitter API connection failed: ${error.message}`);
    }
  }

  static async getUserTweets(username, maxTweets = 5) {
    try {
      const result = await this.makeProxyRequest('get-user-tweets', { 
        username
      });
      
      const tweets = result.data.tweets || [];
      console.log(`✅ Found ${tweets.length} tweets from ${username}`);

      return tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: result.data.user.id,
        created_at: tweet.created_at,
        source: 'X/Twitter',
        type: 'tweet',
        metrics: tweet.public_metrics
      }));

    } catch (error) {
      console.error('❌ Error fetching user tweets:', error.message);
      throw new Error(`Failed to fetch tweets for @${username}: ${error.message}`);
    }
  }

  static async getFollowedUsersTweets(sourceAccount, maxTweets = 5) {
    return this.getUserTweets(sourceAccount, maxTweets);
  }

  static async searchTweets(query, maxTweets = 5) {
    throw new Error('Search functionality not implemented yet');
  }
}