#!/usr/bin/env bash
# Run ESLint with autofix to format and fix code issues
# Use || true to prevent non-fixable errors from blocking commits
npm run lint -- --fix --quiet || true
