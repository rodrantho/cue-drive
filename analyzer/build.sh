#!/bin/bash
# Build the Python analyzer into a standalone binary using PyInstaller
# Run this before building the Tauri app

set -e

echo "Installing Python dependencies..."
pip3 install -r requirements.txt
pip3 install pyinstaller

echo "Building standalone analyzer binary..."
pyinstaller \
  --onefile \
  --name analyzer \
  --distpath ../src-tauri/binaries \
  --hidden-import=librosa \
  --hidden-import=soundfile \
  --hidden-import=numpy \
  analyzer.py

echo "Done. Binary at ../src-tauri/binaries/analyzer"
