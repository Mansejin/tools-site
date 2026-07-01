@echo off
cd /d "%~dp0"
echo Starting preview server at http://localhost:8080
echo Press Ctrl+C to stop.
start "" "http://localhost:8080/"
py -3 -m http.server 8080
