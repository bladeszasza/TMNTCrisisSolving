/**
 * Cowabunga Crisis Squad Demo Interface
 * Frontend JavaScript for the demo interface
 */

class SquadDemoInterface {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.messageHistory = [];
        this.protocolEvents = [];
        
        this.initializeInterface();
        this.connectWebSocket();
        this.setupEventListeners();
    }

    initializeInterface() {
        // Initialize empty states
        this.updateSquadStatus({ agents: [], totalAgents: 0, activeConversations: 0 });
        this.updateFloorStatus({ 
            currentSpeaker: null, 
            currentSpeakerName: null, 
            queueLength: 0, 
            queue: [] 
        });
        
        // Add welcome message
        this.addMessage({
            id: 'welcome',
            sender: 'system',
            content: '🐢 Cowabunga! Welcome to the Crisis Squad demo! Ask us anything and watch the Open Floor Protocol in action.',
            timestamp: new Date().toISOString(),
            agentName: 'System',
            agentColor: '#666666'
        });
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.updateConnectionStatus('connecting', 'Connecting...');
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('🐢 Connected to squad demo server');
                this.isConnected = true;
                this.updateConnectionStatus('connected', 'Connected');
                this.requestInitialData();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('🐢 Disconnected from squad demo server');
                this.isConnected = false;
                this.updateConnectionStatus('disconnected', 'Disconnected');
                
                // Attempt to reconnect after 3 seconds
                setTimeout(() => {
                    if (!this.isConnected) {
                        this.connectWebSocket();
                    }
                }, 3000);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('disconnected', 'Connection Error');
            };
            
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.updateConnectionStatus('disconnected', 'Failed to Connect');
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'squad_status':
                this.updateSquadStatus(data.data);
                break;
            case 'floor_status':
                this.updateFloorStatus(data.data);
                break;
            case 'conversation_message':
                this.addMessage(data.data);
                break;
            case 'agent_manifests':
                this.updateAgentManifests(data.data);
                break;
            case 'protocol_event':
                this.addProtocolEvent(data.data);
                break;
            case 'protocol_events':
                this.loadProtocolEvents(data.data);
                break;
            case 'protocol_stats':
                this.updateProtocolStats(data.data);
                break;
            case 'comics_generated':
                this.handleComicsGenerated(data.data);
                break;
            case 'error':
                this.showError(data.data.message);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    requestInitialData() {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify({ type: 'get_floor_status' }));
            this.ws.send(JSON.stringify({ type: 'get_agent_manifests' }));
            this.ws.send(JSON.stringify({ type: 'get_protocol_events' }));
            this.ws.send(JSON.stringify({ type: 'get_protocol_stats' }));
        }
    }

    setupEventListeners() {
        // Message input and send button
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });


        // Protocol control buttons
        document.getElementById('simulate-discovery-btn').addEventListener('click', () => {
            if (this.isConnected && this.ws) {
                this.ws.send(JSON.stringify({ type: 'simulate_discovery' }));
            }
        });

        document.getElementById('clear-events-btn').addEventListener('click', () => {
            this.protocolEvents = [];
            document.getElementById('events-log').innerHTML = '';
            document.getElementById('envelope-log').innerHTML = '';
            this.updateProtocolStatsDisplay();
        });

        document.getElementById('export-events-btn').addEventListener('click', () => {
            this.exportProtocolEvents();
        });

        document.getElementById('view-comics-btn').addEventListener('click', () => {
            this.generateComicsView();
        });
    }

    sendMessage() {
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        const content = messageInput.value.trim();
        
        if (!content || !this.isConnected) return;
        
        // Disable input while processing
        messageInput.disabled = true;
        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';
        
        // Send message via WebSocket
        this.ws.send(JSON.stringify({
            type: 'user_message',
            content: content
        }));
        
        // Clear input
        messageInput.value = '';
        
        // Re-enable input after a short delay
        setTimeout(() => {
            messageInput.disabled = false;
            sendButton.disabled = false;
            sendButton.textContent = 'Send';
            messageInput.focus();
        }, 1000);
    }

    addMessage(message) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.sender}`;
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${message.agentName}</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">${this.formatMessageContent(message.content)}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        this.messageHistory.push(message);
    }

    formatMessageContent(content) {
        // Basic formatting for better readability
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    updateSquadStatus(status) {
        const squadStatusContainer = document.getElementById('squad-status');
        
        squadStatusContainer.innerHTML = status.agents.map(agent => `
            <div class="agent-card ${agent.id}">
                <div class="agent-name">${agent.name}</div>
                <div class="agent-status ${agent.status}">${agent.status}</div>
                <div class="agent-expertise">${agent.expertise}</div>
            </div>
        `).join('');
    }

    updateFloorStatus(floorStatus) {
        const currentSpeakerElement = document.getElementById('current-speaker');
        const floorQueueElement = document.getElementById('floor-queue');
        
        currentSpeakerElement.textContent = floorStatus.currentSpeakerName || 'None';
        
        if (floorStatus.queue.length === 0) {
            floorQueueElement.innerHTML = '<div class="queue-empty">No agents in queue</div>';
        } else {
            floorQueueElement.innerHTML = floorStatus.queue.map(item => `
                <div class="queue-item priority-${item.priority === 3 ? 'high' : item.priority === 2 ? 'medium' : 'low'}">
                    <span>${item.agentName}</span>
                    <span class="priority">Priority: ${item.priority}</span>
                </div>
            `).join('');
        }
    }

    updateAgentManifests(manifests) {
        const manifestsContainer = document.getElementById('manifests-display');
        
        manifestsContainer.innerHTML = Object.entries(manifests).map(([agentId, manifest]) => `
            <div class="manifest-card">
                <div class="manifest-header">${manifest.name || agentId}</div>
                <div class="manifest-details">
                    <div><strong>Version:</strong> ${manifest.version || '1.0.0'}</div>
                    <div><strong>Description:</strong> ${manifest.description || 'No description'}</div>
                    <div class="manifest-capabilities">
                        <strong>Capabilities:</strong>
                        ${(manifest.capabilities || []).map(cap => 
                            `<span class="capability-tag">${cap}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    addProtocolEvent(event) {
        const eventsLog = document.getElementById('events-log');
        const envelopeLog = document.getElementById('envelope-log');
        
        const timestamp = new Date(event.timestamp).toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.dataset.eventType = event.type;
        
        // Color code different event types
        const eventColors = {
            'floor_request': '#ffc107',
            'floor_granted': '#28a745',
            'floor_yielded': '#6c757d',
            'task_delegation': '#007bff',
            'envelope_created': '#17a2b8',
            'envelope_delivered': '#20c997',
            'manifest_published': '#6f42c1',
            'processing_error': '#dc3545'
        };
        
        const eventColor = eventColors[event.type] || '#6c757d';
        
        logEntry.innerHTML = `
            <div class="log-timestamp">${timestamp}</div>
            <div class="log-event" style="color: ${eventColor}">
                <span class="event-icon">●</span> ${this.formatEventType(event.type)}
            </div>
            <div class="log-details">${this.formatEventData(event)}</div>
        `;
        
        // Add to appropriate log
        if (event.type.includes('envelope') || event.type.includes('message')) {
            envelopeLog.appendChild(logEntry.cloneNode(true));
            envelopeLog.scrollTop = envelopeLog.scrollHeight;
        } else {
            eventsLog.appendChild(logEntry.cloneNode(true));
            eventsLog.scrollTop = eventsLog.scrollHeight;
        }
        
        this.protocolEvents.push(event);
        
        // Update real-time stats
        this.updateProtocolStatsDisplay();
    }

    loadProtocolEvents(events) {
        // Clear existing events
        this.protocolEvents = [];
        document.getElementById('events-log').innerHTML = '';
        document.getElementById('envelope-log').innerHTML = '';
        
        // Add all events
        events.forEach(event => this.addProtocolEvent(event));
    }

    formatEventType(type) {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatEventData(event) {
        switch (event.type) {
            case 'floor_request':
                return `Agent: ${event.data.agentId}, Priority: ${event.data.priority}`;
            case 'floor_granted':
                return `Granted to: ${event.data.agentId}`;
            case 'floor_yielded':
                return `Agent: ${event.data.agentId}, Reason: ${event.data.reason}`;
            case 'task_delegation':
                return `Delegator: ${event.data.delegator}, Tasks: ${event.data.tasks.length}`;
            case 'envelope_created':
                return `${event.data.sender} → ${event.data.recipient} (${event.data.messageType})`;
            case 'envelope_delivered':
                return `Delivered: ${event.data.envelopeId}`;
            case 'manifest_published':
                return `Agent: ${event.data.agentId}`;
            default:
                return JSON.stringify(event.data, null, 2);
        }
    }

    updateProtocolStats(stats) {
        // Add stats display to the protocol panel
        const statsContainer = document.getElementById('protocol-stats');
        if (!statsContainer) {
            // Create stats container if it doesn't exist
            const protocolPanel = document.querySelector('.protocol-panel');
            const statsDiv = document.createElement('div');
            statsDiv.id = 'protocol-stats';
            statsDiv.className = 'protocol-stats';
            protocolPanel.insertBefore(statsDiv, protocolPanel.querySelector('.protocol-tabs'));
        }
        
        this.updateProtocolStatsDisplay(stats);
    }

    updateProtocolStatsDisplay(stats = null) {
        const statsContainer = document.getElementById('protocol-stats');
        if (!statsContainer) return;
        
        // Use provided stats or calculate from current events
        const currentStats = stats || this.calculateCurrentStats();
        
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${currentStats.totalEvents}</div>
                    <div class="stat-label">Total Events</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${Object.keys(currentStats.eventTypes).length}</div>
                    <div class="stat-label">Event Types</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${Math.round(currentStats.averageEventsPerMinute || 0)}</div>
                    <div class="stat-label">Events/Min</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${currentStats.lastEventTime ? 
                        new Date(currentStats.lastEventTime).toLocaleTimeString() : 'None'}</div>
                    <div class="stat-label">Last Event</div>
                </div>
            </div>
        `;
    }

    calculateCurrentStats() {
        const eventTypes = this.protocolEvents.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1;
            return acc;
        }, {});

        return {
            totalEvents: this.protocolEvents.length,
            eventTypes,
            lastEventTime: this.protocolEvents.length > 0 
                ? this.protocolEvents[this.protocolEvents.length - 1].timestamp 
                : null,
            averageEventsPerMinute: 0 // Simplified for demo
        };
    }

    exportProtocolEvents() {
        const exportData = {
            exportTime: new Date().toISOString(),
            totalEvents: this.protocolEvents.length,
            events: this.protocolEvents,
            statistics: this.calculateCurrentStats()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `cowabunga-protocol-events-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(link.href);
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    updateConnectionStatus(status, text) {
        const indicator = document.getElementById('connection-indicator');
        const statusText = document.getElementById('connection-text');
        
        indicator.className = `status-indicator ${status}`;
        statusText.textContent = text;
    }

    showError(message) {
        // Add error message to chat
        this.addMessage({
            id: `error_${Date.now()}`,
            sender: 'system',
            content: `❌ Error: ${message}`,
            timestamp: new Date().toISOString(),
            agentName: 'System',
            agentColor: '#dc3545'
        });
    }

    generateComicsView() {
        // Check if we have any conversation messages to generate comics from
        const conversationMessages = this.messageHistory.filter(msg => 
            msg.sender !== 'system' && msg.sender !== 'user'
        );

        if (conversationMessages.length === 0) {
            this.showError('🎭 Cowabunga! We need some turtle conversation first! Send a message to the squad, then try View Comics again.');
            return;
        }

        // Create user message from the last user input or use a default crisis scenario
        const userMessage = this.messageHistory.find(msg => msg.sender === 'user')?.content || 
                          'Emergency! We need the turtle squad to help with a radical crisis!';

        // Send request to server to generate HTML showcase
        if (this.isConnected && this.ws) {
            this.addMessage({
                id: 'comics-gen-' + Date.now(),
                sender: 'system',
                content: '🎭 Cowabunga! Generating comic book showcase... This will take a few seconds to create your totally tubular HTML experience!',
                timestamp: new Date().toISOString(),
                agentName: 'Comics Generator',
                agentColor: '#ff9900'
            });

            this.ws.send(JSON.stringify({ 
                type: 'generate_comics',
                content: userMessage,
                messages: conversationMessages
            }));
        } else {
            this.showError('🐢 Not connected to the squad server. Cannot generate comics view.');
        }
    }

    handleComicsGenerated(data) {
        if (data.success) {
            this.addMessage({
                id: 'comics-success-' + Date.now(),
                sender: 'system',
                content: `🎭 Cowabunga! Comic book showcase generated successfully! ${data.messageCount} turtle contributions have been transformed into an awesome comic book experience! Check your output folder: ${data.htmlPath}`,
                timestamp: new Date().toISOString(),
                agentName: 'Comics Generator',
                agentColor: '#28a745'
            });

            // Try to open the HTML file in browser
            const fileUrl = `file://${window.location.pathname.replace('/index.html', '').replace('public', '')}output/${data.htmlPath.split('/').pop()}`;
            
            // Create a downloadable link for the user
            const link = document.createElement('a');
            link.href = fileUrl;
            link.target = '_blank';
            link.textContent = '🎭 Open Comics Showcase';
            link.style.cssText = `
                display: inline-block;
                margin: 10px 0;
                padding: 8px 15px;
                background: linear-gradient(135deg, #ff9900, #cc3333);
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
            `;
            
            // Add the link to the last message
            const lastMessage = document.querySelector('.message:last-child .message-content');
            if (lastMessage) {
                lastMessage.appendChild(document.createElement('br'));
                lastMessage.appendChild(link);
            }
        } else {
            this.showError(`🎭 Failed to generate comics: ${data.error}`);
        }
    }
}

// Initialize the demo interface when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🐢 Initializing Cowabunga Crisis Squad Demo Interface');
    window.squadDemo = new SquadDemoInterface();
});