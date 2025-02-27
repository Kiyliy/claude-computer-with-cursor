/**
 * Logger utility for Claude Cursor Operator
 * Provides detailed, colorful console logging for easier debugging
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  
  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

class Logger {
  constructor(options = {}) {
    this.options = {
      showTimestamp: true,
      showSource: true,
      logLevel: 'info',
      ...options
    };
    
    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      none: 4
    };
  }
  
  /**
   * Get current timestamp string
   * @returns {string} Formatted timestamp
   */
  getTimestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substr(0, 19);
  }
  
  /**
   * Format log message with timestamp, source, etc.
   * @param {string} level - Log level
   * @param {string} source - Source component
   * @param {string} message - Log message
   * @param {Object} data - Optional data to log
   * @returns {string} Formatted log message
   */
  formatLog(level, source, message, data) {
    let formattedMsg = '';
    
    // Add timestamp if enabled
    if (this.options.showTimestamp) {
      formattedMsg += `${colors.dim}[${this.getTimestamp()}]${colors.reset} `;
    }
    
    // Add log level with appropriate color
    switch (level) {
      case 'debug':
        formattedMsg += `${colors.cyan}[DEBUG]${colors.reset} `;
        break;
      case 'info':
        formattedMsg += `${colors.green}[INFO]${colors.reset} `;
        break;
      case 'warn':
        formattedMsg += `${colors.yellow}[WARN]${colors.reset} `;
        break;
      case 'error':
        formattedMsg += `${colors.red}[ERROR]${colors.reset} `;
        break;
    }
    
    // Add source component if enabled
    if (this.options.showSource && source) {
      formattedMsg += `${colors.magenta}[${source}]${colors.reset} `;
    }
    
    // Add message
    formattedMsg += message;
    
    // Add optional data
    if (data) {
      if (typeof data === 'object') {
        try {
          const jsonData = JSON.stringify(data, null, 2);
          formattedMsg += `\n${colors.dim}${jsonData}${colors.reset}`;
        } catch (error) {
          formattedMsg += `\n${colors.dim}[Unable to stringify data]${colors.reset}`;
        }
      } else {
        formattedMsg += `\n${colors.dim}${data}${colors.reset}`;
      }
    }
    
    return formattedMsg;
  }
  
  /**
   * Check if this log level should be logged
   * @param {string} level - Log level to check
   * @returns {boolean} Whether this level should be logged
   */
  shouldLog(level) {
    return this.logLevels[level] >= this.logLevels[this.options.logLevel];
  }
  
  /**
   * Log a debug message
   * @param {string} source - Source component
   * @param {string} message - Log message
   * @param {Object} data - Optional data to log
   */
  debug(source, message, data) {
    if (this.shouldLog('debug')) {
      console.log(this.formatLog('debug', source, message, data));
    }
  }
  
  /**
   * Log an info message
   * @param {string} source - Source component
   * @param {string} message - Log message
   * @param {Object} data - Optional data to log
   */
  info(source, message, data) {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', source, message, data));
    }
  }
  
  /**
   * Log a warning message
   * @param {string} source - Source component
   * @param {string} message - Log message
   * @param {Object} data - Optional data to log
   */
  warn(source, message, data) {
    if (this.shouldLog('warn')) {
      console.log(this.formatLog('warn', source, message, data));
    }
  }
  
  /**
   * Log an error message
   * @param {string} source - Source component
   * @param {string} message - Log message
   * @param {Object} data - Optional data to log
   */
  error(source, message, data) {
    if (this.shouldLog('error')) {
      console.error(this.formatLog('error', source, message, data));
    }
  }
}

// Create and export default instance with common settings
const logger = new Logger({
  showTimestamp: true,
  showSource: true,
  logLevel: process.env.LOG_LEVEL || 'debug' // Use environment variable or default to debug
});

module.exports = logger; 