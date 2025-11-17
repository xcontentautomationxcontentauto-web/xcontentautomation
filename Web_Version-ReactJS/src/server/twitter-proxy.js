const { TwitterApi } = require('twitter-api-v2');

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { 
      consumerKey, 
      consumerSecret, 
      accessToken, 
      accessTokenSecret, 
      action, 
      username,
      maxTweets = 5
    } = body;

    console.log(`🔧 Twitter Proxy Action: ${action}`, { 
      username,
      hasCredentials: !!(consumerKey && consumerSecret && accessToken && accessTokenSecret)
    });

    // Validate required parameters
    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing Twitter API credentials' 
        })
      };
    }

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: consumerKey,
      appSecret: consumerSecret,
      accessToken: accessToken,
      accessSecret: accessTokenSecret,
    });

    let result;

    switch (action) {
      case 'test-connection':
        console.log('🧪 Testing Twitter API connection...');
        const user = await client.v2.me({
          'user.fields': ['created_at', 'description', 'location', 'public_metrics', 'verified', 'url']
        });
        
        result = {
          success: true,
          data: {
            username: user.data.username,
            id: user.data.id,
            name: user.data.name,
            description: user.data.description || '',
            location: user.data.location || '',
            followers_count: user.data.public_metrics?.followers_count || 0,
            following_count: user.data.public_metrics?.following_count || 0,
            tweet_count: user.data.public_metrics?.tweet_count || 0,
            verified: user.data.verified || false,
            created_at: user.data.created_at,
            access_level: 'Essential Tier (Read Only)'
          }
        };
        break;

      case 'get-user-tweets':
        if (!username) {
          throw new Error('Username is required for getting tweets');
        }

        console.log(`🐦 Fetching tweets for user: ${username}`);
        const cleanUsername = username.replace('@', '').trim();
        
        // First get user ID
        const userLookup = await client.v2.userByUsername(cleanUsername, {
          'user.fields': ['public_metrics', 'verified', 'description']
        });

        if (!userLookup.data) {
          throw new Error(`User @${cleanUsername} not found`);
        }

        // Then get their tweets
        const tweetsResponse = await client.v2.userTimeline(userLookup.data.id, {
          max_results: Math.min(maxTweets, 10), // Essential tier limit
          'tweet.fields': ['created_at', 'public_metrics', 'context_annotations', 'author_id'],
          exclude: 'retweets,replies'
        });

        result = {
          success: true,
          data: {
            user: {
              id: userLookup.data.id,
              username: userLookup.data.username,
              name: userLookup.data.name,
              description: userLookup.data.description || '',
              verified: userLookup.data.verified || false,
              followers_count: userLookup.data.public_metrics?.followers_count || 0,
              following_count: userLookup.data.public_metrics?.following_count || 0,
              tweet_count: userLookup.data.public_metrics?.tweet_count || 0
            },
            tweets: tweetsResponse.data?.data || [],
            meta: tweetsResponse.meta
          }
        };
        break;

      case 'get-user-info':
        if (!username) {
          throw new Error('Username is required');
        }

        const userInfo = await client.v2.userByUsername(username.replace('@', '').trim(), {
          'user.fields': ['created_at', 'description', 'location', 'public_metrics', 'verified', 'url', 'profile_image_url']
        });

        if (!userInfo.data) {
          throw new Error(`User @${username} not found`);
        }

        result = {
          success: true,
          data: {
            user: userInfo.data
          }
        };
        break;

      case 'search-tweets':
        const { query, maxResults = 10 } = body;
        
        if (!query) {
          throw new Error('Search query is required');
        }

        const searchResponse = await client.v2.search(query, {
          max_results: Math.min(maxResults, 10),
          'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'context_annotations']
        });

        result = {
          success: true,
          data: {
            tweets: searchResponse.data?.data || [],
            meta: searchResponse.meta
          }
        };
        break;

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    console.log(`✅ Twitter proxy action ${action} completed successfully`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Twitter proxy error:', error);
    
    // Enhanced error handling for different Twitter API errors
    let errorMessage = error.message;
    let statusCode = 400;

    if (error.code === 401) {
      errorMessage = 'Invalid Twitter API credentials. Please check your keys and tokens.';
      statusCode = 401;
    } else if (error.code === 403) {
      errorMessage = 'Twitter API access forbidden. Essential tier only supports read operations.';
      statusCode = 403;
    } else if (error.code === 404) {
      errorMessage = 'Twitter user or resource not found.';
      statusCode = 404;
    } else if (error.code === 429) {
      errorMessage = 'Twitter API rate limit exceeded. Please try again later.';
      statusCode = 429;
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Network error: Cannot connect to Twitter API. Please check your internet connection.';
      statusCode = 503;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        code: error.code,
        details: 'Essential tier provides read-only access to Twitter API'
      })
    };
  }
};