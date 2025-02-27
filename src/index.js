require('dotenv').config();
const express = require('express');
const robot = require('robotjs');
const { getCursorInstructions } = require('./claude-api');
const { captureScreen, getCurrentScreenCapture } = require('./screen-capture');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// 添加详细请求日志中间件
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  logger.debug('Server', `Received ${req.method} request for ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    headers: req.headers,
    ip: req.ip,
    contentLength: req.headers['content-length']
  });
  
  // 响应完成后记录详细信息
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Server', `Completed ${req.method} ${req.path} with status ${res.statusCode} in ${duration}ms`, {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });
  });
  
  // 响应关闭（可能是客户端断开连接）
  res.on('close', () => {
    if (!res.writableEnded) {
      logger.warn('Server', `Connection closed before response completion for ${req.method} ${req.path}`, {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: Date.now() - startTime
      });
    }
  });
  
  next();
});

app.use(express.json({
  limit: '50mb', // 增加请求体大小限制
  verify: (req, res, buf, encoding) => {
    if (buf.length > 1024 * 1024 * 10) { // 10MB
      logger.warn('Server', 'Large request body detected', {
        size: buf.length,
        path: req.path
      });
    }
  }
}));

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
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  logger.info('API', 'Received pair programming request', { 
    requestId,
    goal,
    context: {
      workType: context?.workType,
      environment: context?.environment
    },
    screenCaptureSize: screenCapture?.length || 0
  });
  
  // 检查请求参数
  if (!screenCapture) {
    logger.warn('API', 'Missing screenCapture in request', { requestId });
    return res.status(400).json({ error: 'Missing screenCapture' });
  }
  
  if (!goal) {
    logger.warn('API', 'Missing goal in request', { requestId });
    return res.status(400).json({ error: 'Missing goal' });
  }
  
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
const server = app.listen(PORT, () => {
  logger.info('Server', `Cursor operator server running on port ${PORT}`);
  
  // Log system information
  const screenSize = cursorController.getScreenSize();
  const cursorPosition = cursorController.getCurrentPosition();
  
  logger.info('Server', 'System information', {
    node: process.version,
    platform: process.platform,
    port: PORT,
    screenSize,
    cursorPosition
  });
  
  console.log(`Cursor operator server running on port ${PORT}`);
  console.log(`Screen size: ${JSON.stringify(screenSize)}`);
  console.log(`Current cursor position: ${JSON.stringify(cursorPosition)}`);
});

// 添加服务器错误处理
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error('Server', `Port ${PORT} is already in use. Unable to start server.`, {
      error: error.message,
      stack: error.stack,
      code: error.code
    });
  } else {
    logger.error('Server', 'Server error', {
      error: error.message,
      stack: error.stack,
      code: error.code
    });
  }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Process', 'Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Process', 'Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
});