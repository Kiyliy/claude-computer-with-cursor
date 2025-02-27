# Claude Cursor Operator

A pair programming tool that uses Claude's Computer Use API to control your cursor based on screen context and programming goals.

## Features

- Real-time cursor control powered by Claude's Computer Use API
- Advanced mouse control with precise movements, clicks, and drags
- Agent-based operation with thinking capability for better reasoning
- Context-aware assistance based on current screen state
- Interactive client for continuous pair programming
- REST API for integration with other tools

## Prerequisites

- Node.js (v14 or higher)
- Anthropic API key (Claude)

## Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/claude-cursor-operator.git
cd claude-cursor-operator
```

2. Install dependencies:
```
npm install
```

3. Create a `.env` file based on the provided example:
```
cp .env.example .env
```

4. Add your Anthropic API key to the `.env` file:
```
ANTHROPIC_API_KEY=your_api_key_here
PORT=3000
```

5. Ensure you have requested access to Computer Use beta from Anthropic

## Usage

### Start the server:

```
npm start
```

### Run the interactive client:

```
node src/client.js
```

### API Endpoints

- **GET /screen-info**: Get information about the screen size and current cursor position
- **POST /cursor-action**: Execute a specific cursor action (move, click, double-click, drag)
- **POST /pair-program**: Perform pair programming with Claude using screen capture

## How It Works

1. The server captures your screen
2. The screen image is sent to Claude's Computer Use API along with context
3. Claude analyzes the image and directly issues cursor control commands using tools
4. The server executes those commands to automate cursor movements
5. The process repeats based on your programming goals

## Example Use Cases

- Navigating complex UIs
- Repetitive coding tasks
- Guided code refactoring
- Interactive tutorials
- Accessibility assistance

## Security Considerations

- The tool runs locally on your machine
- Screen captures are only sent to Claude API
- API keys are stored in your local .env file
- No data is stored persistently

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Anthropic for the Claude API
- RobotJS for cursor control functionality