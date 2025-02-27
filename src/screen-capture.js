const robot = require('robotjs');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const logger = require('./utils/logger');

logger.debug('ScreenCapture', 'Module initialized');

/**
 * Capture the current screen as a base64 encoded image
 * 
 * @param {number} x - X coordinate to start capture (optional)
 * @param {number} y - Y coordinate to start capture (optional)
 * @param {number} width - Width of the capture area (optional)
 * @param {number} height - Height of the capture area (optional)
 * @returns {string} - Base64 encoded PNG image
 */
function captureScreen(x, y, width, height) {
  logger.debug('ScreenCapture', 'Capturing screen', { x, y, width, height });
  const startTime = Date.now();
  
  try {
    // Get screen size if dimensions not provided
    const screenSize = robot.getScreenSize();
    logger.debug('ScreenCapture', 'Got screen size', screenSize);
    
    // Set default capture area to full screen if not specified
    const captureX = x !== undefined ? x : 0;
    const captureY = y !== undefined ? y : 0;
    const captureWidth = width !== undefined ? width : screenSize.width;
    const captureHeight = height !== undefined ? height : screenSize.height;
    
    logger.debug('ScreenCapture', 'Capture dimensions', {
      x: captureX,
      y: captureY,
      width: captureWidth,
      height: captureHeight
    });
    
    // Capture screen using robotjs
    logger.debug('ScreenCapture', 'Calling robot.screen.capture');
    const robotCaptureStart = Date.now();
    const bitmap = robot.screen.capture(captureX, captureY, captureWidth, captureHeight);
    const robotCaptureDuration = Date.now() - robotCaptureStart;
    
    logger.debug('ScreenCapture', `Robot capture completed in ${robotCaptureDuration}ms`, {
      bitmapWidth: bitmap.width,
      bitmapHeight: bitmap.height,
      bitmapByteLength: bitmap.image.length
    });
    
    // Convert to canvas
    logger.debug('ScreenCapture', 'Creating canvas');
    const canvasStart = Date.now();
    const canvas = createCanvas(captureWidth, captureHeight);
    const ctx = canvas.getContext('2d');
    
    // Create image data
    const imageData = ctx.createImageData(captureWidth, captureHeight);
    
    // Fill image data from bitmap
    logger.debug('ScreenCapture', 'Filling image data from bitmap');
    for (let y = 0; y < captureHeight; y++) {
      for (let x = 0; x < captureWidth; x++) {
        const index = (y * captureWidth + x) * 4;
        const bitmapIndex = (y * captureWidth + x) * 4;
        
        imageData.data[index] = bitmap.image.readUInt8(bitmapIndex);     // R
        imageData.data[index + 1] = bitmap.image.readUInt8(bitmapIndex + 1); // G
        imageData.data[index + 2] = bitmap.image.readUInt8(bitmapIndex + 2); // B
        imageData.data[index + 3] = 255; // Alpha
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    const canvasDuration = Date.now() - canvasStart;
    logger.debug('ScreenCapture', `Canvas creation and filling completed in ${canvasDuration}ms`);
    
    // Convert to base64
    logger.debug('ScreenCapture', 'Converting canvas to base64');
    const base64Start = Date.now();
    const base64Image = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
    const base64Duration = Date.now() - base64Start;
    
    const totalDuration = Date.now() - startTime;
    logger.info('ScreenCapture', `Screen capture completed in ${totalDuration}ms`, {
      robotCaptureDuration,
      canvasDuration,
      base64Duration,
      base64Size: base64Image.length
    });
    
    return base64Image;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('ScreenCapture', `Error capturing screen after ${duration}ms`, {
      error: error.message,
      stack: error.stack,
      captureArea: { x, y, width, height }
    });
    console.error('Error capturing screen:', error);
    throw error;
  }
}

/**
 * Save a base64 encoded image to a file
 * 
 * @param {string} base64Image - Base64 encoded image
 * @param {string} filePath - Path to save the file
 * @returns {Promise<string>} - Path to the saved file
 */
async function saveBase64Image(base64Image, filePath) {
  logger.debug('ScreenCapture', 'Saving base64 image to file', {
    filePath,
    imageSize: base64Image.length
  });
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const buffer = Buffer.from(base64Image, 'base64');
    
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        logger.error('ScreenCapture', 'Error saving image to file', {
          error: err.message,
          stack: err.stack,
          filePath
        });
        reject(err);
      } else {
        const duration = Date.now() - startTime;
        logger.info('ScreenCapture', `Image saved to ${filePath} in ${duration}ms`, {
          fileSize: buffer.length
        });
        resolve(filePath);
      }
    });
  });
}

/**
 * Get current screen capture and return as base64
 * 
 * @returns {string} - Base64 encoded screen capture
 */
function getCurrentScreenCapture() {
  logger.info('ScreenCapture', 'Getting current screen capture');
  // Capture the entire screen
  return captureScreen();
}

/**
 * Get current screen capture and save to file
 * 
 * @param {string} outputDir - Directory to save the capture
 * @returns {Promise<string>} - Path to the saved file
 */
async function captureAndSaveScreen(outputDir = './captures') {
  logger.info('ScreenCapture', 'Capturing and saving screen', { outputDir });
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    logger.debug('ScreenCapture', `Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const filename = `screen-capture-${timestamp}.png`;
  const filePath = path.join(outputDir, filename);
  
  logger.debug('ScreenCapture', `Generated filepath: ${filePath}`);
  
  // Capture screen and save
  const base64Image = captureScreen();
  const savedPath = await saveBase64Image(base64Image, filePath);
  
  logger.info('ScreenCapture', `Screen captured and saved to ${savedPath}`);
  return savedPath;
}

module.exports = {
  captureScreen,
  saveBase64Image,
  getCurrentScreenCapture,
  captureAndSaveScreen
};