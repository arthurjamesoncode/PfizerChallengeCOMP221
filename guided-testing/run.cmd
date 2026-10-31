@echo off
REM Serve the app locally on http://127.0.0.1:5173/
cd /d "%~dp0"
python serve.py 5173
