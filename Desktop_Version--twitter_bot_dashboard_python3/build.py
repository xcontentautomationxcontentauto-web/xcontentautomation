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
