# X Bot Manager - Desktop Application

## 📋 Project Overview

**X Bot Manager** is a Windows desktop application that automates content sharing between Twitter/X accounts using AI-powered analysis. The app monitors news sources and tweets from followed users, analyzes content with AI, and shares relevant posts to your target account.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Windows 10/11
- Git Bash (or any terminal)

### One-Command Build & Run
```bash
cd ~/Desktop/twitter_bot_dashboard && \
echo "=== X Bot Manager - Windows Builder ===" && \
echo "1. Checking Python installation..." && \
python --version && \
echo "2. Installing dependencies..." && \
pip install pyinstaller requests pillow && \
echo "3. Creating application icon..." && \
python -c "
from PIL import Image, ImageDraw
img = Image.new('RGB', (256, 256), color='#1da1f2')
d = ImageDraw.Draw(img)
d.ellipse([64, 64, 192, 192], fill='#ffffff')
d.ellipse([96, 96, 112, 112], fill='#1da1f2')
d.ellipse([144, 96, 160, 112], fill='#1da1f2') 
d.arc([96, 120, 160, 160], 0, 180, fill='#1da1f2', width=8)
img.save('app_icon.ico', format='ICO')
print('Icon created successfully')
" && \
echo "4. Creating build script..." && \
cat > build.py << 'ENDOFFILE'
import PyInstaller.__main__
import os
import shutil

def build_app():
    # Clean previous builds
    for folder in ['dist', 'build']:
        if os.path.exists(folder):
            shutil.rmtree(folder)
    
    # Build executable
    PyInstaller.__main__.run([
        'twitter_bot_dashboard.py',
        '--name=X-Bot-Manager',
        '--windowed',
        '--onefile',
        '--icon=app_icon.ico',
        '--hidden-import=tkinter',
        '--hidden-import=PIL',
        '--hidden-import=PIL._tkinter_finder',
        '--hidden-import=requests',
        '--hidden-import=urllib3',
        '--hidden-import=charset_normalizer',
        '--hidden-import=idna',
        '--collect-all=pil',
        '--noconfirm'
    ])

if __name__ == '__main__':
    build_app()
    print("Build completed! Check 'dist' folder for X-Bot-Manager.exe")
ENDOFFILE
&& \
echo "5. Building Windows executable..." && \
python build.py && \
echo "" && \
echo "=== BUILD SUCCESSFUL! ===" && \
echo "Your Windows app: dist/X-Bot-Manager.exe" && \
echo "" && \
read -p "Run the application now? (y/n): " run_app && \
if [ "$run_app" = "y" ] || [ "$run_app" = "Y" ]; then
    echo "Starting X Bot Manager..."
    ./dist/X-Bot-Manager.exe
fi
```

## 🛠️ Manual Build Commands

### Step-by-Step Build Process
```bash
# 1. Navigate to project directory
cd ~/Desktop/twitter_bot_dashboard

# 2. Install dependencies
pip install pyinstaller requests pillow

# 3. Create application icon
python -c "
from PIL import Image, ImageDraw
img = Image.new('RGB', (256, 256), color='#1da1f2')
d = ImageDraw.Draw(img)
d.ellipse([64, 64, 192, 192], fill='#ffffff')
d.ellipse([96, 96, 112, 112], fill='#1da1f2')
d.ellipse([144, 96, 160, 112], fill='#1da1f2')
d.arc([96, 120, 160, 160], 0, 180, fill='#1da1f2', width=8)
img.save('app_icon.ico', format='ICO')
print('Icon created')
"

# 4. Build executable
pyinstaller --onefile --windowed --icon=app_icon.ico --name "X-Bot-Manager" twitter_bot_dashboard.py

# 5. Run the application
./dist/X-Bot-Manager.exe
```

### Development Commands
```bash
# Run in development mode
python twitter_bot_dashboard.py

# Install development dependencies
pip install requests pillow

# Check application logs
tail -f twitter_bot.log

# Clean build files
rm -rf dist/ build/ __pycache__/
```

## 📁 Project Structure
```
twitter_bot_dashboard/
│
├── twitter_bot_dashboard.py    # Main application
├── build.py                    # Build script
├── app_icon.ico               # Application icon
├── requirements.txt           # Python dependencies
│
├── dist/                      # Built executable
│   └── X-Bot-Manager.exe      # Windows application
│
├── bot_data/                  # Application data
│   ├── settings.json          # User settings
│   ├── contents.csv           # Found content
│   ├── statistics.json        # Usage statistics
│   └── system_logs.txt        # Application logs
│
└── logs/                      # Runtime logs
    └── twitter_bot.log        # Detailed logs
```

## 🎯 Core Functionalities

### 1. **Account Management** 🔑
- **Dual Account System**: 
  - **Account A (Source)**: Monitors followed users for tweets
  - **Account B (Target)**: Posts approved content
- **API Configuration**: Secure storage of Twitter API credentials
- **Connection Testing**: Verify account connectivity and permissions

### 2. **News Monitoring** 📰
- **15+ International News Sources**:
  - BBC News, Reuters, Al Jazeera, The Guardian
  - Press TV, Tehran Times, Arab News, Jerusalem Post
  - China Daily, The Hindu, CNN, NBC News, DW News
- **RSS Feed Integration**: Real-time news scraping
- **Source Reliability Scoring**: Quality-based content filtering

### 3. **Tweet Monitoring** 🐦
- **Followed Users Tracking**: Monitors tweets from accounts followed by Source Account
- **Real-time Detection**: Automatic discovery of new tweets
- **Smart Filtering**: Only processes tweets from followed accounts

### 4. **AI Content Analysis** 🤖
- **Keyword Filtering**: 
  - English: `stocks`, `sales`, `market`, `news`, `technology`, `business`, `finance`, `crypto`
  - Turkish: `hisse`, `borsa`, `satış`, `piyasa`, `haber`, `teknoloji`, `iş`, `finans`
- **Sentiment Analysis**: Positive/negative/neutral classification
- **Confidence Scoring**: AI confidence levels for approval decisions
- **Multi-language Support**: English and Turkish content processing

### 5. **Content Management** 📄
- **Unified Content Feed**: Combined view of news and tweets
- **Clickable Actions**: 
  - `[Approve]` - Mark content for sharing
  - `[Reject]` - Exclude content
  - `[Post Now]` - Immediate sharing
  - `[Delete]` - Remove content
- **Status Tracking**: Pending → Approved → Posted workflow
- **Bulk Operations**: Mass approval/rejection of content

### 6. **Automation Features** ⚙️
- **Scheduled Scanning**: Automatic news source checking (configurable intervals)
- **Continuous Monitoring**: Real-time tweet monitoring from followed users
- **Auto-Posting**: Scheduled content sharing to target account
- **Manual Override**: Full control over all automated processes

### 7. **Analytics & Reporting** 📊
- **Performance Metrics**: 
  - Total content scanned
  - AI approval rates
  - Successful posts
  - System efficiency
- **Real-time Statistics**: Live dashboard with key metrics
- **Export Capabilities**: Logs and report generation

## 🔧 Technical Features

### User Interface
- **Modern Dark Theme**: Professional dark mode interface
- **Responsive Design**: Adapts to different screen sizes
- **Tabbed Navigation**: Organized workflow across 6 main sections
- **Real-time Updates**: Live content and statistics refresh

### Data Management
- **File-based Storage**: No database required (CSV, JSON, text files)
- **Automatic Backups**: Data persistence across sessions
- **Export Functionality**: Download logs and reports
- **Configurable Settings**: All preferences saved automatically

### Security & Reliability
- **Local Data Storage**: All data stays on your machine
- **Error Handling**: Graceful failure recovery
- **Comprehensive Logging**: Detailed activity tracking
- **Rate Limiting**: Respects Twitter API limits

## 🚀 Usage Workflow

### Initial Setup
1. **Configure Accounts**: Set up Source (monitoring) and Target (posting) accounts
2. **API Credentials**: Enter Twitter API keys and tokens
3. **Select News Sources**: Choose from 15+ international news providers
4. **Set AI Keywords**: Define content filtering keywords
5. **Configure Automation**: Set scanning and monitoring intervals

### Daily Operation
1. **Auto-Discovery**: App automatically finds relevant content
2. **AI Analysis**: Content filtered based on keywords and sentiment
3. **Manual Review**: Approve/reject AI-suggested content
4. **Auto-Posting**: Approved content shared to target account
5. **Monitor Performance**: Track metrics and adjust settings

## ⚡ Quick Commands Reference

### Building
```bash
# Full automated build
./build_windows.ps1

# Manual build
pyinstaller --onefile --windowed --icon=app_icon.ico --name "X-Bot-Manager" twitter_bot_dashboard.py
```

### Running
```bash
# Development mode
python twitter_bot_dashboard.py

# Production executable
./dist/X-Bot-Manager.exe

# Or double-click: dist/X-Bot-Manager.exe
```

### Maintenance
```bash
# View logs
cat twitter_bot.log

# Clean installation
pip uninstall pyinstaller requests pillow
pip install pyinstaller requests pillow

# Reset application data
rm -rf bot_data/ logs/
```

## 🆘 Troubleshooting

### Common Issues
1. **Build Fails**: Ensure Python 3.8+ and run as administrator
2. **API Errors**: Verify Twitter API credentials are valid
3. **News Not Loading**: Check internet connection and CORS proxy availability
4. **App Won't Start**: Check `twitter_bot.log` for error details

### Support Files
- **Logs**: `twitter_bot.log` and `logs/twitter_bot.log`
- **Settings**: `bot_data/settings.json`
- **Statistics**: `bot_data/statistics.json`

## 📞 Support

For issues or questions:
1. Check application logs in `twitter_bot.log`
2. Verify Twitter API credentials are valid
3. Ensure stable internet connection
4. Review built-in help sections in the application

---

**🎉 Your X Bot Manager is now ready! The application provides complete automation for content discovery, AI analysis, and strategic sharing on Twitter/X.**