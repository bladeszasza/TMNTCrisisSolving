# Cowabunga Crisis Squad - Open Floor Protocol Demonstration Script

This script demonstrates all the key features of the Open Floor Protocol implementation through the Cowabunga Crisis Squad demo interface.

## Prerequisites

1. Start the demo server: `npm run demo`
2. Open browser to `http://localhost:3000`
3. Ensure all four agents are showing as "active" in the Squad Status panel

## Demonstration Sequence

### 1. Agent Discovery Demonstration

**Action**: Click the "🔍 Simulate Discovery" button in the Protocol Controls

**Expected Results**:
- Protocol Events tab shows `manifest_published` events for each agent
- Agent Manifests tab displays all four agent manifests with capabilities
- Statistics show increased event count

**Explanation**: "This demonstrates how agents discover each other's capabilities through manifest publishing, a core Open Floor Protocol feature."

### 2. Floor Management Demonstration

**Action**: Type a question in the chat: "How do I learn JavaScript?"

**Expected Results**:
- Floor Management panel shows Leonardo as current speaker
- Protocol Events show sequence: `floor_request` → `floor_granted` → `floor_yielded`
- Conversation Envelopes tab shows envelope creation and delivery events
- Squad Status shows Leonardo's status changing to "speaking" then back to "active"

**Explanation**: "Watch how Leonardo requests floor control, coordinates the team response, and then yields the floor - all managed through Open Floor Protocol events."

### 3. Task Delegation Pattern

**Action**: Ask a technical question: "I'm getting a JavaScript error in my code"

**Expected Results**:
- Protocol Events show `task_delegation` event with multiple tasks assigned
- Events show Leonardo delegating to Donatello (technical research), Raphael (reality check), and Michelangelo (engagement)
- Multiple envelope exchanges between agents

**Explanation**: "This showcases the delegation collaboration pattern where Leonardo assigns specialized tasks to appropriate team members."

### 4. Conversation Envelope Inspection

**Action**: Switch to "Conversation Envelopes" tab during or after a conversation

**Expected Results**:
- Real-time envelope creation and delivery events
- Envelope metadata showing sender, recipient, and message types
- Timing information for envelope routing

**Explanation**: "Every message between agents is wrapped in a conversation envelope with metadata for routing and coordination."

### 5. Protocol Statistics Monitoring

**Action**: Observe the Protocol Statistics panel during interactions

**Expected Results**:
- Total Events counter increases with each interaction
- Event Types count shows variety of protocol operations
- Events/Min shows activity rate
- Last Event timestamp updates in real-time

**Explanation**: "These statistics help monitor the health and activity of the multi-agent system."

### 6. Error Handling Demonstration

**Action**: Try to overwhelm the system with rapid messages or simulate network issues

**Expected Results**:
- `processing_error` events appear in the Protocol Events log
- System gracefully handles errors without breaking
- Floor management continues to function properly

**Explanation**: "The protocol includes robust error handling to maintain system stability during failures."

### 7. Export and Analysis

**Action**: Click "📥 Export Events" button after generating several interactions

**Expected Results**:
- JSON file downloads with complete event history
- File includes timestamps, event types, and metadata
- Statistics summary included in export

**Explanation**: "Event export enables analysis of multi-agent interactions and protocol performance."

## Key Protocol Features Demonstrated

1. **Agent Discovery**: Manifest publishing and capability matching
2. **Floor Management**: Request, grant, revoke, and yield operations
3. **Conversation Envelopes**: Message wrapping and routing
4. **Collaboration Patterns**: Orchestration and delegation
5. **Error Handling**: Graceful degradation and recovery
6. **Real-time Monitoring**: Live event streaming and statistics
7. **Event Persistence**: Complete interaction history

## Advanced Demonstrations

### Multi-Agent Coordination
Ask complex questions that require all agents: "I need to build a web application but I'm a beginner and want to make it fun to learn"

### Protocol Compliance Testing
Use the browser's developer tools to inspect WebSocket messages and verify Open Floor Protocol compliance.

### Performance Monitoring
Generate sustained conversation to observe protocol performance under load.

## Troubleshooting

- If agents appear inactive, refresh the page to reinitialize connections
- If protocol events aren't appearing, check browser console for WebSocket errors
- If floor management seems stuck, the system includes automatic timeout recovery

## Educational Value

This demonstration showcases:
- Vendor-independent AI agent interoperability
- Structured multi-agent communication patterns
- Real-time protocol monitoring and debugging
- Scalable conversation management
- Robust error handling in distributed systems

The 90s nostalgia theme makes the technical concepts more engaging while demonstrating serious multi-agent AI capabilities.