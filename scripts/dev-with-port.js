const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.stage') });

const port = process.env.PORT || '2101';

console.log(`Starting development server on port ${port}...`);

const child = spawn('npx', ['next', 'dev', '-p', port], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: port
  }
});

child.on('error', (error) => {
  console.error('Error starting development server:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Development server exited with code ${code}`);
  process.exit(code);
});
