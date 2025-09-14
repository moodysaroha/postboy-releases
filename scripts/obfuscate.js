#!/usr/bin/env node

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

console.log('🔒 Obfuscating source code for release...');

// Configuration for obfuscation
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false, // Disable to avoid issues in production
  debugProtectionInterval: 0,
  disableConsoleOutput: false, // Keep console for debugging
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

function obfuscateFile(filePath, outputPath) {
  try {
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions);
    fs.writeFileSync(outputPath, obfuscatedCode.getObfuscatedCode());
    console.log(`✓ Obfuscated: ${path.relative(process.cwd(), filePath)}`);
  } catch (error) {
    console.warn(`⚠️ Failed to obfuscate ${filePath}:`, error.message);
    // Copy original file if obfuscation fails
    fs.copyFileSync(filePath, outputPath);
  }
}

function obfuscateDirectory(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const items = fs.readdirSync(srcDir);
  
  for (const item of items) {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      obfuscateDirectory(srcPath, destPath);
    } else if (item.endsWith('.js') && !item.includes('.min.') && !item.includes('node_modules')) {
      obfuscateFile(srcPath, destPath);
    } else {
      // Copy non-JS files as-is
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Create backup and obfuscate in place for packaging
const srcDir = path.join(__dirname, '..', 'src');
const backupDir = path.join(__dirname, '..', 'src-backup');

console.log('📦 Creating backup of original source...');
// Create backup of original source
if (fs.existsSync(backupDir)) {
  fs.rmSync(backupDir, { recursive: true });
}
fs.cpSync(srcDir, backupDir, { recursive: true });

console.log('🔒 Obfuscating source files in place...');
// Obfuscate JS files in the src directory directly
function obfuscateInPlace(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      obfuscateInPlace(itemPath);
    } else if (item.endsWith('.js') && !item.includes('.min.')) {
      try {
        const sourceCode = fs.readFileSync(itemPath, 'utf8');
        const obfuscatedCode = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions);
        fs.writeFileSync(itemPath, obfuscatedCode.getObfuscatedCode());
        console.log(`✓ Obfuscated: ${path.relative(process.cwd(), itemPath)}`);
      } catch (error) {
        console.warn(`⚠️ Failed to obfuscate ${itemPath}:`, error.message);
      }
    }
  }
}

obfuscateInPlace(srcDir);

console.log('✅ Source code obfuscation complete!');
console.log('📁 Original source backed up to: src-backup');
console.log('🔒 Source files are now obfuscated for secure packaging');

// Add cleanup function for after build
process.on('exit', () => {
  console.log('🔄 Restoring original source files...');
  if (fs.existsSync(backupDir)) {
    fs.rmSync(srcDir, { recursive: true });
    fs.cpSync(backupDir, srcDir, { recursive: true });
    fs.rmSync(backupDir, { recursive: true });
    console.log('✅ Original source files restored');
  }
});

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n🛑 Build interrupted, restoring source files...');
  if (fs.existsSync(backupDir)) {
    fs.rmSync(srcDir, { recursive: true });
    fs.cpSync(backupDir, srcDir, { recursive: true });
    fs.rmSync(backupDir, { recursive: true });
  }
  process.exit(1);
});
