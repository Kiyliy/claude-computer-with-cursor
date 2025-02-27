const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();
const logger = require('./utils/logger');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class CursorOperatorClient {
  constructor(serverUrl) {
    // 然后使用默认端口
    const PORT = process.env.PORT || 3000;
    
    // 设置服务器 URL
    this.serverUrl = serverUrl || `http://localhost:${PORT}`;
    
    // 调试输出
    logger.info('Client', `Initializing client with server URL: ${this.serverUrl}`, {
      port: PORT,
      processEnvPort: process.env.PORT
    });
    
    this.client = axios.create({
      baseURL: this.serverUrl,
      timeout: 30000,
    });
    
    logger.debug('Client', 'Axios client created with configuration', {
      baseURL: this.serverUrl,
      timeout: 30000
    });
  }

  /**
   * Get information about the screen and cursor
   * 
   * @returns {Promise<object>} - Screen size and cursor position
   */
  async getScreenInfo() {
    try {
      logger.debug('Client', 'Requesting screen info from server');
      const startTime = Date.now();
      
      const response = await this.client.get('/screen-info');
      
      const elapsedTime = Date.now() - startTime;
      logger.info('Client', `Received screen info from server in ${elapsedTime}ms`, response.data);
      
      return response.data;
    } catch (error) {
      logger.error('Client', 'Error getting screen info', { 
        error: error.message, 
        stack: error.stack,
        code: error.code,
        response: error.response?.data
      });
      console.error('Error getting screen info:', error.message);
      throw error;
    }
  }

  /**
   * Execute a cursor action
   * 
   * @param {string} action - The action to execute (move, click, double-click, drag)
   * @param {object} params - Parameters for the action
   * @returns {Promise<object>} - Result of the action
   */
  async executeCursorAction(action, params) {
    try {
      logger.debug('Client', `Executing cursor action: ${action}`, { params });
      const startTime = Date.now();
      
      const response = await this.client.post('/cursor-action', {
        action,
        params
      });
      
      const elapsedTime = Date.now() - startTime;
      logger.info('Client', `Cursor action ${action} completed in ${elapsedTime}ms`, response.data);
      
      return response.data;
    } catch (error) {
      logger.error('Client', `Error executing cursor action ${action}`, { 
        error: error.message, 
        stack: error.stack,
        params,
        code: error.code,
        response: error.response?.data
      });
      console.error(`Error executing cursor action ${action}:`, error.message);
      throw error;
    }
  }

  /**
   * Perform pair programming with Claude
   * 
   * @param {string} screenCapture - Base64 encoded screenshot
   * @param {object} context - Context about what the user is working on
   * @param {string} goal - The goal the user wants to achieve
   * @returns {Promise<object>} - Result of the pair programming
   */
  async pairProgram(screenCapture, context, goal) {
    try {
      logger.info('Client', 'Starting pair programming session', { 
        context,
        goal,
        screenCaptureSize: screenCapture.length
      });
      
      logger.debug('Client', 'Sending pair programming request to server');
      const startTime = Date.now();
      
      const response = await this.client.post('/pair-program', {
        screenCapture,
        context,
        goal
      });
      
      const elapsedTime = Date.now() - startTime;
      logger.info('Client', `Pair programming completed in ${elapsedTime}ms`, { 
        actionsPerformed: response.data.actionsPerformed,
        finalPosition: response.data.finalPosition
      });
      
      return response.data;
    } catch (error) {
      logger.error('Client', 'Error during pair programming', { 
        error: error.message, 
        stack: error.stack,
        goal,
        context,
        code: error.code,
        response: error.response?.data
      });
      console.error('Error during pair programming:', error.message);
      throw error;
    }
  }

  /**
   * Start interactive client for pair programming
   */
  async startInteractive() {
    logger.info('Client', 'Starting interactive client session');
    
    console.log('=========================================');
    console.log('Claude Cursor Operator - Pair Programming');
    console.log('=========================================');
    
    try {
      // Get screen info
      logger.debug('Client', 'Requesting initial screen info');
      const screenInfo = await this.getScreenInfo();
      
      logger.info('Client', 'Initial screen info received', {
        screenWidth: screenInfo.screen.width,
        screenHeight: screenInfo.screen.height,
        cursorX: screenInfo.cursor.x,
        cursorY: screenInfo.cursor.y
      });
      
      console.log(`\nScreen size: ${screenInfo.screen.width}x${screenInfo.screen.height}`);
      console.log(`Current cursor position: (${screenInfo.cursor.x}, ${screenInfo.cursor.y})`);
      
      this.promptForGoal();
    } catch (error) {
      logger.error('Client', 'Failed to start interactive session', { 
        error: error.message, 
        stack: error.stack
      });
      console.error('Failed to start interactive session:', error.message);
      rl.close();
    }
  }
  
  /**
   * Prompt user for their programming goal
   */
  promptForGoal() {
    logger.debug('Client', 'Prompting user for programming goal');
    
    rl.question('\nWhat programming task would you like help with? ', async (goal) => {
      logger.info('Client', 'User provided programming goal', { goal });
      
      if (goal.toLowerCase() === 'exit' || goal.toLowerCase() === 'quit') {
        logger.info('Client', 'User requested to exit');
        console.log('Exiting...');
        rl.close();
        return;
      }
      
      await this.collectContext(goal);
    });
  }
  
  /**
   * Collect context about what the user is working on
   * 
   * @param {string} goal - The user's goal
   */
  async collectContext(goal) {
    logger.debug('Client', 'Prompting user for work context', { goal });
    
    rl.question('\nBriefly describe what you are working on (e.g., "React component", "Python script"): ', async (workContext) => {
      logger.info('Client', 'User provided work context', { workContext, goal });
      
      const context = {
        workType: workContext,
        environment: process.platform,
        timestamp: new Date().toISOString()
      };
      
      logger.debug('Client', 'Context object created', context);
      console.log('\nCapturing screen...');
      
      try {
        // Capture the screen using the API
        logger.debug('Client', 'Requesting screen capture from server');
        const captureStartTime = Date.now();
        
        const captureResponse = await this.client.get('/screen-capture');
        
        const captureElapsedTime = Date.now() - captureStartTime;
        logger.info('Client', `Screen capture completed in ${captureElapsedTime}ms`, {
          captureSize: captureResponse.data.screenCapture.length
        });
        
        const base64Image = captureResponse.data.screenCapture;
        
        console.log('Processing with Claude...');
        logger.info('Client', 'Starting pair programming with captured screen', {
          goal,
          workContext
        });
        
        const pairStartTime = Date.now();
        const result = await this.pairProgram(base64Image, context, goal);
        const pairElapsedTime = Date.now() - pairStartTime;
        
        logger.info('Client', `Pair programming session completed in ${pairElapsedTime}ms`, {
          actionsPerformed: result.actionsPerformed,
          finalPositionX: result.finalPosition.x,
          finalPositionY: result.finalPosition.y
        });
        
        console.log(`\nCompleted ${result.actionsPerformed} cursor actions`);
        console.log(`Final cursor position: (${result.finalPosition.x}, ${result.finalPosition.y})`);
        
        // Ask for next goal
        logger.debug('Client', 'Prompting for next goal');
        this.promptForGoal();
      } catch (error) {
        logger.error('Client', 'Error during screen capture or pair programming', {
          error: error.message,
          stack: error.stack,
          goal,
          workContext
        });
        console.error('Error:', error.message);
        this.promptForGoal();
      }
    });
  }
}

// If called directly, start the client
if (require.main === module) {
  logger.info('ClientMain', 'Starting Claude Cursor Operator client');
  const client = new CursorOperatorClient();
  client.startInteractive().catch(error => {
    logger.error('ClientMain', 'Unhandled error in interactive client', {
      error: error.message,
      stack: error.stack
    });
    console.error(error);
  });
}

module.exports = CursorOperatorClient;