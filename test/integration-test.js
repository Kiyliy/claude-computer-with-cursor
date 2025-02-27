/**
 * Integration test script for Claude Cursor Operator
 * 
 * This script tests the complete integration flow by:
 * 1. Starting the server
 * 2. Taking a screenshot
 * 3. Sending the screenshot to Claude
 * 4. Processing cursor instructions
 * 5. Executing cursor movements
 * 
 * To run this test:
 * node test/integration-test.js
 * 
 * Note: This test requires a valid ANTHROPIC_API_KEY in your .env file
 */

require('dotenv').config();
const axios = require('axios');
const { captureAndSaveScreen } = require('../src/screen-capture');

// Verify API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY is required');
  process.exit(1);
}

// Test configuration
const SERVER_URL = 'http://localhost:3000';
const TEST_GOAL = 'Move the cursor to the center of the screen and click';
const TEST_CONTEXT = {
  workType: 'Integration test',
  environment: process.platform,
  timestamp: new Date().toISOString()
};

async function runIntegrationTest() {
  try {
    console.log('Starting integration test...');
    
    // 1. Verify server is running
    console.log('Checking server status...');
    const serverInfo = await axios.get(`${SERVER_URL}/screen-info`);
    console.log(`Server running. Screen size: ${JSON.stringify(serverInfo.data.screen)}`);
    
    // 2. Capture screen
    console.log('Capturing screen...');
    const captureFile = await captureAndSaveScreen('./test/captures');
    console.log(`Screen captured and saved to ${captureFile}`);
    
    // 3. Get screen capture as base64
    console.log('Getting screen capture from API...');
    const captureResponse = await axios.get(`${SERVER_URL}/screen-capture`);
    const screenCapture = captureResponse.data.screenCapture;
    
    // 4. Send to pair programming endpoint
    console.log('Sending to Claude for pair programming...');
    console.log(`Goal: ${TEST_GOAL}`);
    console.log(`Context: ${JSON.stringify(TEST_CONTEXT)}`);
    
    const startTime = Date.now();
    const pairResponse = await axios.post(`${SERVER_URL}/pair-program`, {
      screenCapture,
      context: TEST_CONTEXT,
      goal: TEST_GOAL
    });
    const endTime = Date.now();
    
    // 5. Check results
    console.log('\nTest Results:');
    console.log('-------------');
    console.log(`Status: ${pairResponse.status === 200 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Actions Performed: ${pairResponse.data.actionsPerformed}`);
    console.log(`Final Cursor Position: (${pairResponse.data.finalPosition.x}, ${pairResponse.data.finalPosition.y})`);
    console.log(`Time Taken: ${(endTime - startTime) / 1000} seconds`);
    
    return true;
  } catch (error) {
    console.error('Integration test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Run the test
runIntegrationTest()
  .then(success => {
    if (success) {
      console.log('\nIntegration test completed successfully!');
    } else {
      console.error('\nIntegration test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error during test:', error);
    process.exit(1);
  });