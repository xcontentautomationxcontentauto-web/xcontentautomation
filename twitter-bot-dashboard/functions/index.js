const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { TwitterApi } = require('twitter-api-v2');
const axios = require('axios');
const cheerio = require('cheerio');
const { Configuration, OpenAIApi } = require('openai');

admin.initializeApp();

// Monitor X/Twitter for new tweets from followed accounts
exports.monitorXAccounts = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  try {
    const db = admin.firestore();
    
    // Get all users with account settings
    const usersSnapshot = await db.collection('settings')
      .where('userId', '!=', null)
      .get();

    for (const userDoc of usersSnapshot.docs) {
      const settings = userDoc.data();
      const userId = settings.userId;
      
      if (!settings.sourceAccount || !settings.consumerKey) continue;

      try {
        // Initialize Twitter client
        const twitterClient = new TwitterApi({
          appKey: settings.consumerKey,
          appSecret: settings.consumerSecret,
          accessToken: settings.accessToken,
          accessSecret: settings.accessTokenSecret,
        });

        // Get user's timeline (tweets from people they follow)
        const timeline = await twitterClient.v2.homeTimeline({
          max_results: 20,
          'tweet.fields': ['created_at', 'author_id', 'text']
        });

        const aiSettingsDoc = await db.collection('settings')
          .doc(`ai_${userId}`)
          .get();
        const aiSettings = aiSettingsDoc.exists ? aiSettingsDoc.data() : { keywords: [] };

        // Process each tweet
        for (const tweet of timeline.data.data) {
          const tweetText = tweet.text.toLowerCase();
          const containsKeyword = aiSettings.keywords.some(keyword => 
            tweetText.includes(keyword.toLowerCase())
          );

          if (containsKeyword) {
            // Check if tweet already exists
            const existingTweet = await db.collection('foundContents')
              .where('tweetId', '==', tweet.id)
              .where('userId', '==', userId)
              .get();

            if (existingTweet.empty) {
              // Analyze with AI if API key is available
              let aiAnalysis = null;
              if (aiSettings.openaiApiKey) {
                aiAnalysis = await analyzeWithAI(tweet.text, aiSettings);
              }

              // Save to foundContents
              await db.collection('foundContents').add({
                userId: userId,
                userEmail: settings.userEmail,
                type: 'tweet',
                source: `Account: ${settings.sourceAccount}`,
                content: tweet.text,
                tweetId: tweet.id,
                authorId: tweet.author_id,
                status: 'pending',
                aiAnalysis: aiAnalysis,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              });

              console.log(`Saved tweet ${tweet.id} for user ${userId}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
      }
    }

    return null;
  } catch (error) {
    console.error('Error in monitorXAccounts:', error);
    return null;
  }
});

// Monitor news websites for new content
exports.monitorNewsWebsites = functions.pubsub.schedule('every 10 minutes').onRun(async (context) => {
  try {
    const db = admin.firestore();
    
    // Get all users with news settings
    const usersSnapshot = await db.collection('settings')
      .where('userId', '!=', null)
      .get();

    for (const userDoc of usersSnapshot.docs) {
      const settings = userDoc.data();
      const userId = settings.userId;
      
      const newsSettingsDoc = await db.collection('settings')
        .doc(`news_${userId}`)
        .get();
      
      if (!newsSettingsDoc.exists) continue;
      
      const newsSettings = newsSettingsDoc.data();
      const aiSettingsDoc = await db.collection('settings')
        .doc(`ai_${userId}`)
        .get();
      const aiSettings = aiSettingsDoc.exists ? aiSettingsDoc.data() : { keywords: [] };

      for (const sourceUrl of newsSettings.sources || []) {
        try {
          const articles = await scrapeNewsWebsite(sourceUrl);
          
          for (const article of articles) {
            const articleText = (article.title + ' ' + article.content).toLowerCase();
            const containsKeyword = aiSettings.keywords.some(keyword => 
              articleText.includes(keyword.toLowerCase())
            );

            if (containsKeyword) {
              // Check if article already exists
              const existingArticle = await db.collection('foundContents')
                .where('url', '==', article.url)
                .where('userId', '==', userId)
                .get();

              if (existingArticle.empty) {
                // Analyze with AI if API key is available
                let aiAnalysis = null;
                if (aiSettings.openaiApiKey) {
                  aiAnalysis = await analyzeWithAI(article.content, aiSettings);
                }

                // Save to foundContents
                await db.collection('foundContents').add({
                  userId: userId,
                  userEmail: settings.userEmail,
                  type: 'news',
                  source: sourceUrl,
                  content: article.content,
                  title: article.title,
                  url: article.url,
                  status: 'pending',
                  aiAnalysis: aiAnalysis,
                  timestamp: admin.firestore.FieldValue.serverTimestamp(),
                  createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`Saved article from ${sourceUrl} for user ${userId}`);
              }
            }
          }
        } catch (error) {
          console.error(`Error scraping ${sourceUrl} for user ${userId}:`, error);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error in monitorNewsWebsites:', error);
    return null;
  }
});

// AI Analysis function
async function analyzeWithAI(content, aiSettings) {
  try {
    const configuration = new Configuration({
      apiKey: aiSettings.openaiApiKey,
    });
    const openai = new OpenAIApi(configuration);

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Analyze this content and determine:
          1. Sentiment (POSITIVE, NEGATIVE, NEUTRAL)
          2. Relevance to these keywords: ${aiSettings.keywords.join(', ')}
          3. Confidence score (0-1)
          
          Respond in JSON format: { "sentiment": "", "relevance": "", "confidence": 0.0 }`
        },
        {
          role: "user",
          content: content
        }
      ],
      max_tokens: 150,
    });

    const analysis = JSON.parse(response.data.choices[0].message.content);
    return analysis;
  } catch (error) {
    console.error('AI analysis error:', error);
    return { sentiment: 'NEUTRAL', relevance: 'UNKNOWN', confidence: 0.0 };
  }
}

// Basic news scraping function
async function scrapeNewsWebsite(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const articles = [];

    // Basic scraping logic - you'll need to customize this per website
    $('article, .article, .story, .post').each((index, element) => {
      const title = $(element).find('h1, h2, h3').first().text().trim();
      const content = $(element).find('p').text().trim();
      
      if (title && content && content.length > 50) {
        articles.push({
          title: title,
          content: content.substring(0, 500), // Limit content length
          url: url
        });
      }
    });

    return articles.slice(0, 5); // Return max 5 articles
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return [];
  }
}

// Manual trigger functions
exports.manualScanNews = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  
  // Trigger news scanning for this user
  await exports.monitorNewsWebsites();

  return { success: true, message: 'News scan initiated' };
});

exports.manualScanTwitter = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  
  // Trigger Twitter scanning for this user
  await exports.monitorXAccounts();

  return { success: true, message: 'Twitter scan initiated' };
});