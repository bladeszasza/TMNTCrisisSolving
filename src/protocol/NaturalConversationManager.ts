/**
 * NaturalConversationManager - True multi-agent conversations using Open Floor Protocol
 * 
 * Allows agents to organically participate in conversations based on:
 * - Their personality and expertise interest in the topic
 * - Natural flow of conversation without scripted turns
 * - Open Floor Protocol envelope system for agent-to-agent communication
 * - AI-driven decision making about when to contribute
 */

import { Envelope as ConversationEnvelope } from '@openfloor/protocol';
import { OFPEventType as EventType } from './OpenFloorAdapter';
import { FloorManager } from './FloorManager';
import { ConversationEnvelopeHandler } from './ConversationEnvelopeHandler';
import { BaseSquadAgent } from '../agents/base/BaseSquadAgent';
import { Priority } from '../utils/types';

export interface ConversationParticipant {
  agent: BaseSquadAgent;
  interestLevel: number; // 0-1 scale of interest in current topic
  lastContribution: Date | null;
  contributionCount: number;
}

export interface ConversationState {
  id: string;
  topic: string;
  participants: Map<string, ConversationParticipant>;
  messageHistory: ConversationMessage[];
  isActive: boolean;
  startTime: Date;
  lastActivity: Date;
}

export interface ConversationMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  envelope?: ConversationEnvelope;
}

export interface AgentInterestDecision {
  agentId: string;
  wantsToSpeak: boolean;
  urgency: Priority;
  reasoning?: string;
}

/**
 * Natural conversation manager that lets agents decide organically when to speak
 */
export class NaturalConversationManager {
  private floorManager: FloorManager;
  private envelopeHandler: ConversationEnvelopeHandler;
  private activeConversations: Map<string, ConversationState> = new Map();
  private participants: Map<string, BaseSquadAgent> = new Map();

  constructor(
    floorManager: FloorManager,
    envelopeHandler: ConversationEnvelopeHandler
  ) {
    this.floorManager = floorManager;
    this.envelopeHandler = envelopeHandler;
  }

  /**
   * Register an agent as a potential conversation participant
   */
  registerAgent(agent: BaseSquadAgent): void {
    this.participants.set(agent.agentId, agent);
  }

  /**
   * Start a natural conversation with a user message
   * Returns the conversation ID for tracking
   */
  async startNaturalConversation(userMessage: string, topic: string = 'general'): Promise<string> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize conversation state
    const conversation: ConversationState = {
      id: conversationId,
      topic,
      participants: new Map(),
      messageHistory: [],
      isActive: true,
      startTime: new Date(),
      lastActivity: new Date()
    };

    // Register all available agents as participants
    for (const [agentId, agent] of this.participants) {
      conversation.participants.set(agentId, {
        agent,
        interestLevel: 0, // Will be calculated based on content
        lastContribution: null,
        contributionCount: 0
      });
    }

    this.activeConversations.set(conversationId, conversation);

    // Add user message to history
    const userMessageObj: ConversationMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    conversation.messageHistory.push(userMessageObj);

    // Let agents naturally decide who wants to respond
    await this.processNaturalFlow(conversationId, userMessage);

    return conversationId;
  }

  /**
   * Process natural conversation flow - let agents decide if they want to contribute
   */
  private async processNaturalFlow(conversationId: string, newMessage: string): Promise<void> {
    const conversation = this.activeConversations.get(conversationId);
    if (!conversation || !conversation.isActive) {
      return;
    }

    // Ask all agents if they're interested in contributing based on the current conversation
    const interestDecisions = await this.gatherAgentInterest(conversationId, newMessage);
    
    // Filter agents who want to speak and sort by urgency/interest
    const interestedAgents = interestDecisions
      .filter(decision => decision.wantsToSpeak)
      .sort((a, b) => {
        // Sort by urgency first, then by interest level if available
        const urgencyOrder = { [Priority.LEADER]: 3, [Priority.HIGH]: 2, [Priority.NORMAL]: 1, [Priority.LOW]: 0 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });

    // Let interested agents contribute in natural order
    for (const decision of interestedAgents) {
      if (!conversation.isActive) break; // Stop if conversation ended

      try {
        await this.facilitateAgentContribution(conversationId, decision.agentId);
        
        // Small delay between agents to allow for natural pacing
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // After each contribution, check if other agents want to respond to what was just said
        const lastMessage = conversation.messageHistory[conversation.messageHistory.length - 1];
        if (lastMessage && lastMessage.sender !== 'user') {
          // Recursively allow responses to responses (but with limits to prevent infinite loops)
          const currentDepth = this.calculateConversationDepth(conversation);
          if (currentDepth < 3) { // Limit recursive depth to 3 rounds
            await this.processNaturalFlow(conversationId, lastMessage.content);
          }
        }
      } catch (error) {
        console.error(`Error facilitating contribution from ${decision.agentId}:`, error);
      }
    }

    // Update conversation activity
    conversation.lastActivity = new Date();
  }

  /**
   * Ask all agents if they're interested in contributing to the current conversation
   */
  private async gatherAgentInterest(conversationId: string, newMessage: string): Promise<AgentInterestDecision[]> {
    const conversation = this.activeConversations.get(conversationId);
    if (!conversation) return [];

    const decisions: AgentInterestDecision[] = [];
    const conversationContext = this.buildConversationContext(conversation);

    // Ask each agent in parallel if they want to contribute
    const interestPromises = Array.from(conversation.participants.entries()).map(async ([agentId, participant]) => {
      try {
        const decision = await this.askAgentInterest(participant.agent, newMessage, conversationContext);
        return decision;
      } catch (error) {
        console.error(`Error getting interest from ${agentId}:`, error);
        return { agentId, wantsToSpeak: false, urgency: Priority.LOW };
      }
    });

    const results = await Promise.all(interestPromises);
    decisions.push(...results);

    return decisions;
  }

  /**
   * Ask a specific agent if they want to contribute to the conversation
   */
  private async askAgentInterest(agent: BaseSquadAgent, newMessage: string, conversationContext: string): Promise<AgentInterestDecision> {
    // Build a natural prompt asking the agent if they want to contribute
    const interestPrompt = `CONVERSATION ANALYSIS - Should you contribute?

Recent message: "${newMessage}"

Conversation so far:
${conversationContext}

Based on your personality and expertise, do you want to contribute to this conversation right now?

Consider:
- Is this relevant to your expertise area?
- Do you have something valuable to add?
- Does your personality make you want to jump in?
- Would your character naturally speak up here?

Respond with just "YES" if you want to contribute, or "NO" if you'd rather let others speak first.
If YES, add a brief reason why (max 10 words).

Format: YES: [brief reason] or NO`;

    try {
      const response = await (agent as any).generateAIResponse(conversationContext, interestPrompt);
      const trimmed = response.trim().toUpperCase();
      
      const wantsToSpeak = trimmed.startsWith('YES');
      let urgency = Priority.NORMAL;
      
      // Determine urgency based on agent's role and response
      if (wantsToSpeak) {
        if ((agent as any).expertise === 'LEADERSHIP') {
          urgency = Priority.LEADER;
        } else if (trimmed.includes('URGENT') || trimmed.includes('IMPORTANT')) {
          urgency = Priority.HIGH;
        }
      }

      return {
        agentId: agent.agentId,
        wantsToSpeak,
        urgency,
        reasoning: wantsToSpeak ? response : undefined
      };
    } catch (error) {
      console.error(`Error asking ${agent.agentId} about interest:`, error);
      return {
        agentId: agent.agentId,
        wantsToSpeak: false,
        urgency: Priority.LOW
      };
    }
  }

  /**
   * Facilitate an agent's contribution to the conversation
   */
  private async facilitateAgentContribution(conversationId: string, agentId: string): Promise<void> {
    const conversation = this.activeConversations.get(conversationId);
    const participant = conversation?.participants.get(agentId);
    
    if (!conversation || !participant) {
      return;
    }

    try {
      // Request floor for the agent
      const floorGranted = await this.floorManager.requestFloor(agentId, Priority.NORMAL);
      if (!floorGranted) {
        console.warn(`Floor not granted to ${agentId}`);
        return;
      }

      // Get agent's natural response to the conversation
      const conversationContext = this.buildConversationContext(conversation);
      const naturalPrompt = `Continue this conversation naturally as your character would.

Conversation so far:
${conversationContext}

Respond naturally based on your personality and expertise. This is a natural flowing conversation - just be yourself and add what you think is valuable or what your character would naturally say in this situation.`;

      const response = await (participant.agent as any).generateAIResponse(conversationContext, naturalPrompt);
      
      if (response && response.trim()) {
        // Create conversation message
        const message: ConversationMessage = {
          id: `msg_${Date.now()}_${agentId}`,
          sender: agentId,
          content: response.trim(),
          timestamp: new Date()
        };

        // Add to conversation history
        conversation.messageHistory.push(message);
        
        // Update participant stats
        participant.lastContribution = new Date();
        participant.contributionCount++;
        
        // Create and route envelope for other systems
        const envelope = await this.envelopeHandler.createEnvelope(
          'utterance' as any,
          { content: response.trim() },
          agentId,
          []
        );
        message.envelope = envelope;
        
        console.log(`🗣️  ${participant.agent.agentName}: ${response.trim()}`);
      }

      // Yield floor
      await this.floorManager.yieldFloor(agentId);
      
    } catch (error) {
      console.error(`Error in agent contribution for ${agentId}:`, error);
      // Ensure we yield floor even on error
      try {
        await this.floorManager.yieldFloor(agentId);
      } catch (yieldError) {
        console.error(`Error yielding floor for ${agentId}:`, yieldError);
      }
    }
  }

  /**
   * Build conversation context string from message history
   */
  private buildConversationContext(conversation: ConversationState): string {
    return conversation.messageHistory
      .map(msg => {
        const senderName = msg.sender === 'user' ? 'User' : 
          conversation.participants.get(msg.sender)?.agent.agentName || msg.sender;
        return `${senderName}: ${msg.content}`;
      })
      .join('\n');
  }

  /**
   * Calculate conversation depth to prevent infinite recursion
   */
  private calculateConversationDepth(conversation: ConversationState): number {
    // Count consecutive agent responses without user input
    let depth = 0;
    for (let i = conversation.messageHistory.length - 1; i >= 0; i--) {
      const message = conversation.messageHistory[i];
      if (message.sender === 'user') {
        break;
      }
      depth++;
    }
    return depth;
  }

  /**
   * Get conversation messages for display
   */
  getConversationMessages(conversationId: string): ConversationMessage[] {
    const conversation = this.activeConversations.get(conversationId);
    return conversation ? [...conversation.messageHistory] : [];
  }

  /**
   * End a conversation
   */
  endConversation(conversationId: string): void {
    const conversation = this.activeConversations.get(conversationId);
    if (conversation) {
      conversation.isActive = false;
    }
  }

  /**
   * Get active conversation IDs
   */
  getActiveConversationIds(): string[] {
    return Array.from(this.activeConversations.keys()).filter(id => 
      this.activeConversations.get(id)?.isActive
    );
  }
}