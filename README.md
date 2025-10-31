
🤖 Twitter Bot Dashboard - Complete Setup Guide

A comprehensive React-based dashboard for automating Twitter/X content sharing with AI-powered filtering and real-time monitoring.

🚀 Live Demo

· Netlify URL: https://xcontentautomation.netlify.app/
· GitHub Repository: https://github.com/xcontentautomationxcontentauto-web/xcontentautomation

---

📋 Prerequisites

Before you begin, ensure you have:

· Node.js 18+ installed
· A Firebase account
· A Twitter Developer account
· A Netlify account
· A GitHub account

---

🛠️ Local Development Setup

1. Clone the Repository

```bash
git clone https://github.com/xcontentautomationxcontentauto-web/xcontentautomation.git
cd twitter-bot-dashboard
```

2. Install Dependencies

```bash
npm install
```

3. Environment Setup

Create a .env file in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

4. Start Development Servers

Option A: Two-Terminal Setup (Recommended for Development)

```bash
# Terminal 1 - Start Netlify Functions
npx netlify functions:serve

# Terminal 2 - Start Frontend Development Server
npm run dev:vite
```

Option B: Single Command (If configured)

```bash
npm run dev
```

5. Access Your Local App

· Frontend: http://localhost:5173
· Functions: http://localhost:9999/.netlify/functions/twitter-proxy

---

🔥 Firebase Setup

1. Create Firebase Project

1. Go to Firebase Console
2. Click "Add project"
3. Enter project name: twitter-bot-dashboard
4. Disable Google Analytics (not needed)
5. Create project

2. Enable Authentication

1. In Firebase Console, go to Authentication
2. Click "Get started"
3. Go to Sign-in method tab
4. Enable Google provider
5. Add your domain to authorized domains

3. Setup Firestore Database

1. Go to Firestore Database
2. Click "Create database"
3. Choose "Start in test mode"
4. Select your preferred location
5. Create database

4. Get Firebase Configuration

1. Go to Project settings (gear icon)
2. Scroll to "Your apps"
3. Click Web icon
4. Register app: twitter-bot-dashboard
5. Copy configuration object to your .env file

5. Firestore Security Rules

Go to Firestore → Rules and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
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

---

🐦 Twitter API Setup

1. Apply for Twitter Developer Access

1. Go to Twitter Developer Portal
2. Apply for a developer account
3. Create a new Project and App

2. Get API Credentials

You need ALL four credentials:

· API Key (Consumer Key)
· API Secret Key (Consumer Secret)
· Access Token
· Access Token Secret

3. Configure App Settings

In your Twitter App:

· App permissions: "Read and Write"
· App type: "Web App, Automated App or Bot"
· Callback URL: http://localhost:3000 (for development)

---

🌐 Netlify Deployment

1. Prepare for Deployment

```bash
# Build the project locally
npm run build

# Test the build locally
npm run preview
```

2. Deploy to Netlify

Option A: Connect GitHub Repository (Recommended)

1. Go to Netlify
2. Click "Add new site" → "Import from Git"
3. Connect your GitHub account
4. Select your repository
5. Configure build settings:
   · Build command: npm run build
   · Publish directory: dist
6. Add environment variables in Netlify dashboard

Option B: Manual Deploy

```bash
# Build the project
npm run build

# Install Netlify CLI
npm install -g netlify-cli

# Deploy manually
netlify deploy --prod --dir=dist
```

3. Configure Environment Variables in Netlify

In Netlify dashboard:

1. Go to Site settings → Environment variables
2. Add all Firebase variables from your .env file

4. Netlify Functions

Your functions in netlify/functions/ will auto-deploy. Verify in Netlify dashboard:

· Site settings → Functions
· Should see twitter-proxy function deployed

---

📁 Project Structure

```
twitter-bot-dashboard/
├── netlify/
│   └── functions/
│       └── twitter-proxy.js          # Twitter API proxy
├── public/
│   ├── index.html
│   └── _redirects                    # SPA routing
├── src/
│   ├── components/                   # React components
│   │   ├── AccountSettings.jsx
│   │   ├── NewsSources.jsx
│   │   ├── FoundContents.jsx
│   │   ├── AISettings.jsx
│   │   ├── Statistics.jsx
│   │   ├── SystemLogs.jsx
│   │   ├── Header.jsx
│   │   ├── Login.jsx
│   │   └── Dashboard.jsx
│   ├── services/                     # API services
│   │   ├── firebase.js
│   │   ├── TwitterService.js
│   │   ├── contentScanner.js
│   │   ├── newsScraper.js
│   │   └── freeAIAnalyzer.js
│   ├── styles/
│   │   └── App.css                   # Main stylesheet
│   ├── utils/
│   │   └── language.js               # Multi-language support
│   ├── App.jsx                       # Main app component
│   └── main.jsx                      # App entry point
├── netlify.toml                      # Netlify configuration
├── vite.config.js                    # Vite configuration
├── package.json
└── README.md
```

---

🔧 Available Scripts

```bash
# Development
npm run dev              # Start Netlify Dev (frontend + functions)
npm run dev:vite         # Start only Vite dev server
npm run dev:functions    # Start only Netlify functions

# Build & Deploy
npm run build           # Build for production
npm run preview         # Preview production build

# Netlify CLI
npx netlify dev         # Start Netlify development environment
npx netlify functions:serve  # Serve functions locally
npx netlify deploy      # Deploy to Netlify
```

---

⚙️ Configuration Files

netlify.toml

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

package.json Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "firebase": "^10.5.0",
    "axios": "^1.12.2",
    "twitter-api-v2": "^1.27.0"
  },
  "devDependencies": {
    "vite": "^4.4.0",
    "netlify-cli": "^17.0.0"
  }
}
```

---

🎯 Features

✅ Account Settings

· Configure source and target Twitter accounts
· Real-time credential verification
· Secure credential storage in Firestore

✅ News Sources

· RSS feed integration
· Configurable scan intervals
· Multiple news source support

✅ AI Content Filtering

· Keyword-based content analysis
· Multi-language support (English/Turkish)
· Sentiment analysis
· Custom text injection

✅ Found Contents

· Real-time content discovery
· Pagination and search
· Bulk approval actions
· Content expansion/collapse

✅ Statistics & Analytics

· Real-time performance metrics
· AI approval rates
· System efficiency tracking

✅ System Logs

· Comprehensive activity tracking
· Export functionality
· Filterable log levels

---

🔄 Deployment Workflow

Local Development

```bash
# 1. Start functions server
npx netlify functions:serve

# 2. Start frontend (in new terminal)
npm run dev:vite

# 3. Access at http://localhost:5173
```

Production Deployment

```bash
# 1. Commit changes
git add .
git commit -m "Your commit message"
git push origin main

# 2. Netlify auto-deploys
# 3. Verify at https://xcontentautomation.netlify.app
```

---

🚨 Troubleshooting

Common Issues & Solutions

1. Twitter API 404 Errors

```bash
# Make sure functions are running
npx netlify functions:serve

# Check function logs
netlify functions:list
```

2. Firebase Connection Issues

· Verify environment variables are set
· Check Firestore security rules
· Ensure Authentication is enabled

3. CORS Errors

· Ensure you're using the proxy, not direct Twitter API calls
· Check Netlify function is deployed and running

4. Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

5. Netlify Function Timeouts

· Increase timeout in netlify.toml
· Optimize Twitter API calls

---

📞 Support

If you encounter issues:

1. Check the logs: Browser console + Netlify function logs
2. Verify configurations: All environment variables set correctly
3. Test locally: Ensure everything works in development first
4. Check dependencies: All packages properly installed

---

🔒 Security Notes

· API keys are stored securely in environment variables
· User data is isolated by user ID in Firestore
· Twitter credentials are never exposed to the frontend
· All external API calls go through secure proxies

---

🎉 Success Checklist

· Local development working
· Firebase project configured
· Twitter API credentials obtained
· Netlify site deployed
· Environment variables set
· Twitter account verification working
· Content scanning functional
· AI filtering operational

---

📝 License

This project is for educational and development purposes. Ensure compliance with Twitter API Terms of Service and applicable laws.

---

Happy Bot Building! 🚀

For any questions or issues, refer to the troubleshooting section or check the browser console for detailed error messages.