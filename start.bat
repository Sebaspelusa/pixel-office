@echo off
title Pixel HQ - OpenCode Agent Visualizer
cd /d "%~dp0"
start "" "http://localhost:3000/pixel-agents"
npm run dev -- --port 3000
