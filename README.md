Twitter Bot Dashboard - Complete Setup Guide

A comprehensive Twitter/X automation dashboard that automatically scans news sources, analyzes content with AI, and posts to Twitter accounts.

🌟 Features

· 🤖 AI-Powered Content Filtering - Keyword-based analysis with Turkish/English support
· 📰 Multi-Source News Scanning - RSS feeds and JSON sources
· 🐦 Twitter Automation - Auto-posting from source to target accounts
· 🔥 Real-time Dashboard - Live statistics and content management
· 🌐 Multi-language - English/Turkish support
· 📱 Responsive Design - Works on all devices
· 🔐 Secure Authentication - Firebase Google sign-in

🚀 Live Demo

· Netlify URL: https://xcontentautomation.netlify.app/
· GitHub Repository: https://github.com/xcontentautomationxcontentauto-web/xcontentautomation

📋 Prerequisites

Before you begin, ensure you have:

· Node.js 18+ installed
· A Firebase project
· A Twitter Developer account
· Netlify account (for deployment)

🛠️ Setup Instructions

1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/xcontentautomationxcontentauto-web/xcontentautomation.git
cd twitter-bot-dashboard

# Install dependencies
npm install
```

2. Firebase Setup

Create Firebase Project

1. Go to Firebase Console
2. Click "Add project"
3. Name: twitter-bot-dashboard
4. Disable Google Analytics (not needed)
5. Create project

Enable Firebase Services

```bash
# In Firebase Console:
# 1. Go to Authentication → Sign-in method → Enable Google
# 2. Go to Firestore Database → Create database → Start in test mode
# 3. Copy your Firebase config
```

Firebase Configuration

Create .env file in project root:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Firestore Security Rules

Go to Firestore → Rules and set:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User can only access their own data
    match /settings/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /foundContents/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /statistics/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /systemLogs/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

3. Twitter API Setup

Twitter Developer Portal

1. Go to Twitter Developer Portal
2. Create a new Project and App
3. Set App permissions to "Read and Write"
4. Enable OAuth 1.0a authentication
5. Generate all required credentials:

Required Twitter Credentials

· API Key (Consumer Key)
· API Secret Key (Consumer Secret)
· Access Token
· Access Token Secret

4. Project Structure

```
twitter-bot-dashboard/
├── netlify/
│   └── functions/
│       └── twitter-proxy.js          # Twitter API proxy
├── src/
│   ├── components/                   # React components
│   │   ├── AccountSettings.jsx       # Twitter account configuration
│   │   ├── NewsSources.jsx           # RSS feed management
│   │   ├── FoundContents.jsx         # Content discovery & management
│   │   ├── AISettings.jsx            # AI keyword configuration
│   │   ├── Statistics.jsx            # Analytics dashboard
│   │   ├── SystemLogs.jsx            # Activity logs
│   │   ├── Header.jsx                # Navigation header
│   │   ├── Login.jsx                 # Authentication
│   │   └── App.jsx                   # Main app component
│   ├── services/
│   │   ├── TwitterService.js         # Twitter API integration
│   │   ├── firebase.js               # Firebase configuration
│   │   ├── contentScanner.js         # Content scanning logic
│   │   ├── newsScraper.js            # RSS feed scraping
│   │   └── freeAIAnalyzer.js         # AI content analysis
│   ├── styles/
│   │   └── App.css                   # Main stylesheet
│   └── utils/
│       └── language.js               # Multi-language support
├── public/
│   ├── index.html
│   └── _redirects                    # Netlify routing
├── netlify.toml                      # Netlify configuration
├── package.json
└── vite.config.js
```

🚀 Development

Local Development Commands

```bash
# Install Netlify CLI globally (first time only)
npm install -g netlify-cli

# Install project dependencies
npm install

# Start development (recommended - runs both frontend and functions)
npm run dev

# Alternative: Run services separately
# Terminal 1 - Start Netlify Functions
npx netlify functions:serve

# Terminal 2 - Start Vite Dev Server
npm run dev:vite

# Build for production
npm run build

# Preview production build
npm run preview
```

Environment Variables

Create .env file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional: OpenAI API Key for enhanced AI (if needed)
VITE_OPENAI_API_KEY=your_openai_key_here
```

🌐 Deployment

Netlify Deployment

Method 1: Connect GitHub Repository

1. Go to Netlify
2. Click "Add new site" → "Import from Git"
3. Connect your GitHub repository
4. Set build settings:
   · Build command: npm run build
   · Publish directory: dist
5. Add environment variables in Netlify dashboard

Method 2: Manual Deploy

```bash
# Build the project
npm run build

# Deploy to Netlify
npx netlify deploy --prod --dir=dist
```

Netlify Environment Variables

In Netlify dashboard → Site settings → Environment variables, add:

· All Firebase environment variables from your .env file

Netlify Configuration

netlify.toml:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

📱 Usage Guide

1. Initial Setup

1. Sign In: Use Google authentication
2. Configure Accounts: Set up source and target Twitter accounts
3. Verify Credentials: Test Twitter API connection
4. Add News Sources: Configure RSS feeds to monitor
5. Set AI Keywords: Define keywords for content filtering

2. Account Configuration

· Source Account: The account whose followed users' tweets will be monitored
· Target Account: The account that will post the filtered content
· API Credentials: All four Twitter API credentials required

3. Content Management

· Auto-scanning: Configure scan frequency in News Sources
· AI Filtering: Content is analyzed against your keyword list
· Manual Approval: Review and approve content before posting
· Bulk Actions: Approve or reject multiple items at once

4. Monitoring

· Real-time Statistics: View scanning and posting metrics
· System Logs: Monitor application activity
· Content History: Track all discovered and posted content

🔧 Technical Details

Architecture

· Frontend: React 18 + Vite
· Backend: Netlify Functions (Serverless)
· Database: Firebase Firestore (NoSQL)
· Authentication: Firebase Auth
· API Integration: Twitter API v2

Key Dependencies

```json
{
  "react": "^18.2.0",
  "firebase": "^10.5.0",
  "twitter-api-v2": "^1.27.0",
  "axios": "^1.12.2",
  "netlify-cli": "^17.0.0"
}
```

File Descriptions

Core Components

· AccountSettings.jsx: Twitter account configuration and verification
· NewsSources.jsx: RSS feed management and auto-scan configuration
· FoundContents.jsx: Content discovery, filtering, and management
· AISettings.jsx: Keyword-based AI filtering configuration
· Statistics.jsx: Analytics and performance metrics
· SystemLogs.jsx: Application activity monitoring

Services

· TwitterService.js: Handles all Twitter API interactions via proxy
· contentScanner.js: Orchestrates content scanning and analysis
· newsScraper.js: Scrapes RSS and JSON feeds for content
· freeAIAnalyzer.js: Provides keyword-based content analysis

🐛 Troubleshooting

Common Issues

1. Twitter API Connection Failed

```bash
# Error: "Failed to authenticate with Twitter API"
# Solution: Verify all four credentials are correct and have proper permissions
```

2. CORS Errors in Development

```bash
# Error: "Access blocked by CORS policy"
# Solution: Make sure Netlify Functions are running with `npx netlify functions:serve`
```

3. Firebase Connection Issues

```bash
# Error: "Firebase not initialized"
# Solution: Check environment variables and Firebase project configuration
```

4. Netlify Functions Not Working

```bash
# Error: 404 on function endpoints
# Solution: Ensure functions are in `netlify/functions/` and dependencies are installed
```

Debugging Commands

```bash
# Check if functions are running
curl -X POST http://localhost:9999/.netlify/functions/twitter-proxy \
  -H "Content-Type: application/json" \
  -d '{"action":"test-connection","consumerKey":"test","consumerSecret":"test","accessToken":"test","accessTokenSecret":"test"}'

# Check Firebase connection
# - Open browser console and check for Firebase initialization messages
# - Verify user authentication works

# Check build issues
npm run build -- --debug
```

📈 Monitoring & Analytics

Firebase Console

· Firestore: Monitor database usage and collections
· Authentication: View user sign-ins and activity
· Analytics: Track user engagement (if enabled)

Netlify Analytics

· Function invocations: Monitor Twitter proxy usage
· Bandwidth: Track data transfer
· Deploy logs: Review build and deployment history

🔒 Security

Best Practices

1. Environment Variables: Never commit API keys to version control
2. Firestore Rules: Implement proper user-based security rules
3. CORS: Configure proper origins for production
4. API Rate Limiting: Implement limits to avoid Twitter API restrictions
5. Input Validation: Validate all user inputs on both client and server

Security Features

· User-based data isolation in Firestore
· Secure Twitter credential storage
· OAuth 2.0 authentication
· CORS protection
· Input sanitization

🤝 Contributing

1. Fork the repository
2. Create a feature branch: git checkout -b feature/amazing-feature
3. Commit changes: git commit -m 'Add amazing feature'
4. Push to branch: git push origin feature/amazing-feature
5. Open a Pull Request

📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments

· Twitter API v2 for social media integration
· Firebase for backend services and authentication
· Netlify for seamless deployment and serverless functions
· React & Vite for the modern frontend framework

📞 Support

For support and questions:

1. Check the GitHub Issues
2. Create a new issue with detailed description
3. Include error logs and steps to reproduce

---

Happy Automating! 🚀

Built with ❤️ using React, Firebase, and Netlify Functions.