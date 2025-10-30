import { NewsScraper } from './newsScraper.js';
import { FreeAIAnalyzer } from './freeAIAnalyzer.js';
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
      aiApproved: 0,
      errors: 0
    };

    try {
      // Scan News Sources using combined method
      console.log('📰 Scanning news from all available sources...');
      const newsArticles = await NewsScraper.scrapeAllFeeds();
      stats.newsFound = newsArticles.length;
      
      console.log(`🔍 Analyzing ${newsArticles.length} articles with AI...`);
      
      for (const article of newsArticles) {
        try {
          // Use free AI analysis with Turkish support
          const aiResult = await FreeAIAnalyzer.analyzeWithTurkishSupport(
            article.title + ' ' + article.content, 
            settings.aiSettings?.keywords || []
          );
          
          if (aiResult.approved) {
            stats.aiApproved++;
            foundContents.push({
              ...article,
              type: 'news',
              status: 'pending',
              ai_analysis: aiResult,
              userId: user.uid,
              timestamp: new Date(),
              language: this.detectLanguage(article.title)
            });
            console.log(`✅ Approved: ${article.title.substring(0, 80)}...`);
          }
        } catch (error) {
          console.error('Error analyzing news article:', error);
          stats.errors++;
        }
      }

      // Save found contents to Firestore
      if (foundContents.length > 0) {
        console.log(`💾 Saving ${foundContents.length} approved contents to database...`);
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

      console.log(`✅ Automatic scan completed!`);
      console.log(`📊 Stats: ${stats.newsFound} scanned, ${stats.aiApproved} approved, ${stats.errors} errors`);
      
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

  static detectLanguage(text) {
    if (!text) return 'english';
    
    const turkishChars = /[çğıöşüÇĞİÖŞÜ]/;
    const englishChars = /[a-zA-Z]/;
    
    const turkishCount = (text.match(turkishChars) || []).length;
    const englishCount = (text.match(englishChars) || []).length;
    
    return turkishCount > englishCount ? 'turkish' : 'english';
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

      console.log('📊 Statistics updated successfully');
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  }

  static async postApprovedContent(content, accountSettings) {
    if (!accountSettings?.target) {
      throw new Error('Target account settings required');
    }

    try {
      // For now, simulate successful posting
      console.log(`🚀 Simulating post to Twitter: ${content.title.substring(0, 80)}...`);
      
      // Add custom text if configured
      let postContent = content.content || content.title;
      if (content.customText) {
        postContent = `${content.customText} ${postContent}`;
      }

      // Truncate if too long
      if (postContent.length > 280) {
        postContent = postContent.substring(0, 277) + '...';
      }

      // Update content status in Firestore
      if (content.id) {
        const contentRef = doc(db, 'foundContents', content.id);
        await updateDoc(contentRef, {
          status: 'posted',
          postedAt: new Date(),
          tweetId: 'simulated_tweet_' + Date.now(),
          postedContent: postContent
        });
      }

      return { 
        success: true, 
        tweetId: 'simulated_tweet_' + Date.now(),
        content: postContent
      };
    } catch (error) {
      console.error('Error posting content:', error);
      throw new Error(`Posting failed: ${error.message}`);
    }
  }
}