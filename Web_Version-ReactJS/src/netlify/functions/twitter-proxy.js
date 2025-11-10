const { TwitterApi } = require('twitter-api-v2');

exports.handler = async (event) => {
  // Handle CORS for both local and production
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
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
      username 
    } = body;

    console.log('🔍 Twitter Proxy Action:', action, 'for user:', username);

    // Validate required fields
    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
      throw new Error('Missing Twitter API credentials');
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
        const user = await client.v2.me();
        result = {
          success: true,
          data: {
            username: user.data.username,
            id: user.data.id,
            name: user.data.name
          }
        };
        break;

      case 'get-user-tweets':
        if (!username) {
          throw new Error('Username is required for get-user-tweets action');
        }
        
        const cleanUsername = username.replace('@', '');
        const userData = await client.v2.userByUsername(cleanUsername);
        
        if (!userData.data) {
          throw new Error(`User @${cleanUsername} not found`);
        }

        const tweets = await client.v2.userTimeline(userData.data.id, {
          max_results: 5,
          'tweet.fields': 'created_at,public_metrics',
          exclude: 'retweets,replies'
        });

        result = {
          success: true,
          data: {
            tweets: tweets.data?.data || [],
            user: userData.data
          }
        };
        break;

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    console.log('✅ Twitter Proxy Success:', action);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Twitter Proxy Error:', error.message);
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    };
  }
};