const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class CursorOperatorClient {
  constructor(serverUrl = `http://localhost:${process.env.PORT || 3000}`) {
    console.log(`Using server URL: ${serverUrl}, process.env.PORT: ${process.env.PORT}`);
    this.serverUrl = serverUrl;
    this.client = axios.create({
      baseURL: serverUrl,
      timeout: 30000,
    });
  }

  /**
   * Get information about the screen and cursor
   * 
   * @returns {Promise<object>} - Screen size and cursor position
   */
  async getScreenInfo() {
    try {
      const response = await this.client.get('/screen-info');
      return response.data;
    } catch (error) {
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
      const response = await this.client.post('/cursor-action', {
        action,
        params
      });
      return response.data;
    } catch (error) {
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
      const response = await this.client.post('/pair-program', {
        screenCapture,
        context,
        goal
      });
      return response.data;
    } catch (error) {
      console.error('Error during pair programming:', error.message);
      throw error;
    }
  }

  /**
   * Start interactive client for pair programming
   */
  async startInteractive() {
    console.log('=========================================');
    console.log('Claude Cursor Operator - Pair Programming');
    console.log('=========================================');
    
    try {
      // Get screen info
      const screenInfo = await this.getScreenInfo();
      console.log(`\nScreen size: ${screenInfo.screen.width}x${screenInfo.screen.height}`);
      console.log(`Current cursor position: (${screenInfo.cursor.x}, ${screenInfo.cursor.y})`);
      
      this.promptForGoal();
    } catch (error) {
      console.error('Failed to start interactive session:', error.message);
      rl.close();
    }
  }
  
  /**
   * Prompt user for their programming goal
   */
  promptForGoal() {
    rl.question('\nWhat programming task would you like help with? ', async (goal) => {
      if (goal.toLowerCase() === 'exit' || goal.toLowerCase() === 'quit') {
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
    rl.question('\nBriefly describe what you are working on (e.g., "React component", "Python script"): ', async (workContext) => {
      const context = {
        workType: workContext,
        environment: process.platform,
        timestamp: new Date().toISOString()
      };
      
      console.log('\nCapturing screen...');
      
      try {
        // Capture the screen using the API
        const captureResponse = await this.client.get('/screen-capture');
        const base64Image = captureResponse.data.screenCapture;
        
        console.log('Processing with Claude...');
        const result = await this.pairProgram(base64Image, context, goal);
        
        console.log(`\nCompleted ${result.actionsPerformed} cursor actions`);
        console.log(`Final cursor position: (${result.finalPosition.x}, ${result.finalPosition.y})`);
        
        // Ask for next goal
        this.promptForGoal();
      } catch (error) {
        console.error('Error:', error.message);
        this.promptForGoal();
      }
    });
  }
}

// If called directly, start the client
if (require.main === module) {
  const client = new CursorOperatorClient();
  client.startInteractive().catch(console.error);
}

module.exports = CursorOperatorClient;