/**
 * Start-all script for Claude Cursor Operator
 * 
 * This script starts both the server and client in the same terminal window.
 * The server will run in the background while the client runs in the foreground.
 */

const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

// Import logger
const logger = require('./src/utils/logger');

logger.info('StartAll', 'Starting Claude Cursor Operator');

// Start server
logger.info('StartAll', 'Starting server component...');
const serverProcess = spawn('node', [path.join(__dirname, 'src', 'index.js')], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true
});

let serverStarted = false;
const serverTimeout = setTimeout(() => {
  if (!serverStarted) {
    logger.error('StartAll', 'Server failed to start within timeout period');
    console.error('\n[ERROR] Server failed to start within timeout period. Check logs for details.');
    process.exit(1);
  }
}, 5000);

// Listen for server stdout
serverProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  
  console.log(`[SERVER] ${output}`);
  
  // Check if server has started successfully
  if (output.includes('Cursor operator server running on port')) {
    serverStarted = true;
    clearTimeout(serverTimeout);
    
    // Start client after server has started
    startClient();
  }
});

// Listen for server stderr
serverProcess.stderr.on('data', (data) => {
  console.error(`[SERVER ERROR] ${data.toString().trim()}`);
});

// Handle server exit
serverProcess.on('exit', (code) => {
  logger.warn('StartAll', `Server process exited with code ${code}`);
  console.log(`\n[WARN] Server process exited with code ${code}`);
  
  // If client is still running, we can continue, otherwise exit
  if (!clientStarted) {
    process.exit(code || 0);
  }
});

// Flag to track if client has started
let clientStarted = false;

// Function to start client
function startClient() {
  logger.info('StartAll', 'Starting client component...');
  console.log('\n[INFO] Starting client component...');
  
  // Give the server a moment to fully initialize
  setTimeout(() => {
    const clientProcess = spawn('node', [path.join(__dirname, 'src', 'client.js')], {
      stdio: 'inherit'
    });
    
    clientStarted = true;
    
    // Handle client exit
    clientProcess.on('exit', (code) => {
      logger.info('StartAll', `Client process exited with code ${code}`);
      console.log(`\n[INFO] Client process exited with code ${code}`);
      
      // Kill server process when client exits
      if (serverProcess && !serverProcess.killed) {
        logger.info('StartAll', 'Terminating server process');
        
        // On Windows use different approach to kill the process
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
        } else {
          process.kill(-serverProcess.pid, 'SIGTERM');
        }
      }
      
      process.exit(code || 0);
    });
  }, 1000);
}

// Handle process termination
process.on('SIGINT', () => {
  logger.info('StartAll', 'Received SIGINT, shutting down');
  console.log('\n[INFO] Shutting down...');
  
  if (serverProcess && !serverProcess.killed) {
    // On Windows use different approach to kill the process
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
    } else {
      process.kill(-serverProcess.pid, 'SIGTERM');
    }
  }
  
  process.exit(0);
}); 