/**
 * Demo Squad Manager
 * 
 * Manages the squad for demo purposes, coordinating agent interactions
 * and providing status information for the UI.
 */

import { LeonardoLeaderAgent } from '../agents/LeonardoLeaderAgent';
import { DonatelloTechAgent } from '../agents/DonatelloTechAgent';
import { RaphaelAttitudeAgent } from '../agents/RaphaelAttitudeAgent';
import { MichelangeloFunAgent } from '../agents/MichelangeloFunAgent';
import { FloorManager } from '../protocol/FloorManager';
import { AgentDiscoveryService } from '../protocol/AgentDiscoveryService';
import { ConversationEnvelopeHandler } from '../protocol/ConversationEnvelopeHandler';
import { NaturalConversationManager } from '../protocol/NaturalConversationManager';
import { AISquadInitializer, InitializedSquad } from '../services/AISquadInitializer';
import { HybridAIService } from '../services/HybridAIService';
import { Priority } from '../utils/types';
import { ConversationHTMLGenerator, ConversationSession } from '../utils/ConversationHTMLGenerator';

export interface DemoMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  agentName: string;
  agentColor: string;
  floorStatus?: string;
}

export interface SquadStatus {
  agents: Array<{
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'speaking';
    color: string;
    expertise: string;
  }>;
  totalAgents: number;
  activeConversations: number;
}

export interface FloorStatus {
  currentSpeaker: string | null;
  currentSpeakerName: string | null;
  queueLength: number;
  queue: Array<{
    agentId: string;
    agentName: string;
    priority: number;
  }>;
  lastTransition: string | null;
}

export interface ProtocolEvent {
  type: string;
  timestamp: string;
  data: any;
  envelope?: any;
}

export class DemoSquadManager {
  private leonardo!: LeonardoLeaderAgent;
  private donatello!: DonatelloTechAgent;
  private raphael!: RaphaelAttitudeAgent;
  private michelangelo!: MichelangeloFunAgent;
  
  private floorManager!: FloorManager;
  private discoveryService!: AgentDiscoveryService;
  private envelopeHandler!: ConversationEnvelopeHandler;
  private naturalConversationManager!: NaturalConversationManager;
  private aiService: HybridAIService | null = null;
  private isAIEnabled: boolean = false;
  private isInitialized: boolean = false;
  
  private conversationHistory: DemoMessage[] = [];
  private protocolEvents: ProtocolEvent[] = [];
  private messageCounter = 0;
  private eventCallbacks: ((event: ProtocolEvent) => void)[] = [];

  constructor() {
    // Properties will be initialized in the initialize() method
  }

  /**
   * Initialize the squad with AI integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🐢 Initializing Demo Squad Manager with AI...');
    
    try {
      const initializer = AISquadInitializer.getInstance();
      const squad: InitializedSquad = await initializer.initializeSquad({
        enableFallback: true // Always enable fallback for demo
      });

      // Assign initialized components
      this.leonardo = squad.leonardo;
      this.donatello = squad.donatello;
      this.raphael = squad.raphael;
      this.michelangelo = squad.michelangelo;
      this.floorManager = squad.floorManager;
      this.envelopeHandler = squad.envelopeHandler;
      this.discoveryService = squad.discoveryService;
      this.aiService = squad.aiService;
      this.isAIEnabled = squad.isAIEnabled;

      // Initialize natural conversation manager
      this.naturalConversationManager = new NaturalConversationManager(
        this.floorManager,
        this.envelopeHandler
      );

      // Register all agents with the conversation manager
      this.naturalConversationManager.registerAgent(this.leonardo);
      this.naturalConversationManager.registerAgent(this.donatello);
      this.naturalConversationManager.registerAgent(this.raphael);
      this.naturalConversationManager.registerAgent(this.michelangelo);

      // Set up protocol event monitoring
      this.setupProtocolEventMonitoring();
      
      this.isInitialized = true;
      console.log(`✅ Demo Squad Manager initialized! AI Mode: ${this.isAIEnabled ? 'ENABLED' : 'FALLBACK'}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize Demo Squad Manager:', error);
      throw error;
    }
  }

  /**
   * Check if the squad has been initialized
   */
  isSquadInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get AI status information
   */
  getAIStatus(): { isEnabled: boolean; model?: string } {
    return {
      isEnabled: this.isAIEnabled,
      model: this.aiService?.getConfig().model
    };
  }

  /**
   * Set up protocol event monitoring for demo purposes
   */
  private setupProtocolEventMonitoring(): void {
    // This method sets up event monitoring for the demo
    // In a real implementation, this would set up listeners for protocol events
    console.log('📡 Protocol event monitoring initialized');
  }

  async processUserMessage(content: string): Promise<DemoMessage> {
    if (!this.isInitialized) {
      throw new Error('Squad not initialized. Call initialize() first.');
    }

    try {
      // Leonardo takes the lead on user messages
      await this.floorManager.requestFloor('leonardo', Priority.HIGH);
      
      // Process the message through Leonardo's coordination
      const squadResponse = await this.leonardo.coordinateSquadResponse({
        id: `problem_${Date.now()}`,
        description: content,
        category: 'general' as any,
        complexity: 'medium' as any,
        timestamp: new Date()
      });

      // Create response message using the synthesized recommendation
      const responseMessage: DemoMessage = {
        id: this.generateMessageId(),
        sender: 'leonardo',
        content: squadResponse.synthesizedRecommendation || squadResponse.leadResponse,
        timestamp: new Date().toISOString(),
        agentName: 'Leonardo',
        agentColor: '#0066cc',
        floorStatus: 'speaking'
      };

      this.conversationHistory.push(responseMessage);
      
      // Leonardo already yields the floor in coordinateSquadResponse finally block
      // No need to yield again here
      
      return responseMessage;
    } catch (error) {
      console.error('Error processing user message:', error);
      
      // Fallback response
      return {
        id: this.generateMessageId(),
        sender: 'leonardo',
        content: "Cowabunga! Something went shell-shocked wrong, dude! Let me reboot and try again.",
        timestamp: new Date().toISOString(),
        agentName: 'Leonardo',
        agentColor: '#0066cc'
      };
    }
  }

  getSquadStatus(): SquadStatus {
    const currentSpeaker = this.floorManager?.getCurrentSpeaker() || null;
    
    return {
      agents: [
        {
          id: 'leonardo',
          name: 'Leonardo',
          status: currentSpeaker === 'leonardo' ? 'speaking' : this.isInitialized ? 'active' : 'inactive',
          color: '#0066cc',
          expertise: 'Leadership & Coordination'
        },
        {
          id: 'donatello',
          name: 'Donatello',
          status: currentSpeaker === 'donatello' ? 'speaking' : this.isInitialized ? 'active' : 'inactive',
          color: '#9933cc',
          expertise: 'Technical Research'
        },
        {
          id: 'raphael',
          name: 'Raphael',
          status: currentSpeaker === 'raphael' ? 'speaking' : this.isInitialized ? 'active' : 'inactive',
          color: '#cc3333',
          expertise: 'Reality Checks & Attitude'
        },
        {
          id: 'michelangelo',
          name: 'Michelangelo',
          status: currentSpeaker === 'michelangelo' ? 'speaking' : this.isInitialized ? 'active' : 'inactive',
          color: '#ff9900',
          expertise: 'Engagement & Fun Solutions'
        }
      ],
      totalAgents: 4,
      activeConversations: this.conversationHistory.length
    };
  }

  getFloorStatus(): FloorStatus {
    const currentSpeaker = this.floorManager.getCurrentSpeaker();
    const queue = this.floorManager.getFloorQueue() || [];
    
    const agentNames: { [key: string]: string } = {
      'leonardo': 'Leonardo',
      'donatello': 'Donatello',
      'raphael': 'Raphael',
      'michelangelo': 'Michelangelo'
    };

    return {
      currentSpeaker,
      currentSpeakerName: currentSpeaker ? agentNames[currentSpeaker] : null,
      queueLength: queue.length,
      queue: queue.map(request => ({
        agentId: request.agentId,
        agentName: agentNames[request.agentId] || request.agentId,
        priority: request.priority === Priority.HIGH ? 3 : request.priority === Priority.NORMAL ? 2 : 1
      })),
      lastTransition: this.floorManager.getLastTransition()
    };
  }

  getAgentManifests() {
    return {
      leonardo: this.leonardo.generateManifest(),
      donatello: this.donatello.generateManifest(),
      raphael: this.raphael.generateManifest(),
      michelangelo: this.michelangelo.generateManifest()
    };
  }

  getConversationHistory(): DemoMessage[] {
    return this.conversationHistory;
  }

  private generateMessageId(): string {
    return `demo_msg_${++this.messageCounter}_${Date.now()}`;
  }

  /**
   * Protocol Event Management
   */
  
  onProtocolEvent(callback: (event: ProtocolEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  private emitProtocolEvent(type: string, data: any, envelope?: any): void {
    const event: ProtocolEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
      envelope
    };
    
    this.protocolEvents.push(event);
    
    // Notify all callbacks
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in protocol event callback:', error);
      }
    });
  }

  getProtocolEvents(): ProtocolEvent[] {
    return [...this.protocolEvents];
  }

  /**
   * Enhanced processing with protocol event emission
   */
  async processUserMessageWithEvents(content: string): Promise<DemoMessage> {
    // Emit floor request event
    this.emitProtocolEvent('floor_request', {
      agentId: 'leonardo',
      priority: 'high',
      reason: 'coordinating squad response'
    });

    try {
      // Leonardo takes the lead on user messages
      await this.floorManager.requestFloor('leonardo', Priority.HIGH);
      
      // Emit floor granted event
      this.emitProtocolEvent('floor_granted', {
        agentId: 'leonardo',
        previousSpeaker: this.floorManager.getCurrentSpeaker()
      });
      
      // Process the message through Leonardo's coordination
      const squadResponse = await this.leonardo.coordinateSquadResponse({
        id: `problem_${Date.now()}`,
        description: content,
        category: 'general' as any,
        complexity: 'medium' as any,
        timestamp: new Date()
      });

      // Emit delegation events (simulated)
      this.emitProtocolEvent('task_delegation', {
        delegator: 'leonardo',
        tasks: [
          { agent: 'donatello', task: 'technical_research' },
          { agent: 'raphael', task: 'reality_check' },
          { agent: 'michelangelo', task: 'engagement_enhancement' }
        ]
      });

      // Create response message using the synthesized recommendation
      const responseMessage: DemoMessage = {
        id: this.generateMessageId(),
        sender: 'leonardo',
        content: squadResponse.synthesizedRecommendation || squadResponse.leadResponse,
        timestamp: new Date().toISOString(),
        agentName: 'Leonardo',
        agentColor: '#0066cc',
        floorStatus: 'speaking'
      };

      this.conversationHistory.push(responseMessage);
      
      // Release floor only if Leonardo currently has it
      const currentSpeaker = this.floorManager.getCurrentSpeaker();
      if (currentSpeaker === 'leonardo') {
        await this.floorManager.yieldFloor('leonardo');
        
        // Emit floor yielded event
        this.emitProtocolEvent('floor_yielded', {
          agentId: 'leonardo',
          reason: 'coordination complete'
        });
      }
      
      return responseMessage;
    } catch (error) {
      console.error('Error processing user message:', error);
      
      // Emit error event
      this.emitProtocolEvent('processing_error', {
        error: error instanceof Error ? error.message : String(error),
        agentId: 'leonardo'
      });
      
      // Fallback response
      return {
        id: this.generateMessageId(),
        sender: 'leonardo',
        content: "Cowabunga! Something went shell-shocked wrong, dude! Let me reboot and try again.",
        timestamp: new Date().toISOString(),
        agentName: 'Leonardo',
        agentColor: '#0066cc'
      };
    }
  }

  /**
   * Simulate conversation envelope creation and routing
   */
  simulateEnvelopeExchange(messageType: string, sender: string, recipient: string, content: any): void {
    const envelope = {
      id: `envelope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: messageType,
      sender,
      recipient,
      timestamp: new Date().toISOString(),
      content,
      metadata: {
        conversationId: 'demo_conversation',
        priority: sender === 'leonardo' ? 'high' : 'normal'
      }
    };

    this.emitProtocolEvent('envelope_created', {
      envelope,
      messageType,
      sender,
      recipient
    }, envelope);

    // Simulate routing delay
    setTimeout(() => {
      this.emitProtocolEvent('envelope_delivered', {
        envelopeId: envelope.id,
        sender,
        recipient,
        deliveryTime: new Date().toISOString()
      }, envelope);
    }, 100);
  }

  /**
   * Simulate agent discovery process
   */
  simulateAgentDiscovery(): void {
    const agents = ['leonardo', 'donatello', 'raphael', 'michelangelo'];
    
    agents.forEach(agentId => {
      this.emitProtocolEvent('manifest_published', {
        agentId,
        manifest: (this.getAgentManifests() as any)[agentId],
        timestamp: new Date().toISOString()
      });
    });

    this.emitProtocolEvent('discovery_complete', {
      discoveredAgents: agents.length,
      totalCapabilities: agents.length * 3, // Approximate
      discoveryTime: new Date().toISOString()
    });
  }

  /**
   * Get protocol statistics
   */
  getProtocolStatistics() {
    const eventTypes = this.protocolEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: this.protocolEvents.length,
      eventTypes,
      lastEventTime: this.protocolEvents.length > 0 
        ? this.protocolEvents[this.protocolEvents.length - 1].timestamp 
        : null,
      averageEventsPerMinute: this.calculateEventsPerMinute()
    };
  }

  private calculateEventsPerMinute(): number {
    if (this.protocolEvents.length < 2) return 0;
    
    const firstEvent = new Date(this.protocolEvents[0].timestamp);
    const lastEvent = new Date(this.protocolEvents[this.protocolEvents.length - 1].timestamp);
    const durationMinutes = (lastEvent.getTime() - firstEvent.getTime()) / (1000 * 60);
    
    return durationMinutes > 0 ? this.protocolEvents.length / durationMinutes : 0;
  }

  /**
   * Generate HTML showcase for a conversation session
   */
  async generateConversationHTML(
    messages: DemoMessage[], 
    userMessage: string, 
    title?: string,
    outputDir?: string
  ): Promise<string> {
    const session: ConversationSession = {
      id: `session_${Date.now()}`,
      title: title || 'TEENAGE MUTANT NINJA TURTLES: CRISIS RESPONSE',
      userMessage,
      timestamp: new Date(),
      messages,
      aiEnabled: this.isAIEnabled,
      duration: undefined
    };

    return await ConversationHTMLGenerator.saveToFile(session, outputDir);
  }

  /**
   * Process natural conversation and automatically generate HTML showcase
   */
  async processNaturalConversationWithHTML(
    content: string, 
    title?: string, 
    outputDir?: string
  ): Promise<{ messages: DemoMessage[]; htmlPath: string }> {
    const startTime = Date.now();
    const messages = await this.processNaturalConversation(content);
    const duration = Date.now() - startTime;

    const session: ConversationSession = {
      id: `session_${Date.now()}`,
      title: title || 'TEENAGE MUTANT NINJA TURTLES: CRISIS RESPONSE',
      userMessage: content,
      timestamp: new Date(),
      messages,
      aiEnabled: this.isAIEnabled,
      duration
    };

    const htmlPath = await ConversationHTMLGenerator.saveToFile(session, outputDir);
    return { messages, htmlPath };
  }

  /**
   * Process a truly natural conversation using Open Floor Protocol
   * Agents decide organically when to contribute based on their personality and expertise
   */
  async processNaturalConversationStreaming(content: string, onMessage: (message: DemoMessage) => void): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Squad not initialized. Call initialize() first.');
    }

    try {
      console.log('\n🌟 Starting natural multi-agent conversation...');
      console.log(`📝 User input: "${content}"`);
      
      // Start the natural conversation
      const conversationId = await this.naturalConversationManager.startNaturalConversation(content, 'mission-planning');
      
      // Poll for new messages and stream them as they arrive
      const startTime = Date.now();
      const maxDuration = 15000; // 15 seconds max
      const pollInterval = 500; // Check every 500ms
      let lastMessageCount = 0;
      
      const pollForMessages = async () => {
        while (Date.now() - startTime < maxDuration) {
          // Get current conversation messages
          const naturalMessages = this.naturalConversationManager.getConversationMessages(conversationId);
          const agentMessages = naturalMessages.filter(msg => msg.sender !== 'user');
          
          // Check if we have new messages to stream
          if (agentMessages.length > lastMessageCount) {
            // Stream only the new messages
            for (let i = lastMessageCount; i < agentMessages.length; i++) {
              const message = agentMessages[i];
              
              const agentNames: { [key: string]: string } = {
                'leonardo': 'Leonardo',
                'donatello': 'Donatello', 
                'raphael': 'Raphael',
                'michelangelo': 'Michelangelo'
              };

              const agentColors: { [key: string]: string } = {
                'leonardo': '#0066cc',
                'donatello': '#9933cc',
                'raphael': '#cc3333',
                'michelangelo': '#ff9900'
              };

              const demoMessage: DemoMessage = {
                id: this.generateMessageId(),
                sender: message.sender,
                content: message.content,
                timestamp: new Date().toISOString(),
                agentName: agentNames[message.sender] || message.sender,
                agentColor: agentColors[message.sender] || '#666666'
              };

              this.conversationHistory.push(demoMessage);
              onMessage(demoMessage);
              
              // Also emit this as a protocol event so it appears in the envelope section
              this.emitProtocolEvent('envelope_created', {
                envelope: {
                  id: message.id || this.generateMessageId(),
                  type: 'dialog',
                  sender: message.sender,
                  timestamp: message.timestamp || new Date().toISOString(),
                  payload: {
                    text: message.content,
                    agentName: agentNames[message.sender] || message.sender
                  }
                }
              });
            }
            lastMessageCount = agentMessages.length;
          }
          
          // Wait before next poll
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      };
      
      await pollForMessages();
      
      console.log(`✅ Natural conversation completed with ${lastMessageCount} agent contributions`);
      
    } catch (error) {
      console.error('Error in natural conversation:', error);
      throw error;
    }
  }

  async processNaturalConversation(content: string): Promise<DemoMessage[]> {
    if (!this.isInitialized) {
      throw new Error('Squad not initialized. Call initialize() first.');
    }

    try {
      console.log('\n🌟 Starting natural multi-agent conversation...');
      console.log(`📝 User input: "${content}"`);
      
      // Use the natural conversation manager to facilitate organic agent interactions
      const conversationId = await this.naturalConversationManager.startNaturalConversation(content, 'mission-planning');
      
      // Wait a moment for the conversation to develop naturally
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get the conversation messages and convert to DemoMessage format
      const naturalMessages = this.naturalConversationManager.getConversationMessages(conversationId);
      const demoMessages: DemoMessage[] = [];
      
      for (const message of naturalMessages) {
        if (message.sender === 'user') continue; // Skip user message as it's not displayed in this format
        
        const agentNames: { [key: string]: string } = {
          'leonardo': 'Leonardo',
          'donatello': 'Donatello', 
          'raphael': 'Raphael',
          'michelangelo': 'Michelangelo'
        };

        const agentColors: { [key: string]: string } = {
          'leonardo': '#0066cc',
          'donatello': '#9933cc',
          'raphael': '#cc3333', 
          'michelangelo': '#ff9900'
        };

        const demoMessage: DemoMessage = {
          id: message.id,
          sender: message.sender,
          content: message.content,
          timestamp: message.timestamp.toISOString(),
          agentName: agentNames[message.sender] || message.sender,
          agentColor: agentColors[message.sender] || '#666666',
          floorStatus: 'completed'
        };

        demoMessages.push(demoMessage);
        this.conversationHistory.push(demoMessage);
      }
      
      // End the conversation to clean up resources
      this.naturalConversationManager.endConversation(conversationId);
      
      console.log(`\n✅ Natural conversation completed with ${demoMessages.length} agent contributions`);
      return demoMessages;

    } catch (error) {
      console.error('Error in natural conversation:', error);
      return []; // Return empty array on error
    }
  }

}