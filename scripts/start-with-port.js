const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Determine which env file to use
const envFile = process.env.ENV_FILE || '.env.prod';
const envPath = path.resolve(__dirname, '..', envFile);

// Load environment variables
require('dotenv').config({ path: envPath });

// Get port from environment variable
const port = process.env.PORT || 3000;

console.log(`Loading environment from: ${envFile}`);
console.log(`Starting production server on port ${port}...`);

// Start Next.js in production mode
const start = spawn('next', ['start', '-p', port.toString()], {
  stdio: 'inherit',
  shell: true
});

start.on('error', (error) => {
  console.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});

start.on('close', (code) => {
  if (code !== 0) {
    console.error(`Server exited with code ${code}`);
  }
  process.exit(code);
});

// Handle termination signals
process.on('SIGINT', () => {
  start.kill('SIGINT');
});

process.on('SIGTERM', () => {
  start.kill('SIGTERM');
});