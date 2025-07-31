/**
 * Demo Server for Cowabunga Crisis Squad
 * 
 * Provides a web-based interface for interacting with the squad
 * and visualizing Open Floor Protocol operations.
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { exec } from 'child_process';
import { DemoSquadManager } from './DemoSquadManager';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Demo squad manager
const squadManager = new DemoSquadManager();

// Initialize squad manager before accepting connections
async function initializeServer() {
  await squadManager.initialize();
  
  // Set up protocol event forwarding
  squadManager.onProtocolEvent((event) => {
    broadcastToAll({
      type: 'protocol_event',
      data: event
    });
  });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('🐢 New client connected to demo interface');
  
  // Send initial squad status
  ws.send(JSON.stringify({
    type: 'squad_status',
    data: squadManager.getSquadStatus()
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'user_message':
          await handleUserMessage(data.content, ws);
          break;
        case 'get_floor_status':
          ws.send(JSON.stringify({
            type: 'floor_status',
            data: squadManager.getFloorStatus()
          }));
          break;
        case 'get_agent_manifests':
          ws.send(JSON.stringify({
            type: 'agent_manifests',
            data: squadManager.getAgentManifests()
          }));
          break;
        case 'get_protocol_events':
          ws.send(JSON.stringify({
            type: 'protocol_events',
            data: squadManager.getProtocolEvents()
          }));
          break;
        case 'get_protocol_stats':
          ws.send(JSON.stringify({
            type: 'protocol_stats',
            data: squadManager.getProtocolStatistics()
          }));
          break;
        case 'simulate_discovery':
          squadManager.simulateAgentDiscovery();
          break;
        case 'generate_comics':
          await handleComicsGeneration(data.content, data.messages, ws);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Failed to process message' }
      }));
    }
  });

  ws.on('close', () => {
    console.log('🐢 Client disconnected from demo interface');
  });
});

async function handleUserMessage(content: string, ws: any) {
  try {
    // Broadcast user message to all connected clients
    broadcastToAll({
      type: 'conversation_message',
      data: {
        id: generateMessageId(),
        sender: 'user',
        content,
        timestamp: new Date().toISOString(),
        agentName: 'User',
        agentColor: '#007bff'
      }
    });

    // Emit protocol event for user message
    broadcastToAll({
      type: 'protocol_event',
      data: {
        type: 'user_message_received',
        timestamp: new Date().toISOString(),
        data: {
          content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          messageId: generateMessageId()
        }
      }
    });

    // Process with squad using natural conversation (multi-agent) with streaming
    await squadManager.processNaturalConversationStreaming(content, (response) => {
      // Stream each response as it arrives
      broadcastToAll({
        type: 'conversation_message',
        data: response
      });
      
      // Send updated floor status after each response
      broadcastToAll({
        type: 'floor_status',
        data: squadManager.getFloorStatus()
      });
      
      // Also send as envelope event for protocol tracking
      broadcastToAll({
        type: 'protocol_event',
        data: {
          type: 'envelope_received',
          timestamp: new Date().toISOString(),
          data: {
            envelope: {
              id: response.id,
              type: 'dialog',
              sender: response.sender,
              timestamp: response.timestamp,
              payload: {
                text: response.content,
                agentName: response.agentName
              }
            }
          }
        }
      });
    });

  } catch (error) {
    console.error('Error handling user message:', error);
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Failed to process user message' }
    }));
  }
}

async function handleComicsGeneration(content: string, messages: any[], ws: any) {
  try {
    console.log('🎭 Generating comics showcase from existing conversation...');
    
    // Create the title based on content
    const title = 'TEENAGE MUTANT NINJA TURTLES: CRISIS SQUAD SHOWCASE';
    const outputDir = './output';
    
    // Use the squad manager to generate HTML showcase from existing messages
    const result = await squadManager.generateHTMLFromExistingMessages(title, outputDir, messages);
    
    // Send success response with file path
    ws.send(JSON.stringify({
      type: 'comics_generated',
      data: {
        success: true,
        htmlPath: result.htmlPath,
        messageCount: result.messages.length
      }
    }));
    
    // Broadcast the generated comics info to all clients
    broadcastToAll({
      type: 'protocol_event',
      data: {
        type: 'comics_showcase_generated',
        timestamp: new Date().toISOString(),
        data: {
          htmlPath: result.htmlPath,
          agentContributions: result.messages.length,
          title: title
        }
      }
    });
    
    console.log(`✅ Comics showcase generated: ${result.htmlPath}`);
    
    // Auto-open the generated HTML file in browser like test-natural-conversation.ts
    const absolutePath = path.resolve(result.htmlPath);
    const command = process.platform === 'darwin' ? 'open' : 
                   process.platform === 'win32' ? 'start' : 'xdg-open';
    
    exec(`${command} "${absolutePath}"`, (error) => {
      if (error) {
        console.log('⚠️  Could not auto-open browser. Please open the file manually:');
        console.log(`   file://${absolutePath}`);
      } else {
        console.log('✅ Opened HTML showcase in browser!');
      }
    });
    
  } catch (error) {
    console.error('Error generating comics:', error);
    ws.send(JSON.stringify({
      type: 'comics_generated',
      data: {
        success: false,
        error: 'Failed to generate comics showcase'
      }
    }));
  }
}

function broadcastToAll(message: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Serve the demo interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoints for REST access
app.get('/api/squad/status', (req, res) => {
  res.json(squadManager.getSquadStatus());
});

app.get('/api/floor/status', (req, res) => {
  res.json(squadManager.getFloorStatus());
});

app.get('/api/agents/manifests', (req, res) => {
  res.json(squadManager.getAgentManifests());
});

app.post('/api/message', async (req, res) => {
  try {
    const { content } = req.body;
    const response = await squadManager.processUserMessage(content);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process message' });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  console.log(`🐢 Cowabunga Crisis Squad Demo Server running on http://localhost:${PORT}`);
  console.log('🔄 Initializing squad...');
  
  try {
    await initializeServer();
    console.log('🚀 Ready to demonstrate Open Floor Protocol capabilities!');
  } catch (error) {
    console.error('❌ Failed to initialize squad:', error);
    console.log('⚠️  Server will run in fallback mode');
  }
});