/**
 * HybridAIService - Handles failover between Gemini and Claude AI services
 * Automatically switches to Claude when Gemini quota is exceeded
 */

import { GeminiAIService, GeminiConfig } from './GeminiAIService';
import { ClaudeAIService, ClaudeConfig } from './ClaudeAIService';
import { PersonalityConfig } from '../utils/types';

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
  provider: 'gemini' | 'claude' | 'fallback';
}

export interface HybridAIConfig {
  gemini?: GeminiConfig;
  claude?: ClaudeConfig;
  preferredProvider: 'gemini' | 'claude';
  enableFailover: boolean;
}

export class HybridAIService {
  private geminiService: GeminiAIService | null = null;
  private claudeService: ClaudeAIService | null = null;
  private config: HybridAIConfig;
  private geminiFailureCount = 0;
  private lastGeminiFailure: Date | null = null;
  private readonly FAILURE_COOLDOWN_MS = 60000; // 1 minute cooldown after failures

  constructor(config: HybridAIConfig) {
    this.config = config;
    
    // Initialize available services
    if (config.gemini) {
      this.geminiService = new GeminiAIService(config.gemini);
    }
    
    if (config.claude) {
      this.claudeService = new ClaudeAIService(config.claude);
    }
  }

  /**
   * Test connection to available AI services
   */
  async testConnections(): Promise<{
    gemini?: { isConnected: boolean; model: string; error?: string };
    claude?: { isConnected: boolean; model: string; error?: string };
  }> {
    const results: any = {};
    
    if (this.geminiService) {
      try {
        results.gemini = await this.geminiService.testConnection();
      } catch (error) {
        results.gemini = {
          isConnected: false,
          model: this.config.gemini?.model || 'unknown',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
    
    if (this.claudeService) {
      try {
        results.claude = await this.claudeService.testConnection();
      } catch (error) {
        results.claude = {
          isConnected: false,
          model: this.config.claude?.model || 'unknown',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
    
    return results;
  }

  /**
   * Generate AI response with automatic failover
   */
  async generateResponse(request: AIRequest): Promise<AIResponse> {
    // Determine which service to try first
    const shouldTryGemini = this.shouldUseGemini();
    const shouldTryClaude = this.shouldUseClaude();

    // Try primary provider first
    if (this.config.preferredProvider === 'gemini' && shouldTryGemini) {
      try {
        const response = await this.geminiService!.generateResponse(request);
        this.geminiFailureCount = 0; // Reset failure count on success
        return { ...response, provider: 'gemini' };
      } catch (error) {
        console.warn('Gemini AI failed, attempting failover to Claude:', error);
        this.recordGeminiFailure();
        
        // Try Claude as fallback
        if (this.config.enableFailover && shouldTryClaude) {
          return await this.tryClaudeResponse(request);
        }
      }
    } else if (this.config.preferredProvider === 'claude' && shouldTryClaude) {
      try {
        const response = await this.claudeService!.generateResponse(request);
        return { ...response, provider: 'claude' };
      } catch (error) {
        console.warn('Claude AI failed, attempting failover to Gemini:', error);
        
        // Try Gemini as fallback
        if (this.config.enableFailover && shouldTryGemini) {
          return await this.tryGeminiResponse(request);
        }
      }
    }

    // If preferred provider is not available, try the other one
    if (shouldTryClaude && !shouldTryGemini) {
      return await this.tryClaudeResponse(request);
    } else if (shouldTryGemini && !shouldTryClaude) {
      return await this.tryGeminiResponse(request);
    }

    // Last resort: generate fallback response
    return this.generateFallbackResponse(request);
  }

  /**
   * Check if Gemini should be used (considering failures and cooldowns)
   */
  private shouldUseGemini(): boolean {
    if (!this.geminiService) return false;
    
    // If we're in cooldown period after failures, don't use Gemini
    if (this.lastGeminiFailure) {
      const timeSinceFailure = Date.now() - this.lastGeminiFailure.getTime();
      if (timeSinceFailure < this.FAILURE_COOLDOWN_MS && this.geminiFailureCount >= 3) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if Claude should be used
   */
  private shouldUseClaude(): boolean {
    return this.claudeService !== null;
  }

  /**
   * Try Gemini response with error handling
   */
  private async tryGeminiResponse(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await this.geminiService!.generateResponse(request);
      this.geminiFailureCount = 0; // Reset on success
      return { ...response, provider: 'gemini' };
    } catch (error) {
      this.recordGeminiFailure();
      throw error;
    }
  }

  /**
   * Try Claude response with error handling
   */
  private async tryClaudeResponse(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await this.claudeService!.generateResponse(request);
      return { ...response, provider: 'claude' };
    } catch (error) {
      console.error('Claude AI also failed:', error);
      throw error;
    }
  }

  /**
   * Record Gemini failure for cooldown logic
   */
  private recordGeminiFailure(): void {
    this.geminiFailureCount++;
    this.lastGeminiFailure = new Date();
    console.log(`Gemini failure count: ${this.geminiFailureCount}`);
  }

  /**
   * Generate fallback response when all AI services fail
   */
  private generateFallbackResponse(request: AIRequest): AIResponse {
    const { personality } = request;
    const randomCatchphrase = personality.catchphrases[Math.floor(Math.random() * personality.catchphrases.length)];
    
    const fallbackContent = `${randomCatchphrase} Sorry dude, all my AI circuits are totally fried right now! But hey, that's what makes us turtles - we adapt and overcome!`;
    
    return {
      content: fallbackContent,
      hasAuthenticity: true,
      confidence: 0.3,
      processingTime: 50,
      provider: 'fallback'
    };
  }

  /**
   * Get current service status
   */
  getServiceStatus(): {
    preferredProvider: string;
    geminiAvailable: boolean;
    claudeAvailable: boolean;
    geminiFailures: number;
    lastFailure: Date | null;
  } {
    return {
      preferredProvider: this.config.preferredProvider,
      geminiAvailable: this.geminiService !== null && this.shouldUseGemini(),
      claudeAvailable: this.claudeService !== null,
      geminiFailures: this.geminiFailureCount,
      lastFailure: this.lastGeminiFailure
    };
  }

  /**
   * Reset failure counters (useful for manual reset)
   */
  resetFailureCounters(): void {
    this.geminiFailureCount = 0;
    this.lastGeminiFailure = null;
  }

  /**
   * Get configuration of the active service
   */
  getConfig(): any {
    if (this.config.preferredProvider === 'gemini' && this.geminiService) {
      return { provider: 'gemini', ...this.geminiService.getConfig() };
    } else if (this.config.preferredProvider === 'claude' && this.claudeService) {
      return { provider: 'claude', ...this.claudeService.getConfig() };
    }
    return { provider: 'none' };
  }
}