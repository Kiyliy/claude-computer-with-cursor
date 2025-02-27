const { getCursorInstructions } = require('../src/claude-api');
const Anthropic = require('@anthropic-ai/sdk');

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk');

// Mock robotjs to avoid actual screen integration
jest.mock('robotjs', () => ({
  getScreenSize: jest.fn().mockReturnValue({ width: 1920, height: 1080 })
}));

describe('Agent Loop Implementation', () => {
  let mockCreate;
  let mockAnthropicInstance;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Set up mock responses for multiple iterations
    mockCreate = jest.fn();
    
    // First API call - move cursor
    mockCreate.mockImplementationOnce(() => {
      return Promise.resolve({
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            tool_use: {
              name: 'computer',
              input: {
                action: {
                  type: 'mouse',
                  action: 'move',
                  coordinates: { x: 100, y: 200 }
                }
              }
            }
          }
        ]
      });
    });
    
    // Second API call - click
    mockCreate.mockImplementationOnce(() => {
      return Promise.resolve({
        content: [
          {
            type: 'tool_use',
            id: 'tool-2',
            tool_use: {
              name: 'computer',
              input: {
                action: {
                  type: 'mouse',
                  action: 'click',
                  button: 'left',
                  clicks: 1
                }
              }
            }
          }
        ]
      });
    });
    
    // Third API call - complete
    mockCreate.mockImplementationOnce(() => {
      return Promise.resolve({
        content: [
          {
            type: 'text',
            text: 'I have completed the task.'
          }
        ]
      });
    });
    
    // Set up mock Anthropic instance
    mockAnthropicInstance = {
      messages: {
        create: mockCreate
      }
    };
    
    // Set up Anthropic constructor mock
    Anthropic.mockImplementation(() => mockAnthropicInstance);
    
    // Set up API key
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });
  
  test('should execute multiple loop iterations', async () => {
    // Test data
    const screenCapture = 'base64-encoded-image';
    const context = { workType: 'React component' };
    const goal = 'Click the submit button';
    
    // Call the function
    const instructions = await getCursorInstructions(screenCapture, context, goal);
    
    // Should have called the API 3 times
    expect(mockCreate).toHaveBeenCalledTimes(3);
    
    // Should have two instructions (move and click)
    expect(instructions).toHaveLength(2);
    expect(instructions[0].type).toBe('move');
    expect(instructions[1].type).toBe('click');
    
    // Check API call parameters
    const firstCallArgs = mockCreate.mock.calls[0][0];
    expect(firstCallArgs.model).toBe('claude-3-7-sonnet-20250219');
    expect(firstCallArgs.tools[0].type).toBe('computer_20250124');
    expect(firstCallArgs.beta).toBe('computer-use-2025-01-24');
    
    // Check if thinking is enabled with budget
    expect(firstCallArgs.thinking.type).toBe('enabled');
    expect(firstCallArgs.thinking.budget_tokens).toBe(1024);
  });
  
  test('should break loop when no more tools are used', async () => {
    // Override mock for a shorter loop
    mockCreate.mockReset();
    
    // First API call - move cursor
    mockCreate.mockImplementationOnce(() => {
      return Promise.resolve({
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            tool_use: {
              name: 'computer',
              input: {
                action: {
                  type: 'mouse',
                  action: 'move',
                  coordinates: { x: 100, y: 200 }
                }
              }
            }
          }
        ]
      });
    });
    
    // Second API call - complete (no tools used)
    mockCreate.mockImplementationOnce(() => {
      return Promise.resolve({
        content: [
          {
            type: 'text',
            text: 'I have completed the task.'
          }
        ]
      });
    });
    
    // Test data
    const screenCapture = 'base64-encoded-image';
    const context = { workType: 'React component' };
    const goal = 'Move the cursor';
    
    // Call the function
    const instructions = await getCursorInstructions(screenCapture, context, goal);
    
    // Should have called the API only 2 times (since no tools were used in the second response)
    expect(mockCreate).toHaveBeenCalledTimes(2);
    
    // Should have only one instruction (move)
    expect(instructions).toHaveLength(1);
    expect(instructions[0].type).toBe('move');
  });
});