# Cowabunga Crisis Squad - Demo Interface

A web-based demonstration interface showcasing the Open Floor Protocol capabilities through four specialized AI agents with 90s cartoon personalities.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the demo server:**
   ```bash
   npm run demo
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## Features

### 🐢 Squad Status
- Real-time status of all four agents (Leonardo, Donatello, Raphael, Michelangelo)
- Visual indicators for current speaker and agent availability
- Expertise area display for each agent

### 🎤 Floor Management
- Live floor control status showing current speaker
- Queue visualization with priority indicators
- Real-time floor transitions

### 💬 Interactive Chat
- Direct conversation with the squad
- Sample problems to get started quickly
- Message history with agent identification
- Visual indicators for speaking agents

### 🔧 Open Floor Protocol Visualization
- **Conversation Envelopes**: Real-time envelope creation and delivery
- **Agent Manifests**: Capability discovery and agent registration
- **Protocol Events**: Complete event log with filtering and export
- **Statistics**: Live protocol performance metrics

## Protocol Controls

- **🔍 Simulate Discovery**: Trigger agent discovery process
- **🗑️ Clear Events**: Reset protocol event history
- **📥 Export Events**: Download complete event log as JSON

## Sample Interactions

Try these sample problems to see the squad in action:

- "How do I learn web development?"
- "I'm stuck debugging a JavaScript error"
- "What's the best way to organize my code?"
- "How do I improve my programming skills?"

## Architecture

### Backend Components
- **DemoSquadManager**: Coordinates agent interactions and protocol events
- **Express Server**: Serves the web interface and handles HTTP requests
- **WebSocket Server**: Provides real-time communication with the frontend
- **Protocol Integration**: Full Open Floor Protocol implementation

### Frontend Components
- **Interactive UI**: Modern web interface with 90s-themed styling
- **Real-time Updates**: WebSocket-based live updates
- **Protocol Visualization**: Advanced debugging and monitoring tools
- **Event Export**: Complete interaction history export

## Development

### Running Tests
```bash
npm test src/demo/DemoSquadManager.test.ts
```

### Building
```bash
npm run build
```

### File Structure
```
src/demo/
├── server.ts              # Express/WebSocket server
├── DemoSquadManager.ts    # Squad coordination logic
├── DemoSquadManager.test.ts # Unit tests
├── demonstration-script.md # Demo walkthrough guide
├── public/
│   ├── index.html         # Main interface
│   ├── styles.css         # 90s-themed styling
│   └── app.js            # Frontend JavaScript
└── README.md             # This file
```

## Protocol Events

The demo captures and visualizes these Open Floor Protocol events:

- `floor_request` - Agent requests speaking permission
- `floor_granted` - Floor control granted to agent
- `floor_yielded` - Agent releases floor control
- `task_delegation` - Leonardo delegates tasks to specialists
- `envelope_created` - Message envelope created
- `envelope_delivered` - Message successfully delivered
- `manifest_published` - Agent capabilities published
- `discovery_complete` - Agent discovery process finished
- `processing_error` - Error handling and recovery

## Educational Value

This demo showcases:
- **Multi-agent coordination** patterns
- **Vendor-independent** AI agent interoperability
- **Real-time protocol** monitoring and debugging
- **Scalable conversation** management
- **Robust error handling** in distributed systems
- **90s nostalgia** making technical concepts engaging

## Troubleshooting

### Common Issues

**Agents appear inactive:**
- Refresh the page to reinitialize connections
- Check browser console for WebSocket errors

**Protocol events not appearing:**
- Verify WebSocket connection status (bottom right indicator)
- Check network connectivity

**Floor management stuck:**
- The system includes automatic timeout recovery
- Try the "Clear Events" button to reset state

### Browser Compatibility
- Modern browsers with WebSocket support
- Chrome, Firefox, Safari, Edge (latest versions)
- JavaScript must be enabled

## Contributing

The demo interface is designed to be:
- **Extensible**: Easy to add new agents or protocol features
- **Testable**: Comprehensive unit test coverage
- **Maintainable**: Clean separation of concerns
- **Educational**: Clear code structure for learning

See the main project README for contribution guidelines.

## License

MIT License - See the main project for details.

---

**Cowabunga!** 🐢 Ready to see some shell-powered AI collaboration in action!