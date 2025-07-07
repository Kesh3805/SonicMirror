#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🎵 SonicMirror Gemini AI Setup');
console.log('================================');
console.log('');
console.log('To use the AI-powered insights, you need a Gemini API key.');
console.log('Follow these steps:');
console.log('');
console.log('1. Go to https://makersuite.google.com/app/apikey');
console.log('2. Sign in with your Google account');
console.log('3. Click "Create API Key"');
console.log('4. Copy the generated API key');
console.log('');

rl.question('Enter your Gemini API key: ', (apiKey) => {
  if (!apiKey || apiKey.trim() === '') {
    console.log('❌ No API key provided. Setup cancelled.');
    rl.close();
    return;
  }

  const envPath = path.join(__dirname, '.env');
  let envContent = '';

  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Check if GEMINI_API_KEY already exists
  if (envContent.includes('GEMINI_API_KEY=')) {
    // Replace existing key
    envContent = envContent.replace(
      /GEMINI_API_KEY=.*/g,
      `GEMINI_API_KEY="${apiKey.trim()}"`
    );
  } else {
    // Add new key
    envContent += `\nGEMINI_API_KEY="${apiKey.trim()}"\n`;
  }

  // Write back to .env file
  fs.writeFileSync(envPath, envContent);

  console.log('');
  console.log('✅ Gemini API key configured successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Restart your backend server');
  console.log('2. Try the AI features in SonicMirror');
  console.log('');
  console.log('If you encounter issues:');
  console.log('- Make sure your API key is valid');
  console.log('- Check that you have sufficient quota');
  console.log('- Verify the .env file is in the backend directory');
  console.log('');

  rl.close();
}); 