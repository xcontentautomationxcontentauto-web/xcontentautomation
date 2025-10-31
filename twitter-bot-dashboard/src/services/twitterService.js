import axios from 'axios';

// Smart proxy selection that works everywhere
const getProxyUrl = () => {
  const isLocal = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';
  
  const isNetlify = window.location.hostname.includes('netlify.app');
  
  // Check if Netlify function is available
  if (isNetlify) {
    return '/.netlify/functions/twitter-proxy';
  }
  
  // Local development - try different proxies
  if (isLocal) {
    // Option 1: Local Netlify Functions (if running)
    // Option 2: Public CORS proxy (fallback)
    // Option 3: Direct API with CORS extension (development only)
    return 'https://cors-anywhere.herokuapp.com/https://api.twitter.com/2';
  }
  
  // Default fallback
  return '/.netlify/functions/twitter-proxy';
};

export class TwitterService {
  static credentials = null;
  static useDirectAPI = false;

  static initializeClient(credentials) {
    this.credentials = {
      consumerKey: credentials.consumerKey?.trim(),
      consumerSecret: credentials.consumerSecret?.trim(),
      accessToken: credentials.accessToken?.trim(),
      accessTokenSecret: credentials.accessTokenSecret?.trim()
    };
    console.log('🔑 Twitter client initialized');
  }

  static async makeDirectTwitterRequest(endpoint, params = {}) {
    if (!this.credentials) {
      throw new Error('Twitter client not initialized');
    }

    try {
      // Use OAuth 1.0a for direct API calls (browser-compatible)
      const url = `https://api.twitter.com/2${endpoint}`;
      console.log(`🔍 Making direct Twitter request to: ${url}`);

      // For now, we'll use a simple fetch with CORS proxy
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/' + url;
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`, // Using bearer token as fallback
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('❌ Direct Twitter request failed:', error.message);
      throw new Error(`Twitter API request failed: ${error.message}`);
    }
  }

  static async makeProxyRequest(action, data = {}) {
    const proxyUrl = getProxyUrl();
    
    // If using direct API (local fallback)
    if (proxyUrl.includes('cors-anywhere') || proxyUrl.includes('api.twitter.com')) {
      return this.makeDirectRequest(action, data);
    }

    // Normal Netlify function request
    try {
      console.log(`🔍 Making proxy request to: ${proxyUrl}`, { action });

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
      console.error('❌ Proxy request failed:', {
        action,
        error: error.response?.data || error.message,
        url: proxyUrl
      });
      
      // Fallback to direct API if proxy fails
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED') {
        console.log('🔄 Falling back to direct API...');
        return this.makeDirectRequest(action, data);
      }
      
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(errorMessage);
    }
  }

  static async makeDirectRequest(action, data = {}) {
    console.log(`🔄 Using direct API fallback for: ${action}`);
    
    try {
      switch (action) {
        case 'test-connection':
          const user = await this.makeDirectTwitterRequest('/users/me');
          return {
            success: true,
            data: {
              username: user.data.username,
              id: user.data.id,
              name: user.data.name
            }
          };

        case 'get-user-tweets':
          const username = data.username.replace('@', '');
          const userData = await this.makeDirectTwitterRequest(`/users/by/username/${username}`);
          const tweets = await this.makeDirectTwitterRequest(`/users/${userData.data.id}/tweets`, {
            max_results: 5,
            'tweet.fields': 'created_at,public_metrics',
            exclude: 'retweets,replies'
          });
          
          return {
            success: true,
            data: {
              tweets: tweets.data || [],
              user: userData.data
            }
          };

        default:
          throw new Error(`Action ${action} not supported in direct mode`);
      }
    } catch (error) {
      throw new Error(`Direct API fallback failed: ${error.message}`);
    }
  }

  // ... rest of your methods remain exactly the same
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
}