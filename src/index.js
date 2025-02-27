require('dotenv').config();
const express = require('express');
const robot = require('robotjs');
const { getCursorInstructions } = require('./claude-api');
const { captureScreen, getCurrentScreenCapture } = require('./screen-capture');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize cursor controller
const cursorController = {
  moveTo: (x, y) => {
    logger.debug('CursorController', `Moving cursor to coordinates (${x}, ${y})`);
    robot.moveMouse(x, y);
    logger.info('CursorController', `Cursor moved to (${x}, ${y})`);
  },
  click: (button = 'left') => {
    logger.debug('CursorController', `Clicking ${button} mouse button`);
    robot.mouseClick(button);
    logger.info('CursorController', `Clicked ${button} mouse button`);
  },
  doubleClick: (button = 'left') => {
    logger.debug('CursorController', `Double-clicking ${button} mouse button`);
    robot.mouseClick(button, true);
    logger.info('CursorController', `Double-clicked ${button} mouse button`);
  },
  dragTo: (x, y) => {
    const startPos = robot.getMousePos();
    logger.debug('CursorController', `Dragging from (${startPos.x}, ${startPos.y}) to (${x}, ${y})`);
    robot.mouseToggle('down');
    robot.moveMouse(x, y);
    robot.mouseToggle('up');
    logger.info('CursorController', `Dragged from (${startPos.x}, ${startPos.y}) to (${x}, ${y})`);
  },
  getCurrentPosition: () => {
    const pos = robot.getMousePos();
    logger.debug('CursorController', `Getting current cursor position: (${pos.x}, ${pos.y})`);
    return pos;
  },
  getScreenSize: () => {
    const size = robot.getScreenSize();
    logger.debug('CursorController', `Getting screen size: ${size.width}x${size.height}`);
    return size;
  }
};

// API endpoint to get screen info
app.get('/screen-info', (req, res) => {
  logger.info('API', 'Received request for screen info');
  try {
    const screenSize = cursorController.getScreenSize();
    const cursorPosition = cursorController.getCurrentPosition();
    
    const response = {
      screen: screenSize,
      cursor: cursorPosition
    };
    
    logger.info('API', 'Sending screen info response', { 
      screenWidth: screenSize.width, 
      screenHeight: screenSize.height,
      cursorX: cursorPosition.x,
      cursorY: cursorPosition.y
    });
    
    res.json(response);
  } catch (error) {
    logger.error('API', 'Error getting screen info', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to capture screen
app.get('/screen-capture', (req, res) => {
  logger.info('API', 'Received request for screen capture');
  try {
    logger.debug('API', 'Capturing screen...');
    const screenCapture = getCurrentScreenCapture();
    logger.info('API', 'Screen captured successfully', { 
      captureSize: screenCapture.length 
    });
    
    res.json({
      screenCapture
    });
  } catch (error) {
    logger.error('API', 'Error capturing screen', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to execute cursor actions
app.post('/cursor-action', async (req, res) => {
  const { action, params } = req.body;
  logger.info('API', `Received cursor action request: ${action}`, { params });
  
  try {
    switch (action) {
      case 'move':
        logger.debug('API', `Executing move action to (${params.x}, ${params.y})`);
        cursorController.moveTo(params.x, params.y);
        break;
      case 'click':
        logger.debug('API', `Executing click action with button: ${params.button || 'left'}`);
        cursorController.click(params.button);
        break;
      case 'double-click':
        logger.debug('API', `Executing double-click action with button: ${params.button || 'left'}`);
        cursorController.doubleClick(params.button);
        break;
      case 'drag':
        logger.debug('API', `Executing drag action to (${params.x}, ${params.y})`);
        cursorController.dragTo(params.x, params.y);
        break;
      default:
        logger.warn('API', `Invalid action received: ${action}`);
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    const newPosition = cursorController.getCurrentPosition();
    logger.info('API', `Cursor action '${action}' completed successfully`, { 
      newPosition 
    });
    
    res.json({ 
      success: true, 
      newPosition 
    });
  } catch (error) {
    logger.error('API', `Error executing cursor action '${action}'`, { 
      error: error.message, 
      stack: error.stack,
      params 
    });
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to perform pair programming
app.post('/pair-program', async (req, res) => {
  const { screenCapture, context, goal } = req.body;
  
  logger.info('API', 'Received pair programming request', { 
    goal,
    context: {
      workType: context.workType,
      environment: context.environment
    }
  });
  
  try {
    logger.debug('API', 'Preparing to get cursor instructions from Claude');
    logger.debug('API', 'Screen capture size (bytes)', { size: screenCapture.length });
    
    // Get cursor instructions from Claude's Computer Use API
    logger.info('API', 'Calling Claude API for cursor instructions');
    const startTime = Date.now();
    
    const instructions = await getCursorInstructions(screenCapture, context, goal);
    
    const elapsedTime = Date.now() - startTime;
    logger.info('API', `Received ${instructions.length} instructions from Claude API`, { 
      elapsedTimeMs: elapsedTime 
    });
    
    // Execute the instructions
    const actionsPerformed = 0;
    logger.debug('API', 'Preparing to execute cursor instructions');
    
    for (const instruction of instructions) {
      logger.debug('API', `Executing instruction: ${instruction.type}`, instruction);
      
      switch (instruction.type) {
        case 'move':
          cursorController.moveTo(instruction.x, instruction.y);
          break;
        case 'click':
          cursorController.click(instruction.button);
          break;
        case 'double-click':
          cursorController.doubleClick(instruction.button);
          break;
        case 'drag':
          cursorController.dragTo(instruction.x, instruction.y);
          break;
      }
      
      // Add small delay between actions
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    const finalPosition = cursorController.getCurrentPosition();
    logger.info('API', 'Pair programming completed successfully', { 
      actionsPerformed,
      finalPosition
    });
    
    res.json({
      success: true,
      actionsPerformed,
      finalPosition
    });
  } catch (error) {
    logger.error('API', 'Error during pair programming', { 
      error: error.message, 
      stack: error.stack,
      goal 
    });
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  logger.info('Server', `Cursor operator server running on port ${PORT}`);
  
  // Log system information
  const screenSize = cursorController.getScreenSize();
  const cursorPosition = cursorController.getCurrentPosition();
  
  logger.info('Server', 'System information', {
    node: process.version,
    platform: process.platform,
    screenSize,
    cursorPosition
  });
  
  console.log(`Cursor operator server running on port ${PORT}`);
  console.log(`Screen size: ${JSON.stringify(screenSize)}`);
  console.log(`Current cursor position: ${JSON.stringify(cursorPosition)}`);
});