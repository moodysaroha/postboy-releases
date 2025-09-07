#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Running postinstall script...');

// Check if we're in a CI environment
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

// Only run electron-rebuild if we're not in CI or if Electron is definitely installed
const electronPath = path.join(__dirname, '..', 'node_modules', 'electron');
const electronExists = fs.existsSync(electronPath);

if (!electronExists && isCI) {
  console.log('Skipping electron-rebuild in CI environment (Electron not yet installed)');
  process.exit(0);
}

// Simple approach - just try to run electron-rebuild
try {
  console.log('Rebuilding native modules for Electron...');
  execSync('npx electron-rebuild -f -w better-sqlite3', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('Native modules rebuilt successfully');
} catch (error) {
  if (isCI) {
    console.log('Warning: electron-rebuild failed in CI, but continuing...');
    process.exit(0);
  } else {
    console.error('Failed to rebuild native modules:', error.message);
    process.exit(1);
  }
}