const { validateInstructions } = require('../src/claude-api');

describe('validateInstructions', () => {
  test('should validate a valid array of instructions', () => {
    const validInstructions = [
      { type: 'move', x: 100, y: 200 },
      { type: 'click', button: 'left' },
      { type: 'double-click', button: 'right' },
      { type: 'drag', x: 300, y: 400 }
    ];
    
    expect(() => validateInstructions(validInstructions)).not.toThrow();
  });
  
  test('should throw error for non-array input', () => {
    expect(() => validateInstructions({ type: 'move', x: 100, y: 200 })).toThrow('Instructions must be an array');
  });
  
  test('should throw error for instruction without type', () => {
    const invalidInstructions = [
      { x: 100, y: 200 }
    ];
    
    expect(() => validateInstructions(invalidInstructions)).toThrow('Each instruction must have a \'type\' property');
  });
  
  test('should throw error for move instruction without coordinates', () => {
    const invalidInstructions = [
      { type: 'move', x: 100 } // missing y
    ];
    
    expect(() => validateInstructions(invalidInstructions)).toThrow('move instruction must have \'x\' and \'y\' coordinates');
  });
  
  test('should throw error for drag instruction without coordinates', () => {
    const invalidInstructions = [
      { type: 'drag', y: 200 } // missing x
    ];
    
    expect(() => validateInstructions(invalidInstructions)).toThrow('drag instruction must have \'x\' and \'y\' coordinates');
  });
  
  test('should throw error for click instruction with invalid button', () => {
    const invalidInstructions = [
      { type: 'click', button: 'middle' } // only left and right are valid
    ];
    
    expect(() => validateInstructions(invalidInstructions)).toThrow('click instruction has invalid \'button\' property');
  });
  
  test('should throw error for unknown instruction type', () => {
    const invalidInstructions = [
      { type: 'hover', x: 100, y: 200 } // hover is not supported
    ];
    
    expect(() => validateInstructions(invalidInstructions)).toThrow('Unknown instruction type: hover');
  });
  
  test('should throw error for invalid delay type', () => {
    const invalidInstructions = [
      { type: 'move', x: 100, y: 200, delay: '200ms' } // delay should be a number
    ];
    
    expect(() => validateInstructions(invalidInstructions)).toThrow('Delay must be a number');
  });
});