import axios from 'axios';
import OAuth from 'oauth-1.0a';

export class TwitterService {
  static client = null;
  static oauth = null;

  static initializeClient(credentials) {
    if (!credentials.consumerKey || !credentials.consumerSecret) {
      throw new Error('Missing Twitter API credentials');
    }

    // Store credentials for API calls
    this.client = {
      consumerKey: credentials.consumerKey,
      consumerSecret: credentials.consumerSecret,
      accessToken: credentials.accessToken,
      accessTokenSecret: credentials.accessTokenSecret
    };

    // Initialize OAuth 1.0a with browser-compatible crypto
    this.oauth = OAuth({
      consumer: {
        key: credentials.consumerKey,
        secret: credentials.consumerSecret
      },
      signature_method: 'HMAC-SHA1',
      hash_function: (base_string, key) => {
        // Browser-compatible HMAC-SHA1 implementation
        return this.browserHmacSha1(base_string, key);
      }
    });
  }

  // Browser-compatible HMAC-SHA1 implementation
  static async browserHmacSha1(base_string, key) {
    // Convert string to ArrayBuffer
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(base_string);

    // Import key for HMAC
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    // Sign the message
    const signature = await window.crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageData
    );

    // Convert ArrayBuffer to base64
    const signatureArray = new Uint8Array(signature);
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray));
    
    return signatureBase64;
  }

  static getAuthHeaders(url, method = 'GET') {
    if (!this.oauth || !this.client) {
      throw new Error('Twitter client not initialized');
    }

    const token = {
      key: this.client.accessToken,
      secret: this.client.accessTokenSecret
    };

    const requestData = {
      url: url,
      method: method
    };

    return this.oauth.toHeader(this.oauth.authorize(requestData, token));
  }

  static async makeTwitterRequest(url, method = 'GET', params = {}) {
    try {
      const headers = this.getAuthHeaders(url, method);
      
      const config = {
        method: method,
        url: url,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      };

      if (method === 'GET' && Object.keys(params).length > 0) {
        config.params = params;
      }

      console.log(`🔍 Making Twitter API request to: ${url}`);
      const response = await axios(config);
      
      return response.data;
    } catch (error) {
      console.error('❌ Twitter API request failed:', {
        url: url,
        method: method,
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      
      if (error.response?.status === 401) {
        throw new Error('Invalid Twitter API credentials. Please check your Consumer Key, Consumer Secret, Access Token, and Access Token Secret.');
      } else if (error.response?.status === 403) {
        throw new Error('Twitter API access forbidden. Please check your app permissions in the Twitter Developer Portal.');
      } else if (error.response?.status === 429) {
        throw new Error('Twitter API rate limit exceeded. Please try again later.');
      } else if (error.response?.data) {
        const twitterError = error.response.data;
        throw new Error(`Twitter API error: ${twitterError.detail || twitterError.title || 'Unknown error'}`);
      } else {
        throw new Error(`Twitter API request failed: ${error.message}`);
      }
    }
  }

  // ... rest of your methods remain the same
  static async getUserTweets(username, maxTweets = 10) {
    try {
      console.log(`🔍 Fetching tweets for user: ${username}`);

      // Get user ID first
      const userUrl = `https://api.twitter.com/2/users/by/username/${username.replace('@', '')}`;
      const userResponse = await this.makeTwitterRequest(userUrl);

      if (!userResponse.data) {
        throw new Error(`User @${username} not found`);
      }

      const userId = userResponse.data.id;
      console.log(`✅ Found user ID: ${userId}`);

      // Get user's tweets
      const tweetsUrl = `https://api.twitter.com/2/users/${userId}/tweets`;
      const tweetsResponse = await this.makeTwitterRequest(tweetsUrl, 'GET', {
        'max_results': Math.min(maxTweets, 100),
        'tweet.fields': 'created_at,author_id,text,public_metrics',
        'exclude': 'retweets,replies'
      });

      const tweets = tweetsResponse.data || [];
      console.log(`✅ Found ${tweets.length} tweets from ${username}`);

      return tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
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

  static async testConnection() {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      // Test by getting the authenticated user's profile
      const meUrl = 'https://api.twitter.com/2/users/me';
      const response = await this.makeTwitterRequest(meUrl);
      
      console.log('✅ Twitter API connection successful');
      return { 
        success: true, 
        username: response.data.username,
        id: response.data.id,
        name: response.data.name
      };

    } catch (error) {
      console.error('❌ Twitter API connection failed:', error.message);
      throw new Error(`Twitter API connection failed: ${error.message}`);
    }
  }
}