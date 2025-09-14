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

// Simple approach - just try to run electron-rebuild with timeout
try {
  console.log('Rebuilding native modules for Electron...');
  execSync('npx electron-rebuild -f -w better-sqlite3', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    timeout: 300000 // 5 minute timeout to prevent runaway processes
  });
  console.log('✔ Native modules rebuilt successfully');
} catch (error) {
  if (error.signal === 'SIGTERM' || error.code === 'TIMEOUT') {
    console.error('❌ Rebuild timed out - this prevents runaway processes');
    console.log('💡 You can manually rebuild with: yarn rebuild');
  } else if (isCI) {
    console.log('Warning: electron-rebuild failed in CI, but continuing...');
  } else {
    console.error('Failed to rebuild native modules:', error.message);
    console.log('💡 You can manually rebuild with: yarn rebuild');
  }
  
  // Don't exit with error - let the build continue
  console.log('Continuing without rebuild...');
}