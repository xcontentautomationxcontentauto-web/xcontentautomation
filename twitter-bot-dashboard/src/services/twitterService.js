import axios from 'axios';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

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

    // Initialize OAuth 1.0a
    this.oauth = OAuth({
      consumer: {
        key: credentials.consumerKey,
        secret: credentials.consumerSecret
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto
          .createHmac('sha1', key)
          .update(base_string)
          .digest('base64');
      }
    });
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

  static async getFollowedUsersTweets(sourceAccount, maxTweets = 10) {
    try {
      console.log(`🐦 Fetching tweets from account: ${sourceAccount}`);
      const tweets = await this.getUserTweets(sourceAccount, maxTweets);
      console.log(`✅ Found ${tweets.length} tweets`);
      return tweets;
    } catch (error) {
      console.error('❌ Error fetching followed users tweets:', error.message);
      throw error;
    }
  }

  static async searchTweets(query, maxTweets = 10) {
    try {
      const searchUrl = 'https://api.twitter.com/2/tweets/search/recent';
      const response = await this.makeTwitterRequest(searchUrl, 'GET', {
        'query': query,
        'max_results': Math.min(maxTweets, 100),
        'tweet.fields': 'created_at,author_id,text,public_metrics'
      });

      const tweets = response.data || [];
      console.log(`✅ Found ${tweets.length} tweets for query: ${query}`);

      return tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        created_at: tweet.created_at,
        source: 'X/Twitter Search',
        type: 'tweet',
        metrics: tweet.public_metrics
      }));

    } catch (error) {
      console.error('❌ Error searching tweets:', error.message);
      throw error;
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

  // Alternative method to verify account existence without full authentication
  static async verifyAccountExists(username) {
    try {
      const cleanUsername = username.replace('@', '').trim();
      console.log(`🔍 Verifying account existence: @${cleanUsername}`);
      
      const userUrl = `https://api.twitter.com/2/users/by/username/${cleanUsername}`;
      const response = await this.makeTwitterRequest(userUrl);
      
      if (response.data) {
        return {
          exists: true,
          username: response.data.username,
          id: response.data.id,
          name: response.data.name
        };
      } else {
        return { exists: false };
      }
    } catch (error) {
      console.error('❌ Error verifying account:', error.message);
      return { exists: false, error: error.message };
    }
  }
}