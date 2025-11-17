import axios from 'axios';

// Enhanced Twitter service with Essential tier support
export class TwitterService {
  static credentials = null;
  static accessLevel = 'Essential';

  static initializeClient(credentials) {
    if (!credentials) {
      throw new Error('Twitter credentials are required');
    }

    this.credentials = {
      consumerKey: credentials.consumerKey?.trim(),
      consumerSecret: credentials.consumerSecret?.trim(),
      accessToken: credentials.accessToken?.trim(),
      accessTokenSecret: credentials.accessTokenSecret?.trim()
    };

    // Validate credentials
    const validation = this.validateCredentials(this.credentials);
    if (!validation.isValid) {
      throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
    }

    console.log('🔑 Twitter client initialized for Essential tier');
  }

  static async makeRequest(action, data = {}) {
    if (!this.credentials) {
      throw new Error('Twitter client not initialized. Call initializeClient() first.');
    }

    const functionUrl = '/.netlify/functions/twitter-proxy';

    try {
      const response = await axios.post(functionUrl, {
        ...this.credentials,
        action,
        ...data
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.error || `Twitter API error for ${action}`);
      }

    } catch (error) {
      console.error(`❌ Twitter API request failed for ${action}:`, error.response?.data || error.message);
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Twitter API request timeout. Please try again.');
      }
      
      if (error.message.includes('Network Error')) {
        throw new Error('Network error: Cannot connect to Twitter API. Check your internet connection.');
      }
      
      throw error;
    }
  }

  static async testConnection() {
    try {
      console.log('🧪 Testing Twitter API connection...');
      
      const result = await this.makeRequest('test-connection');
      
      console.log('✅ Twitter API connection successful:', result.data);
      
      return {
        success: true,
        ...result.data,
        accessLevel: this.accessLevel
      };
      
    } catch (error) {
      console.error('❌ Twitter API connection test failed:', error.message);
      throw new Error(`Twitter API connection failed: ${error.message}`);
    }
  }

  static async getUserTweets(username, maxTweets = 5) {
    if (!username?.trim()) {
      throw new Error('Username is required to fetch tweets');
    }

    try {
      const cleanUsername = username.replace('@', '').trim();
      console.log(`🐦 Fetching tweets for user: @${cleanUsername}`);
      
      const result = await this.makeRequest('get-user-tweets', {
        username: cleanUsername,
        maxTweets: Math.min(maxTweets, 10) // Essential tier limit
      });

      const tweets = result.data?.tweets || [];
      const userInfo = result.data?.user;
      
      console.log(`✅ Found ${tweets.length} tweets from @${cleanUsername}`);

      return {
        user: userInfo,
        tweets: tweets.map(tweet => ({
          id: tweet.id,
          text: tweet.text,
          created_at: tweet.created_at,
          metrics: tweet.public_metrics || {},
          type: 'tweet',
          source: 'X/Twitter'
        })),
        meta: result.data?.meta
      };

    } catch (error) {
      console.error(`❌ Error fetching tweets for @${username}:`, error.message);
      throw new Error(`Failed to fetch tweets: ${error.message}`);
    }
  }

  static async getUserInfo(username) {
    if (!username?.trim()) {
      throw new Error('Username is required');
    }

    try {
      const cleanUsername = username.replace('@', '').trim();
      const result = await this.makeRequest('get-user-info', { username: cleanUsername });
      
      return result.data.user;
    } catch (error) {
      console.error(`❌ Error fetching user info for @${username}:`, error.message);
      throw new Error(`Failed to fetch user info: ${error.message}`);
    }
  }

  static async searchTweets(query, maxResults = 10) {
    if (!query?.trim()) {
      throw new Error('Search query is required');
    }

    try {
      const result = await this.makeRequest('search-tweets', {
        query,
        maxResults: Math.min(maxResults, 10) // Essential tier limit
      });

      return {
        tweets: result.data.tweets,
        meta: result.data.meta
      };
    } catch (error) {
      console.error(`❌ Error searching tweets:`, error.message);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  // Essential tier limitations info
  static getLimitations() {
    return {
      accessLevel: 'Essential (Free) Tier',
      capabilities: [
        'Read user profiles and tweets',
        'Search tweets',
        'Get user timelines',
        'Basic analytics'
      ],
      limitations: [
        'No posting tweets',
        'No retweeting/liking',
        'No following users',
        'Rate limited (500k tweets/month)',
        'Limited historical data access'
      ],
      rateLimits: {
        userLookup: '300 requests/15min',
        timeline: '1500 requests/15min',
        search: '450 requests/15min'
      }
    };
  }

  static validateCredentials(credentials) {
    const errors = [];
    
    if (!credentials?.consumerKey?.trim()) {
      errors.push('Consumer Key is required');
    }
    
    if (!credentials?.consumerSecret?.trim()) {
      errors.push('Consumer Secret is required');
    }
    
    if (!credentials?.accessToken?.trim()) {
      errors.push('Access Token is required');
    }
    
    if (!credentials?.accessTokenSecret?.trim()) {
      errors.push('Access Token Secret is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static clearCredentials() {
    this.credentials = null;
    console.log('🔑 Twitter credentials cleared');
  }
}