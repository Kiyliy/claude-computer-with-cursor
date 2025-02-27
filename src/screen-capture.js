const robot = require('robotjs');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

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
  try {
    // Get screen size if dimensions not provided
    const screenSize = robot.getScreenSize();
    
    // Set default capture area to full screen if not specified
    const captureX = x !== undefined ? x : 0;
    const captureY = y !== undefined ? y : 0;
    const captureWidth = width !== undefined ? width : screenSize.width;
    const captureHeight = height !== undefined ? height : screenSize.height;
    
    // Capture screen using robotjs
    const bitmap = robot.screen.capture(captureX, captureY, captureWidth, captureHeight);
    
    // Convert to canvas
    const canvas = createCanvas(captureWidth, captureHeight);
    const ctx = canvas.getContext('2d');
    
    // Create image data
    const imageData = ctx.createImageData(captureWidth, captureHeight);
    
    // Fill image data from bitmap
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
    
    // Convert to base64
    const base64Image = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
    
    return base64Image;
  } catch (error) {
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
  return new Promise((resolve, reject) => {
    const buffer = Buffer.from(base64Image, 'base64');
    
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        reject(err);
      } else {
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
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const filename = `screen_${timestamp}.png`;
  const filePath = path.join(outputDir, filename);
  
  // Capture screen
  const base64Image = getCurrentScreenCapture();
  
  // Save to file
  return await saveBase64Image(base64Image, filePath);
}

module.exports = {
  captureScreen,
  getCurrentScreenCapture,
  captureAndSaveScreen,
  saveBase64Image
};