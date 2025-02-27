const { getCursorInstructions } = require('../src/claude-api');

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn();
  
  // Set up mock response for API call
  mockCreate.mockImplementation(() => {
    return Promise.resolve({
      content: [
        {
          type: 'text',
          text: 'I\'ll help you with your programming task.'
        },
        {
          type: 'tool_use',
          id: 'tool-123',
          tool_use: {
            name: 'computer',
            input: {
              action: {
                type: 'mouse',
                action: 'move',
                coordinates: {
                  x: 500,
                  y: 300
                }
              }
            }
          }
        },
        {
          type: 'tool_use',
          id: 'tool-124',
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
  
  return {
    Anthropic: jest.fn().mockImplementation(() => {
      return {
        messages: {
          create: mockCreate
        }
      };
    })
  };
});

// Mock robotjs to avoid actual screen integration
jest.mock('robotjs', () => ({
  getScreenSize: jest.fn().mockReturnValue({ width: 1920, height: 1080 })
}));

describe('Computer Use API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });
  
  test('should process mouse actions from Computer Use API', async () => {
    // Test data
    const screenCapture = 'base64-encoded-image';
    const context = { workType: 'React component', environment: 'macOS' };
    const goal = 'Add a new button to this form';
    
    // Call the function
    const instructions = await getCursorInstructions(screenCapture, context, goal);
    
    // Verify instructions were correctly processed
    expect(instructions).toHaveLength(2);
    
    // Check the move instruction
    expect(instructions[0]).toEqual({
      type: 'move',
      x: 500,
      y: 300
    });
    
    // Check the click instruction
    expect(instructions[1]).toEqual({
      type: 'click',
      button: 'left'
    });
  });
  
  test('validateInstructions should verify cursor actions correctly', () => {
    // Import actual function for this test
    const { validateInstructions } = require('../src/claude-api');
    
    // Valid instructions
    const validInstructions = [
      { type: 'move', x: 100, y: 200 },
      { type: 'click', button: 'left' }
    ];
    
    // Should not throw error for valid instructions
    expect(() => validateInstructions(validInstructions)).not.toThrow();
    
    // Invalid instructions (missing coordinates)
    const invalidInstructions = [
      { type: 'move', x: 100 } // missing y coordinate
    ];
    
    // Should throw error for invalid instructions
    expect(() => validateInstructions(invalidInstructions)).toThrow();
  });
});