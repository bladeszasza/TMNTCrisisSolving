/**
 * BaseSquadAgent - Abstract base class for all Cowabunga Crisis Squad agents
 * Extends Open Floor's BotAgent with squad-specific functionality
 */

import { BotAgent, Envelope as ConversationEnvelope } from '@openfloor/protocol';
import { OFPEventType as EventType } from '../../protocol/OpenFloorAdapter';
import { OpenFloorAdapter, OFPAgentManifest } from '../../protocol/OpenFloorAdapter';
import { FloorManager } from '../../protocol/FloorManager';
import { ConversationEnvelopeHandler } from '../../protocol/ConversationEnvelopeHandler';
import { HybridAIService, AIRequest, AIResponse } from '../../services/HybridAIService';
import { 
  PersonalityConfig, 
  ExpertiseArea, 
  SquadAgentManifest,
  Priority,
  CollaborationPattern 
} from '../../utils/types';

export abstract class BaseSquadAgent extends BotAgent {
  protected readonly id: string;
  protected readonly name: string;
  protected personality: PersonalityConfig;
  protected expertise: ExpertiseArea;
  protected catchphrases: string[];
  protected floorManager: FloorManager;
  protected envelopeHandler: ConversationEnvelopeHandler;
  protected aiService: HybridAIService | null;

  constructor(
    id: string, 
    name: string, 
    personality: PersonalityConfig,
    floorManager: FloorManager,
    envelopeHandler: ConversationEnvelopeHandler,
    aiService?: HybridAIService
  ) {
    // Build OFP-compliant manifest and pass to BotAgent constructor
    const manifest = OpenFloorAdapter.getInstance().createAgentManifest(id, personality);
    super(manifest as any);
    this.id = id;
    this.name = name;
    this.personality = personality;
    this.expertise = personality.expertise_area;
    this.catchphrases = personality.catchphrases;
    this.floorManager = floorManager;
    this.envelopeHandler = envelopeHandler;
    this.aiService = aiService || null;
  }

  /**
   * Public getter for agent ID
   */
  get agentId(): string {
    return this.id;
  }

  /**
   * Public getter for agent name
   */
  get agentName(): string {
    return this.name;
  }

  /**
   * Process incoming conversation envelope
   * Must be implemented by each specific agent
   */
  abstract processEnvelope(envelope: ConversationEnvelope): Promise<ConversationEnvelope>;

  /**
   * Generate agent manifest with squad-specific capabilities
   */
  generateManifest(): SquadAgentManifest {
    return {
      id: this.id,
      name: this.name,
      version: '1.0.0',
      capabilities: this.getCapabilities(),
      description: this.getDescription(),
      personality: this.personality,
      collaboration_patterns: this.getSupportedCollaborationPatterns(),
      floor_management_capabilities: this.getFloorManagementCapabilities(),
      nineties_authenticity_level: this.calculateNinetiesAuthenticity(),
      metadata: {
        expertise_area: this.expertise,
        speaking_style: this.personality.speakingStyle
      }
    };
  }

  /**
   * Generate Open Floor Protocol compliant manifest
   */
  generateOFPManifest(): OFPAgentManifest {
    const adapter = OpenFloorAdapter.getInstance();
    return adapter.createAgentManifest(this.id, this.personality);
  }

  /**
   * Add personality flair to response based on agent's character
   */
  protected addPersonalityFlair(response: string): string {
    if (!response || response.trim().length === 0) {
      return response;
    }

    // Add a random catchphrase at the beginning or end
    const catchphrase = this.getRandomCatchphrase();
    const addAtBeginning = Math.random() < 0.5;
    
    if (addAtBeginning) {
      return `${catchphrase} ${response}`;
    } else {
      return `${response} ${catchphrase}`;
    }
  }

  /**
   * Validate that message contains authentic 90s references
   */
  protected validate90sAuthenticity(message: string): boolean {
    if (!message || message.trim().length === 0) {
      return false;
    }

    const lowerMessage = message.toLowerCase();
    
    // Check for personality-specific 90s references
    const hasPersonalityReferences = this.personality.nineties_references.some(ref => 
      lowerMessage.includes(ref.toLowerCase())
    );

    // Check for general 90s slang
    const general90sTerms = [
      'cowabunga', 'radical', 'tubular', 'gnarly', 'bogus', 'dude', 
      'totally', 'awesome', 'wicked', 'phat', 'fresh', 'def'
    ];
    
    const hasGeneral90sTerms = general90sTerms.some(term => 
      lowerMessage.includes(term)
    );

    return hasPersonalityReferences || hasGeneral90sTerms;
  }

  /**
   * Request floor control with appropriate priority
   */
  protected async requestFloor(reason: string = 'squad response'): Promise<boolean> {
    const priority = this.getFloorPriority();
    return await this.floorManager.requestFloor(this.id, priority);
  }

  /**
   * Yield floor control when done speaking
   */
  protected async yieldFloor(): Promise<void> {
    await this.floorManager.yieldFloor(this.id);
  }

  /**
   * Generate AI-powered response based on user input
   */
  protected async generateAIResponse(userMessage: string, context?: string): Promise<string> {
    if (!this.aiService) {
      // Fallback to personality-based response when AI service is not available
      return this.generateFallbackResponse(userMessage);
    }

    try {
      const aiRequest: AIRequest = {
        prompt: userMessage,
        personality: this.personality,
        context,
        userMessage
      };

      const response: AIResponse = await this.aiService.generateResponse(aiRequest);
      
      // Log authenticity warning if needed
      if (!response.hasAuthenticity) {
        console.warn(`Warning: AI response from ${this.name} lacks 90s authenticity`);
      }

      return response.content;
    } catch (error) {
      console.error(`AI generation error for ${this.name}:`, error);
      return this.generateFallbackResponse(userMessage);
    }
  }

  /**
   * Generate fallback response when AI is unavailable
   */
  private generateFallbackResponse(userMessage: string): string {
    const randomCatchphrase = this.getRandomCatchphrase();
    
    const fallbackResponses = {
      [ExpertiseArea.LEADERSHIP]: `${randomCatchphrase} As the leader, I think we should tackle this step by step. Let me coordinate with the team!`,
      [ExpertiseArea.TECHNICAL]: `${randomCatchphrase} This looks like a technical challenge! Let me analyze the specs and get back to you.`,
      [ExpertiseArea.ATTITUDE]: `${randomCatchphrase} Alright, here's the real talk - sometimes you gotta face the music head-on!`,
      [ExpertiseArea.ENGAGEMENT]: `${randomCatchphrase} Dude, that's totally awesome! Let's make this solution totally radical!`
    };

    return fallbackResponses[this.expertise] || `${randomCatchphrase} Let me think about that...`;
  }

  /**
   * Send a message through the conversation envelope system
   */
  protected async sendMessage(content: string, recipients: string[] = [], isAIGenerated: boolean = false): Promise<void> {
    // Only add personality flair when AI service is unavailable or for explicit fallback responses  
    // AI-generated responses already have personality integrated naturally in the system prompt
    const shouldAddFlair = !this.aiService || isAIGenerated === false;
    const finalContent = shouldAddFlair ? this.addPersonalityFlair(content) : content;
    
    if (!this.validate90sAuthenticity(finalContent)) {
      console.warn(`Warning: Message from ${this.name} lacks 90s authenticity`);
    }

    const envelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      { content: finalContent },
      this.id,
      recipients
    );

    await this.envelopeHandler.routeEnvelope(envelope);
  }

  /**
   * Get a random catchphrase for personality injection
   */
  protected getRandomCatchphrase(): string {
    if (this.catchphrases.length === 0) {
      return '';
    }
    const randomIndex = Math.floor(Math.random() * this.catchphrases.length);
    return this.catchphrases[randomIndex];
  }

  /**
   * Get agent-specific capabilities
   */
  protected abstract getCapabilities(): string[];

  /**
   * Get agent description
   */
  protected abstract getDescription(): string;

  /**
   * Get supported collaboration patterns
   */
  protected getSupportedCollaborationPatterns(): CollaborationPattern[] {
    return [
      CollaborationPattern.ORCHESTRATION,
      CollaborationPattern.DELEGATION,
      CollaborationPattern.MEDIATION,
      CollaborationPattern.CHANNELING
    ];
  }

  /**
   * Get floor management capabilities
   */
  protected getFloorManagementCapabilities(): string[] {
    return [
      'request_floor',
      'yield_floor',
      'respond_to_delegation',
      'participate_in_orchestration'
    ];
  }

  /**
   * Calculate 90s authenticity level based on personality configuration
   */
  protected calculateNinetiesAuthenticity(): number {
    const referenceCount = this.personality.nineties_references.length;
    const catchphraseCount = this.catchphrases.length;
    
    // Base score from references and catchphrases
    let score = Math.min(referenceCount * 10 + catchphraseCount * 5, 90);
    
    // Bonus for having a defined speaking style
    if (this.personality.speakingStyle) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Get floor priority based on agent role
   */
  protected getFloorPriority(): Priority {
    // Leonardo gets highest priority as leader
    if (this.expertise === ExpertiseArea.LEADERSHIP) {
      return Priority.LEADER;
    }
    return Priority.NORMAL;
  }
}