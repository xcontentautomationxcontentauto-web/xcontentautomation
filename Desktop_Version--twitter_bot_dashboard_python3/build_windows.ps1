# Windows PowerShell Build Script for X Bot Manager
Write-Host "=========================================" -ForegroundColor Green
Write-Host "    X Bot Manager - Windows Builder" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Check Python
Write-Host "Checking Python installation..." -ForegroundColor Yellow
python --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Python 3.8+ from python.org" -ForegroundColor Red
    pause
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install pyinstaller requests pillow

# Create app icon
Write-Host "Creating application icon..." -ForegroundColor Yellow
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

# Create build script
Write-Host "Creating build configuration..." -ForegroundColor Yellow
@'
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
'@ | Out-File -FilePath "build.py" -Encoding utf8

# Build the application
Write-Host "Building Windows executable..." -ForegroundColor Yellow
python build.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=========================================" -ForegroundColor Green
    Write-Host "    BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Your executable: dist\X-Bot-Manager.exe" -ForegroundColor Cyan
    Write-Host "`nTo run your app: .\dist\X-Bot-Manager.exe" -ForegroundColor Cyan
    
    # Ask to run the app
    $run = Read-Host "`nRun the application now? (y/n)"
    if ($run -eq 'y' -or $run -eq 'Y') {
        Write-Host "Starting X Bot Manager..." -ForegroundColor Green
        Start-Process "dist\X-Bot-Manager.exe"
    }
} else {
    Write-Host "`nBuild failed! Check errors above." -ForegroundColor Red
}

pause
