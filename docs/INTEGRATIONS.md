# Integration Guide

This guide provides essential information for integrating with or extending the Natural Conversation Test Suite.

## AI Service Integration

### Google Gemini AI
```bash
# .env configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=1024
```

### Anthropic Claude AI (Failover)
```bash
# .env configuration
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_MODEL=claude-3-5-haiku-20241022
CLAUDE_TEMPERATURE=0.7
CLAUDE_MAX_TOKENS=1024
```

### Hybrid AI Service
The system uses a hybrid approach with automatic failover:
```typescript
const hybridAI = new HybridAIService({
  gemini: geminiConfig,
  claude: claudeConfig,
  preferredProvider: 'gemini',
  enableFailover: true
});
```

## Open Floor Protocol Integration

The system implements full OFP compliance for interoperability:

### Agent Manifests
```json
{
  "identification": {
    "speakerUri": "tag:squad:leonardo",
    "serviceUrl": "http://localhost:3000/agents/leonardo",
    "organization": "Cowabunga Crisis Squad",
    "conversationalName": "Leonardo"
  },
  "capabilities": [{
    "keyphrases": ["leadership", "coordination", "strategy"],
    "descriptions": ["Team coordination and strategic planning"],
    "languages": ["en-US"]
  }]
}
```

### Conversation Envelopes
```typescript
// OFP-compliant envelope structure
{
  "openFloor": {
    "schema": {
      "version": "1.0.0",
      "url": "https://github.com/open-voice-interoperability/..."
    },
    "conversation": {
      "id": "default-conversation",
      "conversants": [...]
    },
    "sender": {
      "speakerUri": "tag:squad:leonardo"
    },
    "events": [...]
  }
}
```

## REST API Endpoints

### Conversation API
- `POST /api/conversation` - Start natural conversation
- `GET /api/status` - Get squad status
- `GET /api/floor` - Get floor management status
- `GET /api/health` - System health check

### Example Usage
```bash
# Start conversation
curl -X POST http://localhost:3000/api/conversation \
  -H "Content-Type: application/json" \
  -d '{"message": "Crisis scenario here!", "generateHTML": true}'

# Check system health
curl http://localhost:3000/api/health
```

## WebSocket Integration

Connect to `ws://localhost:3000` for real-time conversation updates:

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'protocol_event') {
    console.log('Protocol event:', data.event);
  }
};

// Start conversation
ws.send(JSON.stringify({
  type: 'start_conversation',
  message: 'Your crisis scenario'
}));
```

## Extension Patterns

### Custom Agent Development
```typescript
import { BaseSquadAgent } from '../agents/base/BaseSquadAgent';

export class CustomAgent extends BaseSquadAgent {
  constructor(floorManager, envelopeHandler, aiService) {
    const personality = {
      name: 'CustomAgent',
      catchphrases: ['Custom response!'],
      speakingStyle: SpeakingStyle.SPECIALIST,
      nineties_references: ['dial-up', 'CD-ROM'],
      expertise_area: ExpertiseArea.CUSTOM
    };
    
    super('custom', 'Custom Agent', personality, floorManager, envelopeHandler, aiService);
  }
}
```

## Environment Configuration

### Development
```bash
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
GEMINI_API_KEY=your_dev_key
CLAUDE_API_KEY=your_dev_key
```

### Production
```bash
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
GEMINI_API_KEY=your_prod_key
CLAUDE_API_KEY=your_prod_key
```

## Monitoring

### Health Checks
- System health: `GET /api/health`
- AI service status: Built into health endpoint
- Protocol compliance: Automatic validation

### Metrics
Basic performance metrics are available through the health endpoint.

---

This integration guide covers the essential patterns for extending or integrating with the Natural Conversation Test Suite system.