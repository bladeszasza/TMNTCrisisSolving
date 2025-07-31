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

// Set up protocol event forwarding
squadManager.onProtocolEvent((event) => {
  broadcastToAll({
    type: 'protocol_event',
    data: event
  });
});

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

    // Process with squad (using enhanced method with events)
    const response = await squadManager.processUserMessageWithEvents(content);
    
    // Send squad response
    broadcastToAll({
      type: 'conversation_message',
      data: response
    });

    // Send updated floor status
    broadcastToAll({
      type: 'floor_status',
      data: squadManager.getFloorStatus()
    });

    // Emit protocol event for squad response
    broadcastToAll({
      type: 'protocol_event',
      data: {
        type: 'squad_response_generated',
        timestamp: new Date().toISOString(),
        data: {
          respondingAgent: response.sender,
          messageLength: response.content.length,
          floorStatus: squadManager.getFloorStatus().currentSpeaker
        }
      }
    });

  } catch (error) {
    console.error('Error handling user message:', error);
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Failed to process user message' }
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

server.listen(PORT, () => {
  console.log(`🐢 Cowabunga Crisis Squad Demo Server running on http://localhost:${PORT}`);
  console.log('🚀 Ready to demonstrate Open Floor Protocol capabilities!');
});