const express = require('express');
const cors = require('cors');
const { TwitterApi } = require('twitter-api-v2');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Twitter API proxy endpoint
app.post('/api/twitter/verify', async (req, res) => {
  try {
    const { consumerKey, consumerSecret, accessToken, accessTokenSecret, action, username } = req.body;

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
          username: user.data.username,
          id: user.data.id,
          name: user.data.name
        };
        break;

      case 'get-user-tweets':
        const userData = await client.v2.userByUsername(username);
        const tweets = await client.v2.userTimeline(userData.data.id, {
          max_results: 5,
          exclude: 'retweets,replies'
        });
        result = {
          success: true,
          tweets: tweets.data.data || [],
          user: userData.data
        };
        break;

      default:
        throw new Error('Invalid action');
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Twitter API error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Twitter proxy server running on http://localhost:${PORT}`);
});