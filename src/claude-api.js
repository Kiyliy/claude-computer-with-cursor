const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
  try {
    // Get screen dimensions
    const screenSize = require('robotjs').getScreenSize();
    
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

    // Create system prompt for Computer Use API
    const systemPrompt = `You are a cursor control assistant that helps with pair programming.
You are given a screenshot of a user's screen, context about what they're working on, and their goal.
Your task is to provide a series of precise cursor actions using the Computer Use tool to help achieve that goal.

Analyze the screen carefully and determine the most effective sequence of cursor actions.
Use mouse movements, clicks, and drags to help the user with their programming task.`;

    // Convert base64 image to a format Claude can use
    const imageContent = {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: screenCapture
      }
    };

    // Create message with context, goal and screen image
    const userContent = [
      {
        type: "text",
        text: `Context about what I'm working on: ${JSON.stringify(context)}\n\nMy goal is: ${goal}\n\nPlease control my cursor to help me achieve this goal.`
      },
      imageContent
    ];

    // Begin the agent loop
    let messages = [
      {
        role: "user",
        content: userContent
      }
    ];
    
    const instructions = [];
    const maxIterations = 10; // Limit to prevent infinite loops
    
    // Start the agent loop
    for (let i = 0; i < maxIterations; i++) {
      // Call Claude API with Computer Use capability
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
      
      // Add Claude's response to messages
      messages.push({
        role: "assistant",
        content: response.content
      });
      
      // Process tool use from Claude's response
      let usedTools = false;
      let toolResults = [];
      
      for (const content of response.content) {
        if (content.type === 'tool_use' && content.tool_use.name === 'computer') {
          usedTools = true;
          const toolUse = content.tool_use;
          const action = toolUse.input.action;
          
          if (action.type === 'mouse') {
            const mouseAction = action;
            
            // Create instruction based on mouse action
            switch (mouseAction.action) {
              case 'move':
                instructions.push({
                  type: 'move',
                  x: mouseAction.coordinates.x,
                  y: mouseAction.coordinates.y
                });
                break;
                
              case 'click':
                if (mouseAction.button === 'left' && mouseAction.clicks === 2) {
                  instructions.push({
                    type: 'double-click',
                    button: 'left'
                  });
                } else {
                  instructions.push({
                    type: 'click',
                    button: mouseAction.button
                  });
                }
                break;
                
              case 'drag':
                instructions.push({
                  type: 'drag',
                  x: mouseAction.end.x,
                  y: mouseAction.end.y
                });
                break;
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
          }
        }
      }
      
      // If no tools were used, break the loop
      if (!usedTools) {
        break;
      }
      
      // Add tool results to messages for next iteration
      messages.push({
        role: "user",
        content: toolResults
      });
    }
    
    // Validate the instructions
    validateInstructions(instructions);
    
    return instructions;
  } catch (error) {
    console.error("Error getting cursor instructions from Claude:", error);
    throw error;
  }
}

/**
 * Validate the format of the cursor instructions
 * 
 * @param {Array} instructions - Array of cursor action instructions
 */
function validateInstructions(instructions) {
  if (!Array.isArray(instructions)) {
    throw new Error("Instructions must be an array");
  }
  
  for (const instruction of instructions) {
    if (!instruction.type) {
      throw new Error("Each instruction must have a 'type' property");
    }
    
    switch (instruction.type) {
      case 'move':
      case 'drag':
        if (typeof instruction.x !== 'number' || typeof instruction.y !== 'number') {
          throw new Error(`${instruction.type} instruction must have 'x' and 'y' coordinates`);
        }
        break;
      case 'click':
      case 'double-click':
        if (instruction.button && !['left', 'right'].includes(instruction.button)) {
          throw new Error(`${instruction.type} instruction has invalid 'button' property`);
        }
        break;
      default:
        throw new Error(`Unknown instruction type: ${instruction.type}`);
    }
    
    if (instruction.delay !== undefined && typeof instruction.delay !== 'number') {
      throw new Error("Delay must be a number");
    }
  }
}

module.exports = {
  getCursorInstructions
};