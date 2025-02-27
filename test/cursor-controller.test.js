const robot = require('robotjs');

// Mock robotjs
jest.mock('robotjs', () => ({
  moveMouse: jest.fn(),
  mouseClick: jest.fn(),
  mouseToggle: jest.fn(),
  getMousePos: jest.fn(() => ({ x: 100, y: 100 })),
  getScreenSize: jest.fn(() => ({ width: 1920, height: 1080 }))
}));

describe('Cursor Controller', () => {
  let cursorController;
  
  beforeEach(() => {
    // Create a fresh cursor controller for each test
    cursorController = {
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
    
    // Clear mock calls between tests
    jest.clearAllMocks();
  });
  
  test('moveTo should call robot.moveMouse with coordinates', () => {
    cursorController.moveTo(200, 300);
    expect(robot.moveMouse).toHaveBeenCalledWith(200, 300);
  });
  
  test('click should call robot.mouseClick with default left button', () => {
    cursorController.click();
    expect(robot.mouseClick).toHaveBeenCalledWith('left');
  });
  
  test('click should call robot.mouseClick with specified button', () => {
    cursorController.click('right');
    expect(robot.mouseClick).toHaveBeenCalledWith('right');
  });
  
  test('doubleClick should call robot.mouseClick with true flag', () => {
    cursorController.doubleClick();
    expect(robot.mouseClick).toHaveBeenCalledWith('left', true);
  });
  
  test('dragTo should perform mouse down, move, and up actions', () => {
    cursorController.dragTo(500, 600);
    
    expect(robot.mouseToggle).toHaveBeenCalledTimes(2);
    expect(robot.mouseToggle).toHaveBeenNthCalledWith(1, 'down');
    expect(robot.mouseToggle).toHaveBeenNthCalledWith(2, 'up');
    expect(robot.moveMouse).toHaveBeenCalledWith(500, 600);
  });
  
  test('getCurrentPosition should call robot.getMousePos', () => {
    const position = cursorController.getCurrentPosition();
    
    expect(robot.getMousePos).toHaveBeenCalled();
    expect(position).toEqual({ x: 100, y: 100 });
  });
  
  test('getScreenSize should call robot.getScreenSize', () => {
    const screenSize = cursorController.getScreenSize();
    
    expect(robot.getScreenSize).toHaveBeenCalled();
    expect(screenSize).toEqual({ width: 1920, height: 1080 });
  });
});