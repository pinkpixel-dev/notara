#!/usr/bin/env bash
# Run ESLint with autofix to format and fix code issues
# Check if local ESLint is installed to avoid falling back to global version
if [ ! -x node_modules/.bin/eslint ]; then
  echo "Skipping format: local ESLint not installed. Run .mentat/setup.sh first."
  exit 0
fi
# Use || true to prevent non-fixable errors from blocking commits
npm run -s lint -- --fix --quiet || true
