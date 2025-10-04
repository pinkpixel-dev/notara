#!/usr/bin/env bash
# Install all dependencies needed to run the project
# Use npm ci for faster, more reproducible installs when package-lock.json exists
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
