interface TwitterCredentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

interface TwitterUser {
  username: string;
  id: string;
  name: string;
}

interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  source: string;
  type: string;
  metrics: {
    like_count: number;
    retweet_count: number;
  };
}

export class TwitterService {
  static credentials: TwitterCredentials | null = null;

  static initializeClient(credentials: TwitterCredentials) {
    this.credentials = {
      consumerKey: credentials.consumerKey?.trim(),
      consumerSecret: credentials.consumerSecret?.trim(),
      accessToken: credentials.accessToken?.trim(),
      accessTokenSecret: credentials.accessTokenSecret?.trim()
    };
    console.log('🔑 Twitter client initialized');
  }

  static async testConnection(): Promise<TwitterUser> {
    return new Promise((resolve, reject) => {
      if (!this.credentials) {
        reject(new Error('Twitter client not initialized'));
        return;
      }

      // Simulate API call - replace with actual Twitter API v2 implementation
      setTimeout(() => {
        if (this.credentials?.consumerKey && this.credentials.consumerSecret) {
          resolve({
            username: 'test_user',
            id: '123456789',
            name: 'Test User'
          });
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 2000);
    });
  }

  static async getUserTweets(username: string, maxTweets: number = 5): Promise<Tweet[]> {
    return new Promise((resolve, reject) => {
      if (!this.credentials) {
        reject(new Error('Twitter client not initialized'));
        return;
      }

      // Simulate API call
      setTimeout(() => {
        resolve([
          {
            id: '1',
            text: 'Sample tweet content for testing purposes. This is a simulated tweet from the Twitter API.',
            author_id: '123456789',
            created_at: new Date().toISOString(),
            source: 'X/Twitter',
            type: 'tweet',
            metrics: { like_count: 10, retweet_count: 2 }
          },
          {
            id: '2',
            text: 'Another sample tweet showing how the system would retrieve and display tweet content.',
            author_id: '123456789',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            source: 'X/Twitter',
            type: 'tweet',
            metrics: { like_count: 5, retweet_count: 1 }
          }
        ]);
      }, 1500);
    });
  }

  static validateCredentials(credentials: TwitterCredentials) {
    const errors = [];
    
    if (!credentials?.consumerKey?.trim()) {
      errors.push('Consumer Key is required');
    }
    
    if (!credentials?.consumerSecret?.trim()) {
      errors.push('Consumer Secret is required');
    }
    
    if (!credentials?.accessToken?.trim()) {
      errors.push('Access Token is required');
    }
    
    if (!credentials?.accessTokenSecret?.trim()) {
      errors.push('Access Token Secret is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static clearCredentials() {
    this.credentials = null;
    console.log('🔑 Twitter credentials cleared');
  }
}