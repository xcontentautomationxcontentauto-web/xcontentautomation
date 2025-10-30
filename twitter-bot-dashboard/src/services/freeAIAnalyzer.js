export class FreeAIAnalyzer {
  // Free sentiment analysis using basic text analysis
  static async analyzeWithTurkishSupport(content, keywords = []) {
    try {
      // Basic keyword matching (always works)
      const keywordResult = this.basicKeywordAnalysis(content, keywords);
      
      if (keywordResult.approved) {
        // Try to get sentiment from basic analysis
        const sentiment = this.getBasicSentiment(content);
        return {
          ...keywordResult,
          sentiment: sentiment,
          confidence: 0.85
        };
      }
      
      return keywordResult;
    } catch (error) {
      console.error('Free AI analysis error:', error);
      return this.basicKeywordAnalysis(content, keywords);
    }
  }

  // Basic sentiment analysis using keyword matching
  static getBasicSentiment(text) {
    if (!text) return 'neutral';
    
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'positive',
      'success', 'profit', 'growth', 'gain', 'rise', 'increase', 'bullish',
      'iyi', 'harika', 'mükemmel', 'olağanüstü', 'pozitif', 'başarı', 'kar', 'büyüme'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'negative', 'loss', 'decline', 'drop', 'fall',
      'bearish', 'crisis', 'problem', 'issue', 'fail', 'decrease',
      'kötü', 'berbat', 'olumsuz', 'zarar', 'düşüş', 'kayıp', 'sorun', 'kriz'
    ];
    
    const textLower = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (textLower.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (textLower.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
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
    
    const approved = relevantKeywords.length > 0;
    
    return {
      approved: approved,
      reason: approved ? `Contains keywords: ${relevantKeywords.join(', ')}` : 'No relevant keywords found',
      sentiment: 'neutral',
      confidence: approved ? 0.8 : 0.1,
      relevant_keywords: relevantKeywords
    };
  }

  // Turkish keyword support
  static getTurkishKeywords() {
    return {
      'stocks': ['hisse', 'borsa', 'hisse senedi', 'yatırım'],
      'sales': ['satış', 'ciro', 'gelir', 'kar'],
      'market': ['piyasa', 'borsa', 'finans', 'ekonomi'],
      'news': ['haber', 'gelişme', 'açıklama', 'duyuru'],
      'technology': ['teknoloji', 'yazılım', 'teknolojik', 'dijital'],
      'business': ['iş', 'ticaret', 'şirket', 'firma'],
      'finance': ['finans', 'para', 'ekonomi', 'yatırım'],
      'crypto': ['kripto', 'bitcoin', 'blockchain', 'dijital para']
    };
  }

  static analyzeWithTurkishSupport(content, keywords) {
    const turkishKeywords = this.getTurkishKeywords();
    const allKeywords = [...keywords];
    
    // Add Turkish equivalents
    keywords.forEach(keyword => {
      if (turkishKeywords[keyword]) {
        allKeywords.push(...turkishKeywords[keyword]);
      }
    });
    
    return this.basicKeywordAnalysis(content, allKeywords);
  }
}