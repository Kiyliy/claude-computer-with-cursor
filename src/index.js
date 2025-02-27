require('dotenv').config();
const express = require('express');
const robot = require('robotjs');
const { getCursorInstructions } = require('./claude-api');
const { captureScreen, getCurrentScreenCapture } = require('./screen-capture');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize cursor controller
const cursorController = {
  moveTo: (x, y) => {
    robot.moveMouse(x, y);
  },
  click: (button = 'left') => {
    robot.mouseClick(button);
  },
  doubleClick: (button = 'left') => {
    robot.mouseClick(button, true);
  },
  dragTo: (x, y) => {
    robot.mouseToggle('down');
    robot.moveMouse(x, y);
    robot.mouseToggle('up');
  },
  getCurrentPosition: () => {
    return robot.getMousePos();
  },
  getScreenSize: () => {
    return robot.getScreenSize();
  }
};

// API endpoint to get screen info
app.get('/screen-info', (req, res) => {
  const screenSize = cursorController.getScreenSize();
  const cursorPosition = cursorController.getCurrentPosition();
  
  res.json({
    screen: screenSize,
    cursor: cursorPosition
  });
});

// API endpoint to capture screen
app.get('/screen-capture', (req, res) => {
  try {
    const screenCapture = getCurrentScreenCapture();
    res.json({
      screenCapture
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to execute cursor actions
app.post('/cursor-action', async (req, res) => {
  const { action, params } = req.body;
  
  try {
    switch (action) {
      case 'move':
        cursorController.moveTo(params.x, params.y);
        break;
      case 'click':
        cursorController.click(params.button);
        break;
      case 'double-click':
        cursorController.doubleClick(params.button);
        break;
      case 'drag':
        cursorController.dragTo(params.x, params.y);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    res.json({ 
      success: true, 
      newPosition: cursorController.getCurrentPosition() 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to perform pair programming
app.post('/pair-program', async (req, res) => {
  const { screenCapture, context, goal } = req.body;
  
  try {
    // Get cursor instructions from Claude's Computer Use API
    const instructions = await getCursorInstructions(screenCapture, context, goal);
    
    // Execute the instructions
    for (const instruction of instructions) {
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
    
    res.json({
      success: true,
      actionsPerformed: instructions.length,
      finalPosition: cursorController.getCurrentPosition()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Cursor operator server running on port ${PORT}`);
  console.log(`Screen size: ${JSON.stringify(cursorController.getScreenSize())}`);
  console.log(`Current cursor position: ${JSON.stringify(cursorController.getCurrentPosition())}`);
});