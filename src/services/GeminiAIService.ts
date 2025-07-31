/**
 * GeminiAIService - Service wrapper for Google Gemini AI integration
 * Handles AI generation requests with personality-aware prompting
 */

import { GoogleGenerativeAI, GenerativeModel, SafetySetting, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { PersonalityConfig, ExpertiseArea } from '../utils/types';

export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface GeminiConnectionTest {
  isConnected: boolean;
  model: string;
  error?: string;
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

export class GeminiAIService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    
    // Configure safety settings to allow creative 90s content
    const safetySettings: SafetySetting[] = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    this.model = this.genAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
      safetySettings,
    });
  }

  /**
   * Generate AI response with personality-aware prompting
   */
  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      const personalityPrompt = this.buildPersonalityPrompt(request);
      const result = await this.model.generateContent(personalityPrompt);
      const response = await result.response;
      const content = response.text();
      
      const processingTime = Date.now() - startTime;
      const hasAuthenticity = this.validate90sAuthenticity(content, request.personality);
      
      return {
        content,
        hasAuthenticity,
        confidence: this.calculateConfidence(content),
        processingTime
      };
      
    } catch (error) {
      console.error('Gemini AI generation error:', error);
      
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
   * Build personality-aware prompt for Gemini
   */
  private buildPersonalityPrompt(request: AIRequest): string {
    const { personality, userMessage, context } = request;
    
    const basePrompt = `You are ${personality.name}, a member of the Cowabunga Crisis Squad with authentic 90s personality.

PERSONALITY TRAITS:
- Speaking Style: ${personality.speakingStyle}
- Expertise Area: ${personality.expertise_area}
- Your catchphrases (use naturally when appropriate): ${personality.catchphrases.join(', ')}
- 90s slang and references you know: ${personality.nineties_references.join(', ')}

RESPONSE GUIDELINES:
1. Respond naturally as ${personality.name} would, drawing from your personality traits when it feels right
2. Your expertise is ${personality.expertise_area} - focus on that area when relevant
3. Use 90s slang, references, and catchphrases when they naturally fit the conversation
4. Keep responses conversational, helpful, and authentic to the 90s era
5. Maximum 2-3 sentences unless asked for more detail
6. Let your personality shine through organically

${context ? `CONTEXT: ${context}` : ''}

USER MESSAGE: ${userMessage || request.prompt}

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
      [ExpertiseArea.TECHNICAL]: `${randomCatchphrase} Whoa, my neural networks are totally glitching right now! Give me a sec to reboot my systems.`,
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
    
    // Check for catchphrases
    const hasCatchphrases = personality.catchphrases.some(phrase => 
      lowerContent.includes(phrase.toLowerCase())
    );
    
    // Check for general 90s terms
    const general90sTerms = [
      'cowabunga', 'radical', 'tubular', 'gnarly', 'bogus', 'dude', 
      'totally', 'awesome', 'wicked', 'phat', 'fresh', 'def', 'shell'
    ];
    
    const hasGeneral90sTerms = general90sTerms.some(term => 
      lowerContent.includes(term)
    );

    return hasPersonalityReferences || hasCatchphrases || hasGeneral90sTerms;
  }

  /**
   * Calculate response confidence based on content quality
   */
  private calculateConfidence(content: string): number {
    if (!content || content.trim().length === 0) {
      return 0;
    }
    
    let confidence = 0.5; // Base confidence
    
    // Length-based confidence (optimal range)
    const wordCount = content.split(' ').length;
    if (wordCount >= 10 && wordCount <= 100) {
      confidence += 0.2;
    }
    
    // Coherence indicators
    if (content.includes('!') || content.includes('?')) {
      confidence += 0.1; // Expressive language
    }
    
    if (content.split('.').length > 1) {
      confidence += 0.1; // Multiple sentences
    }
    
    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Test connection to Gemini API
   */
  async testConnection(): Promise<GeminiConnectionTest> {
    try {
      const result = await this.model.generateContent('Test connection: respond with "OK"');
      const response = await result.response;
      const text = response.text();
      
      return {
        isConnected: text.includes('OK'),
        model: this.config.model,
        error: text.includes('OK') ? undefined : 'Model did not respond with expected "OK"'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Gemini connection test failed:', errorMessage);
      
      return {
        isConnected: false,
        model: this.config.model,
        error: errorMessage
      };
    }
  }

  /**
   * Get current model configuration
   */
  getConfig(): GeminiConfig {
    return { ...this.config };
  }
}