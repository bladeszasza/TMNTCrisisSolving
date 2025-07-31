/**
 * ClaudeAIService - Service wrapper for Anthropic Claude AI integration
 * Used as fallback when Gemini quota is exceeded
 */

import Anthropic from '@anthropic-ai/sdk';
import { PersonalityConfig, ExpertiseArea } from '../utils/types';

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AIRequest {
  prompt: string;
  personality: PersonalityConfig;
  context?: string;
  userMessage?: string;
}

export interface AIResponse {
  content: string;
  hasAuthenticity: boolean;
  confidence: number;
  processingTime: number;
}

export class ClaudeAIService {
  private client: Anthropic;
  private config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey
    });
  }

  /**
   * Test connection to Claude API
   */
  async testConnection(): Promise<{ isConnected: boolean; model: string; error?: string }> {
    try {
      const testMessage = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test' }]
      });

      return {
        isConnected: true,
        model: this.config.model
      };
    } catch (error) {
      return {
        isConnected: false,
        model: this.config.model,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate AI response with personality-aware prompting
   */
  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      const personalityPrompt = this.buildPersonalityPrompt(request);
      
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          { role: 'user', content: personalityPrompt }
        ]
      });

      let content = '';
      if (response.content && response.content.length > 0) {
        const textBlock = response.content.find(block => block.type === 'text');
        if (textBlock && 'text' in textBlock) {
          content = textBlock.text;
        }
      }
      
      const processingTime = Date.now() - startTime;
      const hasAuthenticity = this.validate90sAuthenticity(content, request.personality);
      
      return {
        content,
        hasAuthenticity,
        confidence: this.calculateConfidence(content),
        processingTime
      };
      
    } catch (error) {
      console.error('Claude AI generation error:', error);
      
      // Fallback to personality-aware generic response
      return {
        content: this.generateFallbackResponse(request),
        hasAuthenticity: true,
        confidence: 0.3,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Build personality-aware prompt for Claude
   */
  private buildPersonalityPrompt(request: AIRequest): string {
    const { personality, userMessage, context } = request;
    
    const basePrompt = `You are ${personality.name}, a member of the Cowabunga Crisis Squad with authentic 90s personality from the original TMNT cartoon series.

CHARACTER PROFILE:
- Name: ${personality.name}
- Speaking Style: ${personality.speakingStyle}
- Expertise Area: ${personality.expertise_area}
- Your signature catchphrases (use naturally when appropriate): ${personality.catchphrases.join(', ')}
- 90s references you know: ${personality.nineties_references.join(', ')}

RESPONSE GUIDELINES:
1. Respond naturally as ${personality.name} would, drawing from your personality traits
2. Your expertise is ${personality.expertise_area} - focus on that when relevant
3. Use 90s slang, references, and catchphrases when they feel natural
4. Keep responses conversational, helpful, and authentic to the 90s era
5. Maximum 2-3 sentences unless more detail is specifically needed
6. Be true to your character's personality from the original cartoon

${context ? `CONVERSATION CONTEXT:\n${context}\n` : ''}

USER INPUT: ${userMessage || request.prompt}

Respond naturally as ${personality.name}:`;

    return basePrompt;
  }

  /**
   * Generate fallback response when AI service fails
   */
  private generateFallbackResponse(request: AIRequest): string {
    const { personality } = request;
    const randomCatchphrase = personality.catchphrases[Math.floor(Math.random() * personality.catchphrases.length)];
    
    const fallbackResponses = {
      [ExpertiseArea.LEADERSHIP]: `${randomCatchphrase} Sorry dude, I'm having some shell-shocked connection issues right now! But as the leader, I say we should tackle this step by step.`,
      [ExpertiseArea.TECHNICAL]: `${randomCatchphrase} Whoa, my AI circuits are totally glitching right now! Give me a sec to reboot my systems.`,
      [ExpertiseArea.ATTITUDE]: `${randomCatchphrase} Hey, even I have off days! But here's the real talk - sometimes you gotta work with what you got.`,
      [ExpertiseArea.ENGAGEMENT]: `${randomCatchphrase} Dude, my brain's like a frozen computer right now! But hey, that's totally bogus - let's figure this out together!`
    };

    return fallbackResponses[personality.expertise_area] || `${randomCatchphrase} Sorry, having some technical difficulties!`;
  }

  /**
   * Validate 90s authenticity in AI response
   */
  private validate90sAuthenticity(content: string, personality: PersonalityConfig): boolean {
    if (!content || content.trim().length === 0) {
      return false;
    }

    const lowerContent = content.toLowerCase();
    
    // Check for personality-specific references
    const hasPersonalityReferences = personality.nineties_references.some(ref => 
      lowerContent.includes(ref.toLowerCase())
    );

    // Check for general 90s slang
    const general90sTerms = [
      'cowabunga', 'radical', 'tubular', 'gnarly', 'bogus', 'dude', 
      'totally', 'awesome', 'wicked', 'phat', 'fresh', 'def',
      'shell', 'turtle power'
    ];
    
    const hasGeneral90sTerms = general90sTerms.some(term => 
      lowerContent.includes(term)
    );

    // Check for TMNT-specific terms
    const tmntTerms = [
      'shell', 'turtle', 'cowabunga', 'dude', 'pizza'
    ];
    
    const hasTMNTTerms = tmntTerms.some(term => 
      lowerContent.includes(term)
    );

    return hasPersonalityReferences || hasGeneral90sTerms || hasTMNTTerms;
  }

  /**
   * Calculate confidence score based on response quality
   */
  private calculateConfidence(content: string): number {
    if (!content || content.trim().length === 0) {
      return 0;
    }

    let confidence = 0.5; // Base confidence

    // Check response length (not too short, not too long)
    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount >= 10 && wordCount <= 100) {
      confidence += 0.2;
    }

    // Check for complete sentences
    if (content.includes('.') || content.includes('!') || content.includes('?')) {
      confidence += 0.15;
    }

    // Check for natural conversation elements
    if (content.toLowerCase().includes('dude') || 
        content.toLowerCase().includes('cowabunga') ||
        content.toLowerCase().includes('totally')) {
      confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Get service configuration
   */
  getConfig(): ClaudeConfig {
    return { ...this.config };
  }
}