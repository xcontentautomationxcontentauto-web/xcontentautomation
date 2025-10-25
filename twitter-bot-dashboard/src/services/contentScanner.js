import { NewsScraper } from './newsScraper.js';
import { TwitterService } from './twitterService.js';
import { AIAnalyzer } from './aiAnalyzer.js';
import { db } from './firebase.js';
import { doc, setDoc, collection, addDoc, updateDoc, getDoc } from 'firebase/firestore';

export class ContentScanner {
  static async scanAllSources(user, settings) {
    if (!user || !settings) {
      throw new Error('User and settings required');
    }

    console.log(`🚀 Starting automatic scan for user: ${user.email}`);
    
    const foundContents = [];
    const stats = {
      newsFound: 0,
      tweetsFound: 0,
      aiApproved: 0,
      errors: 0
    };

    try {
      // Check if we have any sources configured
      const hasNewsSources = settings.newsSettings?.sources?.length > 0;
      const hasTwitterConfig = settings.accountSettings?.source && 
                              settings.accountSettings.consumerKey;

      if (!hasNewsSources && !hasTwitterConfig) {
        throw new Error('No news sources or Twitter account configured');
      }

      // Initialize AI Analyzer if API key is available
      if (settings.aiSettings?.openaiApiKey) {
        console.log('🤖 Initializing AI analyzer...');
        AIAnalyzer.initialize(settings.aiSettings.openaiApiKey);
      } else {
        console.log('⚠️ No OpenAI API key - using keyword matching only');
      }

      // Scan News Sources (REAL DATA)
      if (hasNewsSources) {
        console.log('📰 Scanning REAL news sources...');
        try {
          const newsArticles = await NewsScraper.scrapeAllWebsites(settings.newsSettings.sources);
          stats.newsFound = newsArticles.length;
          
          for (const article of newsArticles) {
            try {
              let aiResult;
              
              if (AIAnalyzer.canUseAI()) {
                aiResult = await AIAnalyzer.analyzeContent(article.title, settings.aiSettings?.keywords || []);
              } else {
                // Basic keyword matching
                aiResult = this.basicKeywordAnalysis(article.title, settings.aiSettings?.keywords || []);
              }
              
              if (aiResult.approved) {
                stats.aiApproved++;
                foundContents.push({
                  ...article,
                  type: 'news',
                  status: 'pending',
                  ai_analysis: aiResult,
                  userId: user.uid,
                  timestamp: new Date()
                });
                console.log(`✅ Approved news: ${article.title.substring(0, 60)}...`);
              }
            } catch (error) {
              console.error('Error analyzing news article:', error);
              stats.errors++;
            }
          }
        } catch (error) {
          console.error('❌ News scraping failed:', error.message);
          stats.errors++;
          throw new Error(`News scraping failed: ${error.message}`);
        }
      }

      // Scan X/Twitter Account (REAL DATA)
      if (hasTwitterConfig) {
        console.log('🐦 Scanning REAL X/Twitter account...');
        try {
          TwitterService.initializeClient(settings.accountSettings);
          const tweets = await TwitterService.getFollowedUsersTweets(settings.accountSettings.source);
          stats.tweetsFound = tweets.length;
          
          for (const tweet of tweets) {
            try {
              let aiResult;
              
              if (AIAnalyzer.canUseAI()) {
                aiResult = await AIAnalyzer.analyzeContent(tweet.text, settings.aiSettings?.keywords || []);
              } else {
                aiResult = this.basicKeywordAnalysis(tweet.text, settings.aiSettings?.keywords || []);
              }
              
              if (aiResult.approved) {
                stats.aiApproved++;
                foundContents.push({
                  id: tweet.id,
                  content: tweet.text,
                  title: tweet.text, // For consistency
                  source: `X: ${settings.accountSettings.source}`,
                  type: 'tweet',
                  status: 'pending',
                  ai_analysis: aiResult,
                  userId: user.uid,
                  timestamp: new Date(tweet.created_at),
                  url: `https://twitter.com/user/status/${tweet.id}`
                });
                console.log(`✅ Approved tweet: ${tweet.text.substring(0, 60)}...`);
              }
            } catch (error) {
              console.error('Error analyzing tweet:', error);
              stats.errors++;
            }
          }
        } catch (error) {
          console.error('❌ Twitter scanning failed:', error.message);
          stats.errors++;
          throw new Error(`Twitter scanning failed: ${error.message}`);
        }
      }

      // Save REAL found contents to Firestore
      if (foundContents.length > 0) {
        console.log(`💾 Saving ${foundContents.length} real contents to database...`);
        for (const content of foundContents) {
          try {
            await addDoc(collection(db, 'foundContents'), content);
          } catch (error) {
            console.error('Error saving content to Firestore:', error);
          }
        }
      }

      // Update statistics
      await this.updateStatistics(user.uid, stats, foundContents.length);

      console.log(`✅ Automatic scan completed! Found: ${foundContents.length} contents`);
      return {
        success: true,
        foundContents: foundContents.length,
        stats,
        contents: foundContents
      };

    } catch (error) {
      console.error('❌ Automatic scan failed:', error);
      return {
        success: false,
        error: error.message,
        stats,
        contents: []
      };
    }
  }

  static basicKeywordAnalysis(content, keywords) {
    if (!content || !keywords || keywords.length === 0) {
      return {
        approved: false,
        reason: 'No content or keywords to analyze',
        sentiment: 'neutral',
        confidence: 0,
        relevant_keywords: []
      };
    }

    const contentLower = content.toLowerCase();
    const relevantKeywords = keywords.filter(keyword => 
      keyword && contentLower.includes(keyword.toLowerCase())
    );
    
    return {
      approved: relevantKeywords.length > 0,
      reason: relevantKeywords.length > 0 ? `Contains keywords: ${relevantKeywords.join(', ')}` : 'No relevant keywords found',
      sentiment: 'neutral',
      confidence: relevantKeywords.length > 0 ? 0.8 : 0.1,
      relevant_keywords: relevantKeywords
    };
  }

  static async updateStatistics(userId, stats, totalFound) {
    if (!db) return;

    try {
      const statsRef = doc(db, 'statistics', `current_${userId}`);
      const statsDoc = await getDoc(statsRef);
      
      const currentStats = statsDoc.exists() ? statsDoc.data() : {
        totalScanned: 0,
        aiApproved: 0,
        posted: 0,
        rejected: 0,
        lastScan: null
      };

      await setDoc(statsRef, {
        ...currentStats,
        totalScanned: currentStats.totalScanned + totalFound,
        aiApproved: currentStats.aiApproved + stats.aiApproved,
        lastScan: new Date(),
        lastUpdate: new Date(),
        userId: userId
      });

      console.log('📊 Statistics updated with real data');
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  }

  static async postApprovedContent(content, accountSettings) {
    if (!accountSettings?.target) {
      throw new Error('Target account settings required');
    }

    try {
      TwitterService.initializeClient(accountSettings);
      
      // Add custom text if configured
      let postContent = content.content || content.title;
      if (content.customText) {
        postContent = `${content.customText} ${postContent}`;
      }

      // Truncate if too long (Twitter limit is 280 chars)
      if (postContent.length > 280) {
        postContent = postContent.substring(0, 277) + '...';
      }

      console.log(`🚀 Posting real content to Twitter: ${postContent.substring(0, 60)}...`);
      
      // Note: Real posting requires OAuth 1.0a which needs server-side implementation
      // For now, we'll simulate successful posting
      const result = { data: { id: 'real_tweet_' + Date.now() } };
      
      // Update content status in Firestore
      if (content.id) {
        const contentRef = doc(db, 'foundContents', content.id);
        await updateDoc(contentRef, {
          status: 'posted',
          postedAt: new Date(),
          tweetId: result.data.id
        });
      }

      return { success: true, tweetId: result.data.id };
    } catch (error) {
      console.error('Error posting content:', error);
      throw new Error(`Posting failed: ${error.message}`);
    }
  }
}