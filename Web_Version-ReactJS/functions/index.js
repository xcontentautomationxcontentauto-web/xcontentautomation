const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cheerio = require('cheerio');

admin.initializeApp();

// Function to monitor X/Twitter accounts
exports.monitorXAccounts = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  try {
    const db = admin.firestore();
    
    // Get all users with account settings
    const settingsSnapshot = await db.collection('settings')
      .where('userId', '!=', null)
      .get();

    for (const doc of settingsSnapshot.docs) {
      const settings = doc.data();
      const userId = settings.userId;
      
      if (settings.source && settings.consumerKey) {
        // In a real implementation, you would use Twitter API here
        // For now, we'll simulate finding content
        const mockTweets = [
          "Breaking: Stock markets show significant gains today with tech stocks leading the rally",
          "Federal Reserve announces interest rate decision affecting global markets",
          "Tech companies report strong quarterly earnings exceeding analyst expectations"
        ];

        // Add simulated tweet to foundContents
        const randomTweet = mockTweets[Math.floor(Math.random() * mockTweets.length)];
        await db.collection('foundContents').add({
          content: randomTweet,
          type: 'tweet',
          source: `Account: ${settings.source}`,
          status: 'pending',
          userId: userId,
          userEmail: settings.userEmail,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          aiAnalysis: {
            sentiment: 'positive',
            confidence: 0.85
          }
        });
      }
    }

    console.log('X account monitoring completed');
    return null;
  } catch (error) {
    console.error('Error monitoring X accounts:', error);
    return null;
  }
});

// Function to monitor news sources
exports.monitorNewsSources = functions.pubsub.schedule('every 10 minutes').onRun(async (context) => {
  try {
    const db = admin.firestore();
    
    // Get all users with news settings
    const newsSettingsSnapshot = await db.collection('settings')
      .where('userId', '!=', null)
      .get();

    for (const doc of newsSettingsSnapshot.docs) {
      const settings = doc.data();
      const userId = settings.userId;
      
      if (settings.sources && settings.sources.length > 0) {
        for (const sourceUrl of settings.sources) {
          try {
            // Simulate news scraping (in real implementation, use actual scraping)
            const mockNews = [
              "Major acquisition in tech sector sends stock prices soaring",
              "Global markets react to economic indicators with mixed results",
              "Innovative startups secure funding amid competitive landscape"
            ];

            const randomNews = mockNews[Math.floor(Math.random() * mockNews.length)];
            await db.collection('foundContents').add({
              content: randomNews,
              type: 'news',
              source: sourceUrl,
              status: 'pending',
              userId: userId,
              userEmail: settings.userEmail,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              aiAnalysis: {
                sentiment: 'neutral',
                confidence: 0.78
              }
            });
          } catch (error) {
            console.error(`Error processing news source ${sourceUrl}:`, error);
          }
        }
      }
    }

    console.log('News sources monitoring completed');
    return null;
  } catch (error) {
    console.error('Error monitoring news sources:', error);
    return null;
  }
});

// Manual trigger to add test content
exports.addTestContent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const db = admin.firestore();
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email;

  const testContents = [
    {
      content: "🚀 TEST: Stock markets show impressive growth in Q4 earnings reports",
      type: 'tweet',
      source: 'Test Account',
      status: 'pending',
      aiAnalysis: { sentiment: 'positive', confidence: 0.92 }
    },
    {
      content: "📰 TEST: Breaking news about technological advancements in AI sector",
      type: 'news',
      source: 'https://www.bbc.com/news',
      status: 'pending',
      aiAnalysis: { sentiment: 'neutral', confidence: 0.85 }
    },
    {
      content: "💼 TEST: Major corporate merger announced, affecting market dynamics",
      type: 'tweet',
      source: 'Test Account',
      status: 'pending',
      aiAnalysis: { sentiment: 'positive', confidence: 0.88 }
    }
  ];

  try {
    for (const testContent of testContents) {
      await db.collection('foundContents').add({
        ...testContent,
        userId: userId,
        userEmail: userEmail,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isTest: true
      });
    }

    return { success: true, message: 'Test content added successfully' };
  } catch (error) {
    console.error('Error adding test content:', error);
    throw new functions.https.HttpsError('internal', 'Error adding test content');
  }
});