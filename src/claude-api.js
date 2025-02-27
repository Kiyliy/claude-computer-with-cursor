const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const logger = require('./utils/logger');

// Initialize Anthropic client
logger.info('ClaudeAPI', 'Initializing Anthropic client');

if (!process.env.ANTHROPIC_API_KEY) {
  logger.error('ClaudeAPI', 'ANTHROPIC_API_KEY is not set in environment variables');
} else {
  logger.debug('ClaudeAPI', 'ANTHROPIC_API_KEY is set');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

logger.debug('ClaudeAPI', 'Anthropic client initialized');

/**
 * Get cursor instructions from Claude based on screen capture and context
 * using the Computer Use API
 * 
 * @param {string} screenCapture - Base64 encoded image of the screen
 * @param {object} context - Additional context about what the user is trying to do
 * @param {string} goal - The goal the user wants to achieve
 * @returns {Array} - Array of cursor action instructions
 */
async function getCursorInstructions(screenCapture, context, goal) {
  logger.info('ClaudeAPI', 'Getting cursor instructions from Claude', {
    contextType: context?.workType,
    goalLength: goal?.length,
    screenCaptureSize: screenCapture?.length
  });
  
  try {
    // Get screen dimensions
    const screenSize = require('robotjs').getScreenSize();
    logger.debug('ClaudeAPI', 'Screen dimensions for Computer Use API', screenSize);
    
    // Define Computer Use tools for Claude 3.7 Sonnet
    const tools = [
      {
        type: "computer_20250124",
        name: "computer",
        display_width_px: screenSize.width,
        display_height_px: screenSize.height,
        display_number: 1
      }
    ];
    
    logger.debug('ClaudeAPI', 'Defined Computer Use tools', { tools });

    // Create system prompt for Computer Use API
    const systemPrompt = `You are a cursor control assistant that helps with pair programming.
You are given a screenshot of a user's screen, context about what they're working on, and their goal.
Your task is to provide a series of precise cursor actions using the Computer Use tool to help achieve that goal.

Analyze the screen carefully and determine the most effective sequence of cursor actions.
Use mouse movements, clicks, and drags to help the user with their programming task.`;

    logger.debug('ClaudeAPI', 'Created system prompt', { 
      systemPromptLength: systemPrompt.length 
    });

    // Convert base64 image to a format Claude can use
    const imageContent = {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: screenCapture
      }
    };
    
    logger.debug('ClaudeAPI', 'Prepared image content for Claude');

    // Create message with context, goal and screen image
    const userContent = [
      {
        type: "text",
        text: `Context about what I'm working on: ${JSON.stringify(context)}\n\nMy goal is: ${goal}\n\nPlease control my cursor to help me achieve this goal.`
      },
      imageContent
    ];
    
    logger.debug('ClaudeAPI', 'Created user content', {
      textContentLength: userContent[0].text.length
    });

    // Begin the agent loop
    let messages = [
      {
        role: "user",
        content: userContent
      }
    ];
    
    const instructions = [];
    const maxIterations = 10; // Limit to prevent infinite loops
    
    logger.info('ClaudeAPI', 'Starting agent loop', { maxIterations });
    
    // Start the agent loop
    for (let i = 0; i < maxIterations; i++) {
      logger.debug('ClaudeAPI', `Agent loop iteration ${i+1}`);
      
      // Call Claude API with Computer Use capability
      logger.info('ClaudeAPI', 'Calling Claude API with Computer Use capability');
      const apiCallStartTime = Date.now();
      
      try {
        const response = await anthropic.messages.create({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 4000,
          system: systemPrompt,
          messages: messages,
          tools: tools,
          thinking: {
            type: "enabled",
            budget_tokens: 1024
          },
          anthropic_version: "2023-06-01",  
          beta: "computer-use-2025-01-24"
        });
        
        const apiCallDuration = Date.now() - apiCallStartTime;
        logger.info('ClaudeAPI', `Claude API call completed in ${apiCallDuration}ms`);
        
        if (response.thinking) {
          logger.debug('ClaudeAPI', 'Claude thinking process', {
            thinking: response.thinking.trim().substring(0, 500) + 
                     (response.thinking.length > 500 ? '...(truncated)' : '')
          });
        }
        
        // Add Claude's response to messages
        messages.push({
          role: "assistant",
          content: response.content
        });
        
        logger.debug('ClaudeAPI', `Added Claude's response to messages`);
        
        // Process tool use from Claude's response
        let usedTools = false;
        let toolResults = [];
        
        logger.debug('ClaudeAPI', `Processing ${response.content.length} content items from Claude's response`);
        
        for (const content of response.content) {
          logger.debug('ClaudeAPI', `Processing content item of type: ${content.type}`);
          
          if (content.type === 'tool_use' && content.tool_use.name === 'computer') {
            usedTools = true;
            const toolUse = content.tool_use;
            const action = toolUse.input.action;
            
            logger.debug('ClaudeAPI', 'Processing computer tool use', { 
              toolUseId: content.id,
              actionType: action.type,
              action: action.action
            });
            
            if (action.type === 'mouse') {
              const mouseAction = action;
              
              // Create instruction based on mouse action
              switch (mouseAction.action) {
                case 'move':
                  logger.debug('ClaudeAPI', 'Adding move instruction', { 
                    x: mouseAction.coordinates.x, 
                    y: mouseAction.coordinates.y 
                  });
                  
                  instructions.push({
                    type: 'move',
                    x: mouseAction.coordinates.x,
                    y: mouseAction.coordinates.y
                  });
                  break;
                  
                case 'click':
                  if (mouseAction.button === 'left' && mouseAction.clicks === 2) {
                    logger.debug('ClaudeAPI', 'Adding double-click instruction', { button: 'left' });
                    
                    instructions.push({
                      type: 'double-click',
                      button: 'left'
                    });
                  } else {
                    logger.debug('ClaudeAPI', 'Adding click instruction', { button: mouseAction.button });
                    
                    instructions.push({
                      type: 'click',
                      button: mouseAction.button
                    });
                  }
                  break;
                  
                case 'drag':
                  logger.debug('ClaudeAPI', 'Adding drag instruction', { 
                    x: mouseAction.end.x, 
                    y: mouseAction.end.y 
                  });
                  
                  instructions.push({
                    type: 'drag',
                    x: mouseAction.end.x,
                    y: mouseAction.end.y
                  });
                  break;
                  
                default:
                  logger.warn('ClaudeAPI', `Unhandled mouse action: ${mouseAction.action}`);
              }
            } else {
              logger.warn('ClaudeAPI', `Non-mouse action type received: ${action.type}`);
            }
            
            // Process the tool result
            // In a real agent loop, we would execute the action and provide feedback
            // For this implementation, we'll just confirm the action was processed
            toolResults.push({
              type: "tool_result",
              tool_use_id: content.id,
              content: {
                result: "success",
                screenshot: screenCapture // Provide the same screenshot again for this example
              }
            });
            
            logger.debug('ClaudeAPI', 'Added tool result for tool use', { 
              toolUseId: content.id, 
              result: 'success' 
            });
          } else if (content.type === 'text') {
            logger.debug('ClaudeAPI', 'Text response from Claude', { 
              textLength: content.text.length,
              text: content.text.substring(0, 100) + 
                   (content.text.length > 100 ? '...(truncated)' : '')
            });
          }
        }
        
        if (!usedTools) {
          logger.info('ClaudeAPI', 'Claude did not use any tools, ending agent loop');
          break;
        }
        
        // Continue the agent loop by sending tool results back to Claude
        if (toolResults.length > 0) {
          logger.debug('ClaudeAPI', `Adding ${toolResults.length} tool results to user message`);
          
          messages.push({
            role: "user",
            content: toolResults
          });
        }
        
      } catch (error) {
        const apiCallDuration = Date.now() - apiCallStartTime;
        logger.error('ClaudeAPI', `Error calling Claude API after ${apiCallDuration}ms`, {
          error: error.message,
          stack: error.stack,
          iteration: i
        });
        
        throw error;
      }
    }
    
    logger.info('ClaudeAPI', `Agent loop completed with ${instructions.length} instructions`);
    return instructions;
    
  } catch (error) {
    logger.error('ClaudeAPI', 'Error getting cursor instructions from Claude', { 
      error: error.message, 
      stack: error.stack,
      context,
      goal: goal
    });
    throw error;
  }
}

/**
 * Validate instructions array to ensure it contains valid cursor instructions
 * 
 * @param {Array} instructions - Array of instruction objects
 * @throws {Error} If validation fails
 */
function validateInstructions(instructions) {
  logger.debug('ClaudeAPI', 'Validating instructions', { 
    instructionsCount: instructions?.length 
  });
  
  if (!Array.isArray(instructions)) {
    logger.error('ClaudeAPI', 'Instructions must be an array', { received: typeof instructions });
    throw new Error('Instructions must be an array');
  }
  
  for (const instruction of instructions) {
    if (!instruction.type) {
      logger.error('ClaudeAPI', 'Instruction missing type property', { instruction });
      throw new Error('Each instruction must have a \'type\' property');
    }
    
    switch (instruction.type) {
      case 'move':
      case 'drag':
        if (typeof instruction.x !== 'number' || typeof instruction.y !== 'number') {
          logger.error('ClaudeAPI', `${instruction.type} instruction missing coordinates`, { instruction });
          throw new Error(`${instruction.type} instruction must have 'x' and 'y' coordinates`);
        }
        break;
        
      case 'click':
      case 'double-click':
        if (instruction.button && !['left', 'right'].includes(instruction.button)) {
          logger.error('ClaudeAPI', `${instruction.type} instruction has invalid button`, { 
            button: instruction.button,
            instruction 
          });
          throw new Error(`${instruction.type} instruction has invalid 'button' property`);
        }
        break;
        
      default:
        logger.error('ClaudeAPI', `Unknown instruction type: ${instruction.type}`, { instruction });
        throw new Error(`Unknown instruction type: ${instruction.type}`);
    }
  }
  
  logger.debug('ClaudeAPI', 'Instructions validated successfully');
  return true;
}

module.exports = {
  getCursorInstructions,
  validateInstructions
};