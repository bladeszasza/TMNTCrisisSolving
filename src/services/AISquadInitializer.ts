/**
 * AISquadInitializer - Initialize Cowabunga Crisis Squad with Gemini AI integration
 * Handles environment setup, AI service configuration, and agent instantiation
 */

import dotenv from 'dotenv';
import { GeminiAIService, GeminiConfig } from './GeminiAIService';
import { ClaudeAIService, ClaudeConfig } from './ClaudeAIService';
import { HybridAIService, HybridAIConfig } from './HybridAIService';
import { LeonardoLeaderAgent } from '../agents/LeonardoLeaderAgent';
import { DonatelloTechAgent } from '../agents/DonatelloTechAgent';
import { RaphaelAttitudeAgent } from '../agents/RaphaelAttitudeAgent';
import { MichelangeloFunAgent } from '../agents/MichelangeloFunAgent';
import { FloorManager } from '../protocol/FloorManager';
import { ConversationEnvelopeHandler } from '../protocol/ConversationEnvelopeHandler';
import { AgentDiscoveryService } from '../protocol/AgentDiscoveryService';

// Load environment variables
dotenv.config();

export interface SquadInitializationConfig {
  geminiApiKey?: string;
  geminiModel?: string;
  claudeApiKey?: string;
  claudeModel?: string;
  preferredProvider?: 'gemini' | 'claude';
  temperature?: number;
  maxTokens?: number;
  enableFallback?: boolean;
}

export interface InitializedSquad {
  leonardo: LeonardoLeaderAgent;
  donatello: DonatelloTechAgent;
  raphael: RaphaelAttitudeAgent;
  michelangelo: MichelangeloFunAgent;
  floorManager: FloorManager;
  envelopeHandler: ConversationEnvelopeHandler;
  discoveryService: AgentDiscoveryService;
  aiService: HybridAIService | null;
  isAIEnabled: boolean;
}

export class AISquadInitializer {
  private static instance: AISquadInitializer;
  
  private constructor() {}
  
  static getInstance(): AISquadInitializer {
    if (!AISquadInitializer.instance) {
      AISquadInitializer.instance = new AISquadInitializer();
    }
    return AISquadInitializer.instance;
  }

  /**
   * Initialize the Cowabunga Crisis Squad with AI integration
   */
  async initializeSquad(config?: SquadInitializationConfig): Promise<InitializedSquad> {
    console.log('🐢 Initializing Cowabunga Crisis Squad with Hybrid AI...');
    
    // Setup AI service
    const { aiService, isAIEnabled } = await this.initializeHybridAIService(config);
    
    // Initialize core protocol components
    const envelopeHandler = new ConversationEnvelopeHandler();
    const floorManager = new FloorManager(envelopeHandler);
    const discoveryService = new AgentDiscoveryService(envelopeHandler);
    
    // Initialize agents with AI service
    const leonardo = new LeonardoLeaderAgent(
      floorManager,
      envelopeHandler,
      discoveryService,
      undefined, // collaborationManager will be created internally
      undefined, // parallelManager will be created internally
      aiService || undefined
    );
    
    const donatello = new DonatelloTechAgent(
      floorManager,
      envelopeHandler,
      undefined, // Use default service config
      aiService || undefined
    );
    
    const raphael = new RaphaelAttitudeAgent(
      floorManager,
      envelopeHandler,
      aiService || undefined
    );
    
    const michelangelo = new MichelangeloFunAgent(
      floorManager,
      envelopeHandler,
      aiService || undefined
    );
    
    // Register all agents with discovery service
    await this.registerAgents(discoveryService, [leonardo, donatello, raphael, michelangelo]);
    
    console.log(`🚀 Squad initialized! AI Mode: ${isAIEnabled ? 'ENABLED ✅' : 'DISABLED (Fallback) ⚠️'}`);
    
    return {
      leonardo,
      donatello,
      raphael,
      michelangelo,
      floorManager,
      envelopeHandler,
      discoveryService,
      aiService,
      isAIEnabled
    };
  }

  /**
   * Initialize Hybrid AI service with Gemini and Claude failover support
   */
  private async initializeHybridAIService(config?: SquadInitializationConfig): Promise<{
    aiService: HybridAIService | null;
    isAIEnabled: boolean;
  }> {
    try {
      // Check for available API keys
      const geminiApiKey = config?.geminiApiKey || 
                          process.env.GEMINI_API_KEY || 
                          process.env.GOOGLE_API_KEY;
      
      const claudeApiKey = config?.claudeApiKey || 
                          process.env.CLAUDE_API_KEY ||
                          process.env.ANTHROPIC_API_KEY;
      
      if (!geminiApiKey && !claudeApiKey) {
        console.warn('⚠️  No AI API keys found (Gemini or Claude). Squad will run in fallback mode.');
        return { aiService: null, isAIEnabled: false };
      }
      
      // Configure hybrid AI service
      const hybridConfig: HybridAIConfig = {
        preferredProvider: config?.preferredProvider || (geminiApiKey ? 'gemini' : 'claude' ),
        enableFailover: config?.enableFallback !== false,
        gemini: geminiApiKey ? {
          apiKey: geminiApiKey,
          model: config?.geminiModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
          temperature: config?.temperature || parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
          maxTokens: config?.maxTokens || parseInt(process.env.GEMINI_MAX_TOKENS || '1024')
        } : undefined,
        claude: claudeApiKey ? {
          apiKey: claudeApiKey,
          model: config?.claudeModel || process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022',
          temperature: config?.temperature || parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
          maxTokens: config?.maxTokens || parseInt(process.env.CLAUDE_MAX_TOKENS || '1024')
        } : undefined
      };
      
      const aiService = new HybridAIService(hybridConfig);
      
      // Test connections to available services
      console.log('🔗 Testing AI service connections...');
      const connectionTests = await aiService.testConnections();
      
      let hasWorkingService = false;
      let serviceStatus = [];
      
      if (connectionTests.gemini) {
        if (connectionTests.gemini.isConnected) {
          console.log(`✅ Gemini connected: ${connectionTests.gemini.model}`);
          hasWorkingService = true;
          serviceStatus.push('Gemini ✅');
        } else {
          console.warn(`⚠️  Gemini connection failed: ${connectionTests.gemini.error}`);
          serviceStatus.push('Gemini ❌');
        }
      }
      
      if (connectionTests.claude) {
        if (connectionTests.claude.isConnected) {
          console.log(`✅ Claude connected: ${connectionTests.claude.model}`);
          hasWorkingService = true;
          serviceStatus.push('Claude ✅');
        } else {
          console.warn(`⚠️  Claude connection failed: ${connectionTests.claude.error}`);
          serviceStatus.push('Claude ❌');
        }
      }
      
      if (!hasWorkingService) {
        console.error('❌ No AI services are available');
        if (config?.enableFallback !== false) {
          console.log('🔄 Falling back to personality-based responses');
          return { aiService: null, isAIEnabled: false };
        }
        throw new Error('No AI services are available');
      }
      
      console.log(`🎯 AI Services: ${serviceStatus.join(', ')}`);
      console.log(`🥇 Primary provider: ${hybridConfig.preferredProvider}`);
      
      return { aiService, isAIEnabled: true };
      
    } catch (error) {
      console.error('❌ Failed to initialize Hybrid AI service:', error);
      
      if (config?.enableFallback !== false) {
        console.log('🔄 Falling back to personality-based responses');
        return { aiService: null, isAIEnabled: false };
      }
      
      throw error;
    }
  }

  /**
   * Register all agents with the discovery service
   */
  private async registerAgents(
    discoveryService: AgentDiscoveryService,
    agents: any[]
  ): Promise<void> {
    console.log('📋 Registering agents with discovery service...');
    
    for (const agent of agents) {
      try {
        // Register with Open Floor Protocol compliant manifest
        const ofpManifest = agent.generateOFPManifest();
        await discoveryService.publishOFPManifest(agent.id, ofpManifest);
        console.log(`✅ Registered: ${ofpManifest.identification.conversationalName}`);
      } catch (error) {
        console.error(`❌ Failed to register ${agent.name}:`, error);
      }
    }
  }

  /**
   * Validate environment configuration
   */
  validateConfiguration(): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check for API keys
    const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    if (!hasGeminiKey) {
      issues.push('No Gemini API key found in environment variables');
      recommendations.push('Set GEMINI_API_KEY or GOOGLE_API_KEY in your .env file');
    }
    
    // Check model configuration
    const model = process.env.GEMINI_MODEL;
    if (model && !['gemini-2.5-flash-lite', 'gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro'].includes(model)) {
      issues.push(`Unknown Gemini model: ${model}`);
      recommendations.push('Use gemini-2.5-flash-lite, gemini-2.0-flash-exp, gemini-1.5-flash, or gemini-1.5-pro');
    }
    
    // Check temperature
    const temperature = parseFloat(process.env.GEMINI_TEMPERATURE || '0.7');
    if (isNaN(temperature) || temperature < 0 || temperature > 1) {
      issues.push('Invalid temperature value');
      recommendations.push('Set GEMINI_TEMPERATURE between 0.0 and 1.0');
    }
    
    // Check max tokens
    const maxTokens = parseInt(process.env.GEMINI_MAX_TOKENS || '1024');
    if (isNaN(maxTokens) || maxTokens < 100 || maxTokens > 4096) {
      issues.push('Invalid max tokens value');
      recommendations.push('Set GEMINI_MAX_TOKENS between 100 and 4096');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Print configuration status
   */
  printConfigurationStatus(): void {
    const validation = this.validateConfiguration();
    
    console.log('\n🔧 Configuration Status:');
    console.log('========================');
    
    if (validation.isValid) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('⚠️  Configuration issues found:');
      validation.issues.forEach(issue => console.log(`   - ${issue}`));
      
      console.log('\n💡 Recommendations:');
      validation.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
    
    console.log('\n📋 Current Settings:');
    console.log(`   API Key: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   Model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite (default)'}`);
    console.log(`   Temperature: ${process.env.GEMINI_TEMPERATURE || '0.7 (default)'}`);
    console.log(`   Max Tokens: ${process.env.GEMINI_MAX_TOKENS || '1024 (default)'}`);
    console.log('========================\n');
  }
}