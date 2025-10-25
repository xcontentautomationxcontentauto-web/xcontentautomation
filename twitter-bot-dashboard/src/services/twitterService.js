import axios from 'axios';

export class TwitterService {
  static client = null;
  static bearerToken = null;

  static initializeClient(credentials) {
    if (!credentials.consumerKey || !credentials.consumerSecret) {
      throw new Error('Missing Twitter API credentials');
    }
    
    // Store credentials for API calls
    this.client = {
      consumerKey: credentials.consumerKey,
      consumerSecret: credentials.consumerSecret,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessTokenSecret
    };
    
    this.bearerToken = btoa(`${credentials.consumerKey}:${credentials.consumerSecret}`);
  }

  static async getBearerToken() {
    if (!this.bearerToken) {
      throw new Error('Twitter client not initialized');
    }

    try {
      const response = await axios.post(
        'https://api.twitter.com/oauth2/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${this.bearerToken}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          }
        }
      );
      
      return response.data.access_token;
    } catch (error) {
      console.error('❌ Error getting bearer token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Twitter API. Check your API credentials.');
    }
  }

  static async getUserTweets(username, maxTweets = 50) {
    try {
      const bearerToken = await this.getBearerToken();
      
      console.log(`🔍 Fetching tweets for user: ${username}`);
      
      // Get user ID first
      const userResponse = await axios.get(
        `https://api.twitter.com/2/users/by/username/${username.replace('@', '')}`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`
          }
        }
      );

      const userId = userResponse.data.data.id;
      console.log(`✅ Found user ID: ${userId}`);
      
      // Get user's tweets
      const tweetsResponse = await axios.get(
        `https://api.twitter.com/2/users/${userId}/tweets`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`
          },
          params: {
            'max_results': maxTweets,
            'tweet.fields': 'created_at,author_id,text,public_metrics',
            'exclude': 'retweets,replies'
          }
        }
      );

      const tweets = tweetsResponse.data.data || [];
      console.log(`✅ Found ${tweets.length} real tweets from ${username}`);
      
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
      console.error('❌ Error fetching user tweets:', error.response?.data || error.message);
      throw new Error(`Failed to fetch tweets: ${error.response?.data?.detail || error.message}`);
    }
  }

  static async getFollowedUsersTweets(sourceAccount, maxTweets = 50) {
    try {
      console.log(`🐦 Fetching tweets from account: ${sourceAccount}`);
      
      // Get tweets from the source account itself (real implementation)
      const tweets = await this.getUserTweets(sourceAccount, maxTweets);
      
      console.log(`✅ Found ${tweets.length} real tweets`);
      return tweets;
      
    } catch (error) {
      console.error('❌ Error fetching followed users tweets:', error.message);
      throw error; // Don't fall back to mock data
    }
  }

  static async searchTweets(query, maxTweets = 50) {
    try {
      const bearerToken = await this.getBearerToken();
      
      const response = await axios.get(
        'https://api.twitter.com/2/tweets/search/recent',
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`
          },
          params: {
            'query': query,
            'max_results': maxTweets,
            'tweet.fields': 'created_at,author_id,text,public_metrics'
          }
        }
      );

      const tweets = response.data.data || [];
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
      console.error('❌ Error searching tweets:', error.response?.data || error.message);
      throw error;
    }
  }

  static async testConnection() {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      const bearerToken = await this.getBearerToken();
      const response = await axios.get(
        'https://api.twitter.com/2/users/me',
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`
          }
        }
      );

      console.log('✅ Twitter API connection successful');
      return { 
        success: true, 
        username: response.data.data.username,
        id: response.data.data.id
      };
      
    } catch (error) {
      console.error('❌ Twitter API connection failed:', error.response?.data || error.message);
      throw new Error(`Twitter API connection failed: ${error.response?.data?.detail || error.message}`);
    }
  }
}