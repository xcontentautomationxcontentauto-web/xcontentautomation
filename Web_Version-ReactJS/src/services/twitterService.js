import axios from 'axios';

// Enhanced proxy selection that works in all environments
const getProxyUrl = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // Server-side (Netlify Functions) - use direct URL
    return 'http://localhost:8888/.netlify/functions/twitter-proxy';
  }

  // Browser environment
  const isLocal = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';

  const isNetlify = window.location.hostname.includes('netlify.app');

  // Always prefer Netlify Functions in both environments
  if (isNetlify || !isLocal) {
    return '/.netlify/functions/twitter-proxy';
  }

  // Local development - use Netlify dev server
  if (isLocal) {
    return 'http://localhost:8888/.netlify/functions/twitter-proxy';
  }

  // Fallback
  return '/.netlify/functions/twitter-proxy';
};

// Enhanced error handling and retry logic
const withRetry = async (fn, maxRetries = 2, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
      console.log(`🔄 Retrying... (${attempt}/${maxRetries})`);
    }
  }
};

export class TwitterService {
  static credentials = null;

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
    if (!this.credentials.consumerKey || !this.credentials.consumerSecret) {
      throw new Error('Consumer Key and Consumer Secret are required');
    }

    console.log('🔑 Twitter client initialized successfully');
  }

  static async makeProxyRequest(action, data = {}) {
    if (!this.credentials) {
      throw new Error('Twitter client not initialized. Call initializeClient() first.');
    }

    const proxyUrl = getProxyUrl();
    
    console.log(`🔍 Making Twitter request: ${action}`, { 
      proxyUrl: proxyUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'), // Hide credentials in logs
      action,
      username: data.username 
    });

    return withRetry(async () => {
      try {
        const requestData = {
          ...this.credentials,
          action,
          ...data
        };

        const response = await axios.post(proxyUrl, requestData, {
          timeout: 20000, // Increased timeout
          headers: {
            'Content-Type': 'application/json',
          },
          validateStatus: (status) => status < 500 // Don't throw on 4xx errors
        });

        console.log(`📡 Proxy response for ${action}:`, {
          status: response.status,
          success: response.data?.success
        });

        if (response.data?.success) {
          return response.data;
        }

        // Handle different error scenarios
        if (response.status === 400) {
          const errorMsg = response.data?.error || 'Bad request';
          throw new Error(`Twitter API error: ${errorMsg}`);
        }

        if (response.status === 401) {
          throw new Error('Invalid Twitter API credentials. Please check your keys and tokens.');
        }

        if (response.status === 403) {
          throw new Error('Twitter API access forbidden. Check your app permissions.');
        }

        if (response.status === 404) {
          throw new Error('Twitter user or resource not found.');
        }

        if (response.status === 429) {
          throw new Error('Twitter API rate limit exceeded. Please try again later.');
        }

        throw new Error(response.data?.error || `HTTP ${response.status}: ${response.statusText}`);

      } catch (error) {
        console.error(`❌ Proxy request failed for ${action}:`, {
          error: error.message,
          url: proxyUrl,
          code: error.code
        });

        // Enhanced error classification
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Twitter proxy service unavailable. Please ensure Netlify Functions are running.');
        }

        if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
          throw new Error('Network connection failed. Please check your internet connection.');
        }

        if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
          throw new Error('Twitter API request timed out. Please try again.');
        }

        // Re-throw with better context
        if (error.response) {
          // Server responded with error status
          const status = error.response.status;
          const message = error.response.data?.error || error.message;
          
          if (status === 401) {
            throw new Error(`Authentication failed: ${message}`);
          } else if (status === 404) {
            throw new Error(`Twitter proxy endpoint not found. Please deploy Netlify Functions.`);
          } else {
            throw new Error(`Twitter API error (${status}): ${message}`);
          }
        }

        // Original error message is usually descriptive enough
        throw error;
      }
    });
  }

  static async testConnection() {
    try {
      console.log('🧪 Testing Twitter API connection...');
      
      const result = await this.makeProxyRequest('test-connection');
      
      console.log('✅ Twitter API connection successful:', {
        username: result.data.username,
        id: result.data.id
      });
      
      return {
        success: true,
        username: result.data.username,
        id: result.data.id,
        name: result.data.name
      };
      
    } catch (error) {
      console.error('❌ Twitter API connection test failed:', error.message);
      
      // Provide more user-friendly error messages
      if (error.message.includes('credentials') || error.message.includes('authenticate')) {
        throw new Error('Invalid Twitter API credentials. Please check your Consumer Key, Consumer Secret, Access Token, and Access Token Secret.');
      }
      
      if (error.message.includes('rate limit')) {
        throw new Error('Twitter API rate limit exceeded. Please wait a few minutes and try again.');
      }
      
      if (error.message.includes('Network Error') || error.message.includes('ECONNREFUSED')) {
        throw new Error('Cannot connect to Twitter API. Please check your internet connection and ensure the proxy service is running.');
      }
      
      throw new Error(`Twitter API connection failed: ${error.message}`);
    }
  }

  static async getUserTweets(username, maxTweets = 5) {
    if (!username || username.trim() === '') {
      throw new Error('Username is required to fetch tweets');
    }

    try {
      const cleanUsername = username.replace('@', '').trim();
      console.log(`🐦 Fetching tweets for user: @${cleanUsername}`);
      
      const result = await this.makeProxyRequest('get-user-tweets', { 
        username: cleanUsername,
        maxTweets 
      });

      const tweets = result.data?.tweets || [];
      const userData = result.data?.user;
      
      console.log(`✅ Found ${tweets.length} tweets from @${cleanUsername}`, {
        userExists: !!userData,
        tweetCount: tweets.length
      });

      if (!userData) {
        throw new Error(`Twitter user @${cleanUsername} not found or account is private`);
      }

      return tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: userData.id,
        created_at: tweet.created_at,
        source: 'X/Twitter',
        type: 'tweet',
        metrics: tweet.public_metrics || {}
      }));

    } catch (error) {
      console.error(`❌ Error fetching tweets for @${username}:`, error.message);
      
      // Enhanced error messages for common scenarios
      if (error.message.includes('not found')) {
        throw new Error(`Twitter user @${username} not found. Please check the username spelling.`);
      }
      
      if (error.message.includes('private')) {
        throw new Error(`Cannot access tweets from @${username}. The account may be private or suspended.`);
      }
      
      if (error.message.includes('credentials')) {
        throw new Error(`Authentication failed while fetching tweets for @${username}. Please verify your Twitter API credentials.`);
      }
      
      throw new Error(`Failed to fetch tweets for @${username}: ${error.message}`);
    }
  }

  static async getFollowedUsersTweets(sourceAccount, maxTweets = 5) {
    return this.getUserTweets(sourceAccount, maxTweets);
  }

  // Utility method to validate credentials format
  static validateCredentials(credentials) {
    const errors = [];
    
    if (!credentials?.consumerKey?.trim()) {
      errors.push('Consumer Key is required');
    } else if (credentials.consumerKey.length < 10) {
      errors.push('Consumer Key appears to be invalid (too short)');
    }
    
    if (!credentials?.consumerSecret?.trim()) {
      errors.push('Consumer Secret is required');
    } else if (credentials.consumerSecret.length < 10) {
      errors.push('Consumer Secret appears to be invalid (too short)');
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

  // Method to clear credentials (useful for logout)
  static clearCredentials() {
    this.credentials = null;
    console.log('🔑 Twitter credentials cleared');
  }
}