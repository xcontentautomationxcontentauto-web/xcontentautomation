import { OpenAI } from 'openai';

export class AIAnalyzer {
  static openai = null;
  static isInitialized = false;
  static lastRequestTime = 0;
  static requestCount = 0;
  static rateLimitDelay = 1000; // 1 second between requests

  static initialize(apiKey) {
    if (!apiKey) {
      console.warn('⚠️ No OpenAI API key provided - using keyword matching only');
      this.isInitialized = false;
      return;
    }
    
    try {
      this.openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });
      this.isInitialized = true;
      console.log('✅ OpenAI client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI:', error);
      this.isInitialized = false;
    }
  }

  static async analyzeContent(content, keywords = []) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;

    // If no OpenAI or initialization failed, use keyword matching
    if (!this.isInitialized || !this.openai) {
      console.log('🔍 Using keyword analysis (OpenAI not available)');
      return this.basicKeywordAnalysis(content, keywords);
    }

    try {
      const prompt = `
        Analyze this content and determine if it should be shared based on these keywords: ${keywords.join(', ')}
        
        Content: "${content.substring(0, 1000)}" // Limit content length
        
        Respond with JSON format only:
        {
          "approved": true/false,
          "reason": "brief explanation",
          "sentiment": "positive/negative/neutral",
          "confidence": 0.0-1.0,
          "relevant_keywords": ["array of matching keywords"]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Use cheaper model
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150, // Limit response length
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content);
      console.log('🤖 AI Analysis Result:', result);
      return result;
      
    } catch (error) {
      console.error('❌ AI analysis error:', error.message);
      
      // Handle specific OpenAI errors
      if (error.status === 429) {
        console.warn('⚠️ Rate limit exceeded - using keyword analysis');
        // Increase delay for next requests
        this.rateLimitDelay = 2000;
      } else if (error.status === 401) {
        console.error('❌ Invalid API key - disabling OpenAI');
        this.isInitialized = false;
      } else if (error.status === 402 || error.message.includes('quota')) {
        console.error('❌ Quota exceeded - disabling OpenAI');
        this.isInitialized = false;
      }
      
      // Fallback to keyword matching
      return this.basicKeywordAnalysis(content, keywords);
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
    
    const approved = relevantKeywords.length > 0;
    
    return {
      approved: approved,
      reason: approved ? `Contains keywords: ${relevantKeywords.join(', ')}` : 'No relevant keywords found',
      sentiment: 'neutral',
      confidence: approved ? 0.8 : 0.1,
      relevant_keywords: relevantKeywords
    };
  }

  static async testConnection() {
    if (!this.isInitialized || !this.openai) {
      return { 
        success: false, 
        error: 'OpenAI not initialized or no API key provided' 
      };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Say 'Connection successful' if you can read this." }],
        max_tokens: 10
      });

      console.log('✅ OpenAI connection successful');
      return { 
        success: true, 
        response: response.choices[0].message.content 
      };
    } catch (error) {
      console.error('❌ OpenAI connection failed:', error.message);
      
      let errorMessage = error.message;
      if (error.status === 429) {
        errorMessage = 'Rate limit exceeded - try again later';
      } else if (error.status === 401) {
        errorMessage = 'Invalid API key';
      } else if (error.status === 402) {
        errorMessage = 'Quota exceeded - check your billing';
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  // Check if we can use AI analysis
  static canUseAI() {
    return this.isInitialized && this.openai;
  }
}