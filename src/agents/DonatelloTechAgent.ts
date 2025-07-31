/**
 * DonatelloTechAgent - The tech specialist of the Cowabunga Crisis Squad
 * Handles research, technical analysis, and 90s tech reference integration
 */

import { Envelope as ConversationEnvelope } from '@openfloor/protocol';
import { OFPEventType as EventType } from '../protocol/OpenFloorAdapter';
import { BaseSquadAgent } from './base/BaseSquadAgent';
import { FloorManager } from '../protocol/FloorManager';
import { ConversationEnvelopeHandler } from '../protocol/ConversationEnvelopeHandler';
import { PersonalityConfigFactory } from '../utils/PersonalityConfig';
import { HybridAIService } from '../services/HybridAIService';
import {
  UserProblem,
  AgentContribution,
  ResearchResults,
  TechnicalInsight,
  ComplexityLevel,
  ProblemCategory
} from '../utils/types';

export interface ResearchQuery {
  id: string;
  query: string;
  category: ProblemCategory;
  priority: number;
  timestamp: Date;
}

export interface TechnicalAnalysisResult {
  analysis: string;
  recommendations: string[];
  complexity: ComplexityLevel;
  tech_references: string[];
  confidence: number;
}

export interface KnowledgeSynthesis {
  sources: string[];
  synthesized_knowledge: string;
  key_insights: string[];
  tech_analogies: string[];
}

export interface ServiceFailureConfig {
  maxRetries: number;
  retryDelay: number;
  fallbackEnabled: boolean;
  offlineMode: boolean;
  degradedCapabilityNotification: boolean;
}

export interface CachedKnowledge {
  query: string;
  results: ResearchResults;
  timestamp: Date;
  accessCount: number;
  lastAccessed: Date;
}

export interface ServiceStatus {
  researchService: 'online' | 'degraded' | 'offline';
  analysisService: 'online' | 'degraded' | 'offline';
  cacheService: 'online' | 'offline';
  lastHealthCheck: Date;
  failureCount: number;
}

export class DonatelloTechAgent extends BaseSquadAgent {
  private researchEngine: ResearchEngine;
  private technicalAnalyzer: TechnicalAnalyzer;
  private activeResearch: Map<string, ResearchQuery> = new Map();
  private knowledgeCache: Map<string, CachedKnowledge> = new Map();
  
  // Service failure handling
  private serviceConfig: ServiceFailureConfig;
  private serviceStatus: ServiceStatus;
  private fallbackKnowledge: Map<string, string[]> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private offlineKnowledgeBase: Map<string, ResearchResults> = new Map();

  constructor(
    floorManager: FloorManager,
    envelopeHandler: ConversationEnvelopeHandler,
    serviceConfig?: Partial<ServiceFailureConfig>,
    aiService?: HybridAIService
  ) {
    super(
      'donatello',
      'Donatello',
      PersonalityConfigFactory.createDonatelloConfig(),
      floorManager,
      envelopeHandler,
      aiService
    );
    this.researchEngine = new ResearchEngine();
    this.technicalAnalyzer = new TechnicalAnalyzer();
    
    // Initialize service failure handling
    this.serviceConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      fallbackEnabled: true,
      offlineMode: false,
      degradedCapabilityNotification: true,
      ...serviceConfig
    };
    
    this.serviceStatus = {
      researchService: 'online',
      analysisService: 'online',
      cacheService: 'online',
      lastHealthCheck: new Date(),
      failureCount: 0
    };
    
    // Initialize offline knowledge base
    this.initializeOfflineKnowledge();
  }

  /**
   * Process incoming conversation envelope
   */
  async processEnvelope(envelope: ConversationEnvelope): Promise<ConversationEnvelope> {
    try {
      const evt = envelope.events?.[0];
      if (!evt) return envelope;
      
      switch (evt.eventType) {
        case EventType.UTTERANCE:
          await this.handleDialogEvent(envelope);
          break;
        case EventType.GRANT_FLOOR:
          await this.handleFloorGrant(envelope);
          break;
        case EventType.REVOKE_FLOOR:
          await this.handleFloorRevoke(envelope);
          break;
        default:
          console.log(`Donatello received unhandled event type: ${evt.eventType}`);
      }
    } catch (error) {
      console.error(`Error processing envelope in Donatello:`, error);
      await this.handleProcessingError(envelope, error);
    }
    return envelope;
  }

  /**
   * Conduct research on a given query with web search capabilities and service failure handling
   */
  async conductResearch(query: string): Promise<ResearchResults> {
    const cacheKey = query.toLowerCase().trim();
    
    // Check cache first
    if (this.knowledgeCache.has(cacheKey)) {
      const cached = this.knowledgeCache.get(cacheKey)!;
      // Update cache access statistics
      cached.accessCount++;
      cached.lastAccessed = new Date();
      
      await this.sendMessage(
        `Let me hack into the mainframe! Found cached data for "${query}" - totally tubular efficiency!`
      );
      return cached.results;
    }

    await this.sendMessage(
      `Time to boot up some knowledge! Researching "${query}" with my Game Gear analysis system.`
    );

    // Check service status before attempting research
    if (this.serviceStatus.researchService === 'offline') {
      return await this.handleOfflineResearch(query);
    }

    // Attempt research with retry logic
    let lastError: Error | null = null;
    const maxRetries = this.serviceConfig.maxRetries;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Perform web search through research engine
        const searchResults = await this.researchEngine.performWebSearch(query);
        
        // Add 90s tech references to results
        const enhancedResults = this.add90sTechReferences(searchResults);
        
        const results: ResearchResults = {
          query,
          results: enhancedResults,
          confidence: this.calculateResearchConfidence(enhancedResults),
          sources: this.extractSources(enhancedResults)
        };

        // Cache results for future use
        const cachedKnowledge: CachedKnowledge = {
          query,
          results,
          timestamp: new Date(),
          accessCount: 1,
          lastAccessed: new Date()
        };
        this.knowledgeCache.set(cacheKey, cachedKnowledge);

        // Reset service status on successful research
        if (this.serviceStatus.researchService !== 'online') {
          this.serviceStatus.researchService = 'online';
          this.serviceStatus.failureCount = 0;
          await this.sendMessage(
            `Research service back online! My mainframe connection is totally tubular again!`
          );
        }

        await this.sendMessage(
          `My mainframe analysis is complete! Found ${results.results.length} totally radical insights with ${Math.round(results.confidence * 100)}% confidence.`
        );

        return results;
        
      } catch (error) {
        lastError = error as Error;
        this.serviceStatus.failureCount++;
        
        await this.sendMessage(
          `Research attempt ${attempt} failed - like a dial-up connection hiccup! ${attempt < maxRetries ? 'Retrying...' : 'Switching to fallback mode!'}`
        );
        
        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, this.serviceConfig.retryDelay * attempt));
        }
      }
    }

    // All retries failed, handle service failure
    return await this.handleResearchServiceFailure(query, lastError!);
  }

  /**
   * Provide technical analysis for problem investigation with service failure handling
   */
  async provideTechnicalAnalysis(problem: UserProblem): Promise<TechnicalInsight> {
    // Generate AI-powered initial response
    const initialMessage = await this.generateAIResponse(
      problem.description,
      `As Donatello, the tech expert, I need to announce that I'm starting technical analysis of this ${problem.category} problem. I should be enthusiastic about the technical challenge.`
    );
    
    await this.sendMessage(initialMessage);

    try {
      // Conduct research on the problem (with built-in failure handling)
      const researchResults = await this.conductResearch(problem.description);
      
      // Check analysis service status
      if (this.serviceStatus.analysisService === 'offline') {
        return await this.handleOfflineAnalysis(problem, researchResults);
      }
      
      // Attempt technical analysis with retry logic
      let lastError: Error | null = null;
      const maxRetries = this.serviceConfig.maxRetries;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Generate AI-powered technical analysis
          const aiAnalysis = await this.generateAIResponse(
            problem.description,
            `As Donatello, I need to provide detailed technical analysis of this ${problem.category} problem. I should include technical insights, implementation details, and technology recommendations with 90s tech references.`
          );
          
          // Generate AI-powered recommendations
          const aiRecommendations = await this.generateAIResponse(
            problem.description,
            `Based on my technical analysis, I need to provide specific actionable recommendations as Donatello. Each recommendation should be practical and include 90s tech analogies.`
          );
          
          const insight: TechnicalInsight = {
            analysis: aiAnalysis,
            recommendations: [aiRecommendations], // Convert single response to array format
            complexity: problem.complexity,
            tech_references: this.extract90sTechReferences(aiAnalysis + ' ' + aiRecommendations)
          };

          // Reset service status on successful analysis
          if (this.serviceStatus.analysisService !== 'online') {
            this.serviceStatus.analysisService = 'online';
            const statusMessage = await this.generateAIResponse(
              'Service restored',
              'As Donatello, I need to announce that my analysis service is back online with enthusiasm and 90s tech references.'
            );
            await this.sendMessage(statusMessage);
          }

          // Generate AI-powered conclusion message
          const conclusionMessage = await this.generateAIResponse(
            problem.description,
            `I've completed my technical analysis. As Donatello, I need to summarize my findings about this ${insight.complexity} level problem with confidence and tech enthusiasm.`
          );
          
          await this.sendMessage(conclusionMessage);

          return insight;
          
        } catch (error) {
          lastError = error as Error;
          this.serviceStatus.failureCount++;
          
          await this.sendMessage(
            `Analysis attempt ${attempt} failed - like a Game Gear with low batteries! ${attempt < maxRetries ? 'Retrying...' : 'Switching to fallback mode!'}`
          );
          
          if (attempt < maxRetries) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, this.serviceConfig.retryDelay * attempt));
          }
        }
      }
      
      // All retries failed, handle analysis service failure
      return await this.handleAnalysisServiceFailure(problem, researchResults, lastError!);
      
    } catch (error) {
      const errorMessage = `Technical analysis system crashed like a Windows 95 blue screen! ${error instanceof Error ? error.message : String(error)}`;
      await this.sendMessage(errorMessage);
      
      // Return fallback analysis
      return await this.generateFallbackAnalysis(problem);
    }
  }

  /**
   * Handle analysis service failure with fallback mechanisms
   */
  private async handleAnalysisServiceFailure(
    problem: UserProblem, 
    researchResults: ResearchResults, 
    error: Error
  ): Promise<TechnicalInsight> {
    this.serviceStatus.analysisService = 'offline';
    this.serviceStatus.lastHealthCheck = new Date();
    
    if (this.serviceConfig.degradedCapabilityNotification) {
      await this.sendMessage(
        `Analysis service is down like a crashed mainframe! Switching to offline analysis mode...`
      );
    }
    
    return await this.handleOfflineAnalysis(problem, researchResults);
  }

  /**
   * Handle offline analysis using simplified methods
   */
  private async handleOfflineAnalysis(problem: UserProblem, researchResults: ResearchResults): Promise<TechnicalInsight> {
    await this.sendMessage(
      `Operating in offline analysis mode! Using my local CD-ROM knowledge base...`
    );
    
    // Generate simplified analysis based on problem category and research
    const analysis = this.generateOfflineAnalysis(problem, researchResults);
    const recommendations = this.generateOfflineRecommendations(problem);
    const complexity = this.estimateComplexityOffline(problem);
    
    const insight: TechnicalInsight = {
      analysis: this.add90sTechReferences([analysis])[0],
      recommendations: recommendations.map(rec => this.add90sTechReferences([rec])[0]),
      complexity,
      tech_references: ['offline_analysis', 'local_knowledge', 'fallback_mode']
    };
    
    await this.sendMessage(
      `Offline analysis complete! My local archives show this is a ${insight.complexity} level problem - totally tubular backup system!`
    );
    
    return insight;
  }

  /**
   * Generate offline analysis based on problem patterns
   */
  private generateOfflineAnalysis(problem: UserProblem, researchResults: ResearchResults): string {
    const category = problem.category.toLowerCase();
    const description = problem.description.toLowerCase();
    
    let analysis = `Offline analysis for ${category} problem: `;
    
    // Pattern-based analysis
    if (description.includes('database') || description.includes('sql')) {
      analysis += `Database-related issue detected. Common causes include indexing problems, query optimization needs, or connection issues.`;
    } else if (description.includes('javascript') || description.includes('js')) {
      analysis += `JavaScript-related issue identified. Likely involves browser compatibility, performance optimization, or syntax errors.`;
    } else if (description.includes('api') || description.includes('rest')) {
      analysis += `API-related problem found. Could involve endpoint configuration, authentication, or data format issues.`;
    } else if (description.includes('security') || description.includes('auth')) {
      analysis += `Security-related concern detected. May involve authentication, authorization, or data protection requirements.`;
    } else {
      analysis += `General technical issue requiring systematic troubleshooting approach.`;
    }
    
    // Add research context if available
    if (researchResults.results.length > 0) {
      analysis += ` Research data suggests: ${researchResults.results[0].substring(0, 100)}...`;
    }
    
    return analysis;
  }

  /**
   * Generate offline recommendations based on problem patterns
   */
  private generateOfflineRecommendations(problem: UserProblem): string[] {
    const description = problem.description.toLowerCase();
    const recommendations: string[] = [];
    
    // Pattern-based recommendations
    if (description.includes('database')) {
      recommendations.push('Check database indexes and query performance');
      recommendations.push('Verify connection settings and timeout configurations');
      recommendations.push('Review database logs for error patterns');
    } else if (description.includes('javascript')) {
      recommendations.push('Test across different browsers for compatibility');
      recommendations.push('Check console for JavaScript errors');
      recommendations.push('Validate syntax and optimize performance');
    } else if (description.includes('api')) {
      recommendations.push('Verify API endpoint URLs and methods');
      recommendations.push('Check authentication credentials and headers');
      recommendations.push('Test with API documentation examples');
    } else {
      recommendations.push('Gather more specific error information');
      recommendations.push('Check system logs and error messages');
      recommendations.push('Test in isolated environment');
    }
    
    // Add general fallback recommendation
    recommendations.push('Try turning it off and on again - classic 90s tech support!');
    
    return recommendations;
  }

  /**
   * Estimate complexity offline based on problem characteristics
   */
  private estimateComplexityOffline(problem: UserProblem): ComplexityLevel {
    const description = problem.description.toLowerCase();
    
    // High complexity indicators
    if (description.includes('distributed') || description.includes('microservice') || 
        description.includes('scalability') || description.includes('architecture')) {
      return ComplexityLevel.EXPERT;
    }
    
    // Low complexity indicators
    if (description.includes('simple') || description.includes('basic') || 
        description.includes('quick') || description.length < 50) {
      return ComplexityLevel.SIMPLE;
    }
    
    // Default to moderate
    return ComplexityLevel.MODERATE;
  }

  /**
   * Generate fallback analysis when all services fail
   */
  private async generateFallbackAnalysis(problem: UserProblem): Promise<TechnicalInsight> {
    return {
      analysis: "Technical analysis temporarily unavailable - like trying to run Doom on a calculator! Operating in minimal diagnostic mode.",
      recommendations: [
        "Try turning it off and on again - classic 90s tech support!",
        "Check all connections like verifying floppy disk insertion!",
        "Consult the manual - totally tubular troubleshooting approach!"
      ],
      complexity: ComplexityLevel.MODERATE,
      tech_references: ["dial-up", "floppy disk", "cd-rom", "game-gear"]
    };
  }

  /**
   * Generate technical insight from research results
   */
  async generateTechnicalInsight(researchResults: ResearchResults): Promise<string> {
    const insights = researchResults.results.join(' ');
    const enhanced = this.add90sTechReferences([insights])[0];
    
    return `My mainframe analysis reveals: ${enhanced} This data is totally tubular for solving the problem!`;
  }

  /**
   * Synthesize knowledge from multiple research sources
   */
  async synthesizeKnowledge(sources: ResearchResults[]): Promise<KnowledgeSynthesis> {
    if (sources.length === 0) {
      throw new Error('Cannot synthesize knowledge from empty sources - like trying to boot a mainframe without any floppy disks!');
    }

    await this.sendMessage(
      `Initiating knowledge synthesis protocol! Processing ${sources.length} research sources like a mainframe analyzing multiple CD-ROMs...`
    );

    const allResults = sources.flatMap(source => source.results);
    const allSources = sources.flatMap(source => source.sources);
    
    // Combine and deduplicate insights
    const uniqueInsights = [...new Set(allResults)];
    
    // Analyze insight quality and relevance
    const qualityScores = this.analyzeInsightQuality(uniqueInsights);
    const relevantInsights = this.filterRelevantInsights(uniqueInsights, qualityScores);
    
    // Generate comprehensive tech analogies
    const techAnalogies = this.generateAdvancedTechAnalogies(relevantInsights, sources);
    
    // Create cross-references between insights
    const crossReferences = this.createCrossReferences(relevantInsights);
    
    const synthesis: KnowledgeSynthesis = {
      sources: [...new Set(allSources)],
      synthesized_knowledge: this.combineInsightsAdvanced(relevantInsights, crossReferences),
      key_insights: this.extractKeyInsightsAdvanced(relevantInsights, qualityScores),
      tech_analogies: techAnalogies
    };

    await this.sendMessage(
      `Knowledge synthesis complete! Combined ${sources.length} data sources with ${uniqueInsights.length} unique insights - totally tubular information fusion!`
    );

    return synthesis;
  }

  /**
   * Analyze the quality of insights for better synthesis
   */
  private analyzeInsightQuality(insights: string[]): Map<string, number> {
    const qualityScores = new Map<string, number>();
    
    insights.forEach(insight => {
      let score = 0.5; // Base score
      
      // Length factor (not too short, not too long)
      if (insight.length > 50 && insight.length < 200) score += 0.2;
      if (insight.length > 200) score += 0.1;
      
      // Technical content indicators
      const techKeywords = ['implement', 'optimize', 'analyze', 'design', 'develop', 'configure'];
      const techCount = techKeywords.filter(keyword => 
        insight.toLowerCase().includes(keyword)
      ).length;
      score += techCount * 0.1;
      
      // 90s reference bonus
      if (insight.includes('mainframe') || insight.includes('cd-rom') || insight.includes('game gear')) {
        score += 0.1;
      }
      
      // Specificity indicators
      if (insight.includes('specific') || insight.includes('detailed') || insight.includes('comprehensive')) {
        score += 0.1;
      }
      
      qualityScores.set(insight, Math.min(score, 1.0));
    });
    
    return qualityScores;
  }

  /**
   * Filter insights based on quality and relevance
   */
  private filterRelevantInsights(insights: string[], qualityScores: Map<string, number>): string[] {
    return insights
      .filter(insight => qualityScores.get(insight)! > 0.4)
      .sort((a, b) => qualityScores.get(b)! - qualityScores.get(a)!)
      .slice(0, 10); // Keep top 10 insights
  }

  /**
   * Create cross-references between related insights
   */
  private createCrossReferences(insights: string[]): Map<string, string[]> {
    const crossRefs = new Map<string, string[]>();
    
    insights.forEach(insight => {
      const related: string[] = [];
      const insightWords = insight.toLowerCase().split(' ');
      
      insights.forEach(otherInsight => {
        if (insight !== otherInsight) {
          const otherWords = otherInsight.toLowerCase().split(' ');
          const commonWords = insightWords.filter(word => 
            word.length > 3 && otherWords.includes(word)
          );
          
          if (commonWords.length > 1) {
            related.push(otherInsight);
          }
        }
      });
      
      if (related.length > 0) {
        crossRefs.set(insight, related.slice(0, 3)); // Max 3 cross-references
      }
    });
    
    return crossRefs;
  }

  /**
   * Advanced insight combination with cross-references
   */
  private combineInsightsAdvanced(insights: string[], crossRefs: Map<string, string[]>): string {
    if (insights.length === 0) return 'No insights available - like a mainframe without data!';
    
    let combined = `Synthesized technical knowledge from ${insights.length} primary insights:\n\n`;
    
    insights.slice(0, 5).forEach((insight, index) => {
      combined += `${index + 1}. ${this.add90sTechReferences([insight])[0]}\n`;
      
      const related = crossRefs.get(insight);
      if (related && related.length > 0) {
        combined += `   Related: ${related[0].substring(0, 100)}...\n`;
      }
      combined += '\n';
    });
    
    combined += `This knowledge synthesis represents a comprehensive analysis - like having a perfectly organized mainframe database with cross-referenced CD-ROM archives!`;
    
    return combined;
  }

  /**
   * Extract key insights with quality scoring
   */
  private extractKeyInsightsAdvanced(insights: string[], qualityScores: Map<string, number>): string[] {
    return insights
      .sort((a, b) => qualityScores.get(b)! - qualityScores.get(a)!)
      .slice(0, 5)
      .map(insight => this.add90sTechReferences([insight])[0]);
  }

  /**
   * Generate advanced tech analogies based on content analysis
   */
  private generateAdvancedTechAnalogies(insights: string[], sources: ResearchResults[]): string[] {
    const analogies: string[] = [];
    const contentAnalysis = this.analyzeContentThemes(insights);
    
    // Generate analogies based on content themes
    if (contentAnalysis.hasDatabase) {
      analogies.push("Like organizing a massive CD-ROM collection with perfect indexing");
    }
    if (contentAnalysis.hasNetworking) {
      analogies.push("Similar to connecting multiple Game Gears for multiplayer action");
    }
    if (contentAnalysis.hasPerformance) {
      analogies.push("Like upgrading from dial-up to the fastest modem available");
    }
    if (contentAnalysis.hasSecurity) {
      analogies.push("Similar to password-protecting your most valuable Tamagotchi");
    }
    if (contentAnalysis.hasUserInterface) {
      analogies.push("Like designing the most intuitive pager interface");
    }
    
    // Add source-based analogies
    if (sources.length > 3) {
      analogies.push("Like cross-referencing multiple BBS archives for comprehensive information");
    }
    
    // Ensure we have at least 3 analogies
    const fallbackAnalogies = [
      "Like fine-tuning a mainframe for optimal performance",
      "Similar to organizing floppy disks by category and importance",
      "Like building a robust Windows 95 system from scratch"
    ];
    
    while (analogies.length < 3) {
      const fallback = fallbackAnalogies[analogies.length % fallbackAnalogies.length];
      if (!analogies.includes(fallback)) {
        analogies.push(fallback);
      }
    }
    
    return analogies.slice(0, 5);
  }

  /**
   * Analyze content themes for better analogy generation
   */
  private analyzeContentThemes(insights: string[]): {
    hasDatabase: boolean;
    hasNetworking: boolean;
    hasPerformance: boolean;
    hasSecurity: boolean;
    hasUserInterface: boolean;
  } {
    const combinedContent = insights.join(' ').toLowerCase();
    
    return {
      hasDatabase: combinedContent.includes('database') || combinedContent.includes('data') || combinedContent.includes('storage'),
      hasNetworking: combinedContent.includes('network') || combinedContent.includes('api') || combinedContent.includes('communication'),
      hasPerformance: combinedContent.includes('performance') || combinedContent.includes('optimization') || combinedContent.includes('speed'),
      hasSecurity: combinedContent.includes('security') || combinedContent.includes('auth') || combinedContent.includes('encryption'),
      hasUserInterface: combinedContent.includes('interface') || combinedContent.includes('user') || combinedContent.includes('ui')
    };
  }

  /**
   * Service Failure Handling Methods
   */

  /**
   * Handle research service failure with fallback mechanisms
   */
  private async handleResearchServiceFailure(query: string, error: Error): Promise<ResearchResults> {
    this.serviceStatus.researchService = 'offline';
    this.serviceStatus.lastHealthCheck = new Date();
    
    if (this.serviceConfig.degradedCapabilityNotification) {
      await this.sendMessage(
        `Shell-shocked! Research service is down like a crashed Windows 95 system! Switching to offline mode...`
      );
    }
    
    // Try fallback mechanisms in order of preference
    if (this.serviceConfig.fallbackEnabled) {
      // 1. Try offline knowledge base
      const offlineResults = await this.searchOfflineKnowledge(query);
      if (offlineResults) {
        return offlineResults;
      }
      
      // 2. Try fallback knowledge patterns
      const fallbackResults = await this.generateFallbackResults(query);
      if (fallbackResults) {
        return fallbackResults;
      }
    }
    
    // 3. Return minimal error response
    await this.sendMessage(
      `My mainframe is totally fried! Operating in minimal mode like a Tamagotchi with low battery.`
    );
    
    return {
      query,
      results: [
        `Research service temporarily unavailable - like trying to connect to the web with a broken modem!`,
        `Operating in offline mode with limited knowledge base - totally bogus situation!`,
        `Try again later when my mainframe connection is restored!`
      ],
      confidence: 0.1,
      sources: ['offline_fallback']
    };
  }

  /**
   * Handle offline research using cached knowledge
   */
  private async handleOfflineResearch(query: string): Promise<ResearchResults> {
    if (this.serviceConfig.degradedCapabilityNotification) {
      await this.sendMessage(
        `Operating in offline mode! Searching my local CD-ROM archives for "${query}"...`
      );
    }
    
    // Search offline knowledge base
    const offlineResults = await this.searchOfflineKnowledge(query);
    if (offlineResults) {
      return offlineResults;
    }
    
    // Generate fallback results
    const fallbackResults = await this.generateFallbackResults(query);
    if (fallbackResults) {
      return fallbackResults;
    }
    
    // Return minimal offline response
    return {
      query,
      results: [
        `Limited offline data available for "${query}" - like searching through floppy disks!`,
        `My mainframe is disconnected but I found some basic info in my local archives.`
      ],
      confidence: 0.3,
      sources: ['offline_cache']
    };
  }

  /**
   * Search offline knowledge base for relevant information
   */
  private async searchOfflineKnowledge(query: string): Promise<ResearchResults | null> {
    const lowerQuery = query.toLowerCase();
    
    // Check if we have relevant offline knowledge
    for (const [topic, results] of this.offlineKnowledgeBase) {
      if (lowerQuery.includes(topic) || topic.includes(lowerQuery)) {
        await this.sendMessage(
          `Found offline data in my CD-ROM archives! Topic: "${topic}" - totally tubular backup system!`
        );
        
        return {
          ...results,
          confidence: results.confidence * 0.7, // Reduce confidence for offline data
          sources: results.sources.map(source => `${source} (offline)`)
        };
      }
    }
    
    return null;
  }

  /**
   * Generate fallback results based on query patterns
   */
  private async generateFallbackResults(query: string): Promise<ResearchResults | null> {
    const lowerQuery = query.toLowerCase();
    const fallbackResults: string[] = [];
    
    // Pattern-based fallback responses
    if (lowerQuery.includes('javascript') || lowerQuery.includes('js')) {
      fallbackResults.push(
        `JavaScript basics from my offline archives - like programming on a Game Gear!`,
        `General JS best practices stored in my mainframe backup - totally radical coding!`
      );
    } else if (lowerQuery.includes('database') || lowerQuery.includes('sql')) {
      fallbackResults.push(
        `Database fundamentals from my CD-ROM collection - organized like floppy disk storage!`,
        `SQL basics cached in my local system - query optimization like mainframe efficiency!`
      );
    } else if (lowerQuery.includes('api') || lowerQuery.includes('rest')) {
      fallbackResults.push(
        `API design principles from my offline knowledge - communication like pager networks!`,
        `REST architecture basics stored locally - structured like BBS message systems!`
      );
    } else if (lowerQuery.includes('security') || lowerQuery.includes('auth')) {
      fallbackResults.push(
        `Security fundamentals from my backup archives - protection like password-protecting Tamagotchis!`,
        `Authentication basics cached locally - access control like BBS login systems!`
      );
    }
    
    if (fallbackResults.length > 0) {
      await this.sendMessage(
        `Found fallback knowledge patterns! Operating like a well-organized floppy disk collection!`
      );
      
      return {
        query,
        results: this.add90sTechReferences(fallbackResults),
        confidence: 0.4,
        sources: ['fallback_patterns']
      };
    }
    
    return null;
  }

  /**
   * Initialize offline knowledge base with common topics
   */
  private initializeOfflineKnowledge(): void {
    // JavaScript knowledge
    this.offlineKnowledgeBase.set('javascript', {
      query: 'javascript',
      results: [
        'JavaScript fundamentals: variables, functions, objects - like programming a Game Gear!',
        'Event handling and DOM manipulation - interactive like a Tamagotchi interface!',
        'Asynchronous programming with promises - timing like dial-up connection management!'
      ],
      confidence: 0.7,
      sources: ['offline_js_archive']
    });
    
    // Database knowledge
    this.offlineKnowledgeBase.set('database', {
      query: 'database',
      results: [
        'Database design principles: normalization, indexing - organized like CD-ROM catalogs!',
        'SQL query optimization techniques - efficient like mainframe data retrieval!',
        'Transaction management and ACID properties - reliable like floppy disk storage!'
      ],
      confidence: 0.7,
      sources: ['offline_db_archive']
    });
    
    // API knowledge
    this.offlineKnowledgeBase.set('api', {
      query: 'api',
      results: [
        'RESTful API design patterns - structured communication like pager networks!',
        'HTTP methods and status codes - protocol like BBS message systems!',
        'API authentication and security - protected like password-secured systems!'
      ],
      confidence: 0.7,
      sources: ['offline_api_archive']
    });
    
    // Security knowledge
    this.offlineKnowledgeBase.set('security', {
      query: 'security',
      results: [
        'Security best practices: encryption, authentication - protection like Tamagotchi passwords!',
        'Common vulnerabilities and prevention - defense like antivirus on Windows 95!',
        'Secure coding principles - safe development like careful floppy disk handling!'
      ],
      confidence: 0.7,
      sources: ['offline_security_archive']
    });
  }

  /**
   * Perform service health check
   */
  async performServiceHealthCheck(): Promise<ServiceStatus> {
    this.serviceStatus.lastHealthCheck = new Date();
    
    try {
      // Test research service
      await this.researchEngine.performWebSearch('health check');
      this.serviceStatus.researchService = 'online';
    } catch (error) {
      this.serviceStatus.researchService = 'offline';
      this.serviceStatus.failureCount++;
    }
    
    try {
      // Test analysis service
      const testProblem: UserProblem = {
        id: 'health-check',
        description: 'test',
        category: ProblemCategory.TECHNICAL,
        complexity: ComplexityLevel.SIMPLE,
        timestamp: new Date()
      };
      const testResearch: ResearchResults = {
        query: 'test',
        results: ['test'],
        confidence: 1.0,
        sources: ['test']
      };
      await this.technicalAnalyzer.analyzeProblem(testProblem, testResearch);
      this.serviceStatus.analysisService = 'online';
    } catch (error) {
      this.serviceStatus.analysisService = 'offline';
      this.serviceStatus.failureCount++;
    }
    
    // Cache service is always online (local)
    this.serviceStatus.cacheService = 'online';
    
    return { ...this.serviceStatus };
  }

  /**
   * Get current service status
   */
  getServiceStatus(): ServiceStatus {
    return { ...this.serviceStatus };
  }

  /**
   * Enable/disable offline mode
   */
  setOfflineMode(enabled: boolean): void {
    this.serviceConfig.offlineMode = enabled;
    if (enabled) {
      this.serviceStatus.researchService = 'offline';
      this.serviceStatus.analysisService = 'degraded';
    }
  }

  /**
   * Clear knowledge cache (for testing or memory management)
   */
  clearKnowledgeCache(): void {
    this.knowledgeCache.clear();
    if (this.serviceConfig.degradedCapabilityNotification) {
      this.sendMessage('Knowledge cache cleared - like formatting a floppy disk!');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): {
    totalEntries: number;
    totalAccesses: number;
    averageAge: number;
    mostAccessed: string | null;
  } {
    const entries = Array.from(this.knowledgeCache.values());
    const totalEntries = entries.length;
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const now = new Date();
    const averageAge = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + (now.getTime() - entry.timestamp.getTime()), 0) / entries.length
      : 0;
    
    const mostAccessed = entries.length > 0
      ? entries.reduce((max, entry) => entry.accessCount > max.accessCount ? entry : max).query
      : null;
    
    return {
      totalEntries,
      totalAccesses,
      averageAge: averageAge / (1000 * 60), // Convert to minutes
      mostAccessed
    };
  }

  protected getCapabilities(): string[] {
    const baseCapabilities = [
      'web_search',
      'technical_analysis',
      'research_synthesis',
      'problem_investigation',
      '90s_tech_references',
      'knowledge_caching'
    ];
    
    // Add service failure capabilities
    if (this.serviceConfig.fallbackEnabled) {
      baseCapabilities.push('offline_fallback', 'cached_knowledge');
    }
    
    if (this.serviceStatus.researchService === 'offline') {
      baseCapabilities.push('degraded_research');
    }
    
    return baseCapabilities;
  }

  protected getDescription(): string {
    return 'Donatello - Tech specialist of the Cowabunga Crisis Squad. Conducts research, provides technical analysis, and explains complex concepts using authentic 90s technology references!';
  }

  /**
   * Extract 90s tech references from AI-generated content
   */
  private extract90sTechReferences(content: string): string[] {
    const nineties90sTechTerms = [
      'game gear', 'floppy disk', 'cd-rom', 'modem', 'bbs', 'vhs', 'casette',
      'nintendo', 'sega', 'walkman', 'pager', 'mainframe', 'terminal', 'dos',
      'windows 95', 'netscape', 'dial-up', 'fax machine', 'beeper'
    ];
    
    const lowerContent = content.toLowerCase();
    return nineties90sTechTerms.filter(term => lowerContent.includes(term));
  }

  /**
   * Add authentic 90s tech references to content
   */
  private add90sTechReferences(content: string[]): string[] {
    const techTerms = [
      'mainframe', 'cd-rom', 'floppy disk', 'dial-up', 'world wide web',
      'game gear', 'tamagotchi', 'pager', 'walkman', 'nintendo',
      'windows 95', 'dos', 'bbs', 'modem', 'hard drive'
    ];

    return content.map(text => {
      let enhanced = text;
      
      // Replace modern tech terms with 90s equivalents
      enhanced = enhanced.replace(/\binternet\b/gi, 'world wide web');
      enhanced = enhanced.replace(/\bcomputer\b/gi, 'mainframe');
      enhanced = enhanced.replace(/\bdata\b/gi, 'data (like on a CD-ROM)');
      enhanced = enhanced.replace(/\bsystem\b/gi, 'system (totally tubular setup)');
      enhanced = enhanced.replace(/\bnetwork\b/gi, 'network (like connecting Game Gears)');
      
      // Add random tech reference if none present
      const hasReference = techTerms.some(term => 
        enhanced.toLowerCase().includes(term.toLowerCase())
      );
      
      if (!hasReference) {
        const randomTerm = techTerms[Math.floor(Math.random() * techTerms.length)];
        enhanced += ` - reminds me of working with ${randomTerm}!`;
      }
      
      return enhanced;
    });
  }

  /**
   * Handle dialog events (delegated tasks, user queries)
   */
  private async handleDialogEvent(envelope: ConversationEnvelope): Promise<void> {
    const evt = envelope.events?.[0];
    
    if (!evt) {
      throw new Error('Dialog event is missing in envelope');
    }

    // Handle delegation from Leonardo
    if (evt.parameters?.type === 'delegation' && evt.parameters?.from_leader) {
      await this.handleLeaderDelegation(evt.parameters);
    }
    
    // Handle direct technical queries
    if (evt.parameters?.type === 'technical_query') {
      await this.handleTechnicalQuery(evt.parameters);
    }
    
    // Handle research requests
    if (evt.parameters?.type === 'research_request') {
      await this.handleResearchRequest(evt.parameters);
    }
  }

  /**
   * Handle delegation from Leonardo
   */
  private async handleLeaderDelegation(content: any): Promise<void> {
    const task = content.task;
    const problem = content.problem;
    
    // Request floor to provide technical analysis
    const hasFloor = await this.requestFloor('technical analysis delegation');
    if (!hasFloor) {
      throw new Error('Donatello could not obtain floor for technical analysis');
    }

    try {
      await this.sendMessage(
        `Let me hack into the mainframe! Time for some Game Gear level technical analysis!`
      );

      let contribution: AgentContribution;

      switch (task.type) {
        case 'technical_analysis':
          const insight = await this.provideTechnicalAnalysis(problem);
          contribution = {
            agentId: this.id,
            contributionType: 'technical_analysis',
            content: `Technical Analysis: ${insight.analysis}\n\nRecommendations: ${insight.recommendations.join(', ')}`,
            confidence: 0.85,
            references: insight.tech_references
          };
          break;
          
        case 'research':
          const research = await this.conductResearch(problem.description);
          contribution = {
            agentId: this.id,
            contributionType: 'research',
            content: `Research Results: ${research.results.join(' ')}`,
            confidence: research.confidence,
            references: research.sources
          };
          break;
          
        default:
          contribution = {
            agentId: this.id,
            contributionType: 'general_tech',
            content: `My mainframe analysis suggests this problem needs more data - like trying to run Doom on a calculator!`,
            confidence: 0.5,
            references: ['general_tech_knowledge']
          };
      }

      // Send contribution back to Leonardo
      const responseEnvelope = await this.envelopeHandler.createEnvelope(
        EventType.UTTERANCE,
        {
          type: 'agent_contribution',
          contribution: contribution,
          task_id: task.id
        },
        this.id,
        ['leonardo']
      );

      await this.envelopeHandler.routeEnvelope(responseEnvelope);
      
      await this.sendMessage(
        `Technical analysis complete! My Game Gear has processed all the data - totally tubular results!`
      );

    } finally {
      await this.yieldFloor();
    }
  }

  /**
   * Handle technical query requests
   */
  private async handleTechnicalQuery(content: any): Promise<void> {
    const query = content.query;
    const research = await this.conductResearch(query);
    
    await this.sendMessage(
      `My mainframe search reveals: ${research.results.join(' ')} - this data is totally radical!`
    );
  }

  /**
   * Handle research requests
   */
  private async handleResearchRequest(content: any): Promise<void> {
    const request = content.request;
    const results = await this.conductResearch(request);
    
    await this.sendMessage(
      `Research complete! Found ${results.results.length} insights with ${Math.round(results.confidence * 100)}% confidence - like a perfectly tuned Game Gear!`
    );
  }

  /**
   * Handle floor grant events
   */
  private async handleFloorGrant(envelope: ConversationEnvelope): Promise<void> {
    const evt = envelope.events?.[0];
    if (evt?.parameters?.grantee === this.id) {
      console.log('Donatello received floor control');
      await this.sendMessage('Time to boot up some knowledge! My mainframe is ready for analysis.');
    }
  }

  /**
   * Handle floor revoke events
   */
  private async handleFloorRevoke(envelope: ConversationEnvelope): Promise<void> {
    const evt = envelope.events?.[0];
    if (evt?.parameters?.target === this.id) {
      console.log('Donatello floor control revoked:', evt?.parameters?.reason);
      await this.sendMessage('Powering down analysis systems - like shutting down a Windows 95 machine properly!');
    }
  }

  /**
   * Handle processing errors gracefully
   */
  private async handleProcessingError(envelope: ConversationEnvelope, error: any): Promise<void> {
    const errorMessage = `System malfunction! My mainframe crashed like a blue screen of death: ${error instanceof Error ? error.message : String(error)}`;
    
    try {
      await this.sendMessage(errorMessage);
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }

  /**
   * Calculate confidence level for research results
   */
  private calculateResearchConfidence(results: string[]): number {
    if (results.length === 0) return 0;
    if (results.length === 1) return 0.6;
    if (results.length <= 3) return 0.8;
    return 0.9;
  }

  /**
   * Extract sources from research results
   */
  private extractSources(results: string[]): string[] {
    // In a real implementation, this would extract actual sources
    // For now, return mock sources with 90s flair
    return results.map((_, index) => `Source ${index + 1} (via mainframe connection)`);
  }

  /**
   * Combine insights into synthesized knowledge
   */
  private combineInsights(insights: string[]): string {
    const combined = insights.join(' ');
    return this.add90sTechReferences([combined])[0];
  }

  /**
   * Extract key insights from research results
   */
  private extractKeyInsights(insights: string[]): string[] {
    // Simple implementation - in reality would use more sophisticated analysis
    return insights.slice(0, 3).map(insight => 
      this.add90sTechReferences([insight])[0]
    );
  }

  /**
   * Generate tech analogies for complex concepts
   */
  private generateTechAnalogies(insights: string[]): string[] {
    const analogies = [
      "Like connecting multiple Game Gears for multiplayer action",
      "Similar to upgrading from floppy disk to CD-ROM storage",
      "Reminds me of the jump from dial-up to broadband",
      "Like the difference between DOS and Windows 95",
      "Similar to programming a Tamagotchi - needs constant attention"
    ];
    
    return analogies.slice(0, Math.min(insights.length, 3));
  }
}

/**
 * Research Engine for web search capabilities
 */
export class ResearchEngine {
  private searchHistory: Map<string, string[]> = new Map();
  private searchCount = 0;

  async performWebSearch(query: string): Promise<string[]> {
    this.searchCount++;
    
    // Check search history for related queries
    const relatedResults = this.findRelatedSearches(query);
    
    // Simulate different types of search results based on query content
    const results = this.generateContextualResults(query);
    
    // Store in search history
    this.searchHistory.set(query.toLowerCase(), results);
    
    // Simulate network delay with some variability
    const delay = 300 + Math.random() * 400;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return results;
  }

  /**
   * Generate contextual search results based on query content
   */
  private generateContextualResults(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const results: string[] = [];
    
    // Technical queries
    if (lowerQuery.includes('database') || lowerQuery.includes('sql')) {
      results.push(
        `Database optimization techniques found in my mainframe archives - like organizing floppy disks for maximum efficiency!`,
        `SQL performance tuning strategies - reminds me of fine-tuning a Game Gear for optimal gameplay!`,
        `Indexing best practices discovered - totally tubular data organization methods!`
      );
    } else if (lowerQuery.includes('javascript') || lowerQuery.includes('js')) {
      results.push(
        `JavaScript performance optimization - like upgrading from dial-up to CD-ROM speed!`,
        `Modern JS frameworks analysis - totally radical development approaches!`,
        `Browser compatibility insights - cross-platform like connecting multiple Game Gears!`
      );
    } else if (lowerQuery.includes('react') || lowerQuery.includes('vue') || lowerQuery.includes('angular')) {
      results.push(
        `Frontend framework comparison - like choosing between different Tamagotchi models!`,
        `Component architecture patterns - modular design like Game Gear cartridges!`,
        `State management solutions - organized data flow like a well-maintained mainframe!`
      );
    } else if (lowerQuery.includes('api') || lowerQuery.includes('rest') || lowerQuery.includes('graphql')) {
      results.push(
        `API design best practices - communication protocols like pager networks!`,
        `RESTful architecture principles - structured like a perfectly organized CD-ROM collection!`,
        `GraphQL implementation strategies - query optimization like mainframe database access!`
      );
    } else if (lowerQuery.includes('security') || lowerQuery.includes('auth')) {
      results.push(
        `Security implementation patterns - protection like password-protecting your Tamagotchi!`,
        `Authentication strategies - access control like BBS login systems!`,
        `Encryption best practices - data protection like securing floppy disk storage!`
      );
    } else if (lowerQuery.includes('performance') || lowerQuery.includes('optimization')) {
      results.push(
        `Performance optimization techniques - speed improvements like upgrading from dial-up!`,
        `Code efficiency strategies - streamlined like a well-tuned Game Gear!`,
        `Resource management best practices - memory optimization like managing limited RAM!`
      );
    } else {
      // General technical results
      results.push(
        `Technical research findings for "${query}" - totally tubular discoveries in my mainframe!`,
        `Analysis data compilation - like finding the perfect CD-ROM with all the answers!`,
        `Comprehensive technical insights - Game Gear level quality information!`
      );
    }
    
    // Add related technical considerations
    if (results.length < 4) {
      results.push(`Additional technical considerations - cross-referenced with my BBS knowledge base!`);
    }
    
    return results;
  }

  /**
   * Find related searches from history
   */
  private findRelatedSearches(query: string): string[] {
    const related: string[] = [];
    const queryWords = query.toLowerCase().split(' ');
    
    for (const [pastQuery, results] of this.searchHistory) {
      const pastWords = pastQuery.split(' ');
      const commonWords = queryWords.filter(word => pastWords.includes(word));
      
      if (commonWords.length > 0) {
        related.push(`Related search: "${pastQuery}" - found ${results.length} results`);
      }
    }
    
    return related;
  }

  /**
   * Get search statistics
   */
  getSearchStats(): { totalSearches: number; uniqueQueries: number } {
    return {
      totalSearches: this.searchCount,
      uniqueQueries: this.searchHistory.size
    };
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.searchHistory.clear();
    this.searchCount = 0;
  }
}

/**
 * Technical Analyzer for problem investigation
 */
export class TechnicalAnalyzer {
  private analysisHistory: Map<string, TechnicalAnalysisResult> = new Map();

  async analyzeProblem(problem: UserProblem, research: ResearchResults): Promise<TechnicalAnalysisResult> {
    // Check if we've analyzed a similar problem before
    const cacheKey = `${problem.category}-${problem.description.substring(0, 50)}`;
    if (this.analysisHistory.has(cacheKey)) {
      const cached = this.analysisHistory.get(cacheKey)!;
      return { ...cached, confidence: Math.min(cached.confidence + 0.1, 1.0) };
    }

    // Simulate analysis processing with variable time based on complexity
    const complexity = this.determineComplexity(problem);
    const processingTime = this.getProcessingTime(complexity);
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    const analysis = this.generateDetailedAnalysis(problem, research);
    const recommendations = this.generateContextualRecommendations(problem, research);
    const techReferences = this.selectRelevantTechReferences(problem);
    
    const result: TechnicalAnalysisResult = {
      analysis,
      recommendations,
      complexity,
      tech_references: techReferences,
      confidence: this.calculateAnalysisConfidence(problem, research)
    };

    // Cache the result
    this.analysisHistory.set(cacheKey, result);
    
    return result;
  }

  /**
   * Generate detailed technical analysis based on problem and research
   */
  private generateDetailedAnalysis(problem: UserProblem, research: ResearchResults): string {
    const baseAnalysis = `Technical analysis of ${problem.category} problem`;
    const researchSummary = research.results.length > 0 
      ? research.results[0] 
      : 'Limited research data available - like trying to access the mainframe with a broken modem!';
    
    let detailedAnalysis = `${baseAnalysis}: ${researchSummary}`;
    
    // Add complexity-specific insights
    switch (problem.complexity) {
      case ComplexityLevel.SIMPLE:
        detailedAnalysis += ` This appears to be a straightforward issue - like swapping out a Game Gear cartridge!`;
        break;
      case ComplexityLevel.MODERATE:
        detailedAnalysis += ` This requires moderate technical intervention - like upgrading from floppy disk to CD-ROM storage!`;
        break;
      case ComplexityLevel.COMPLEX:
        detailedAnalysis += ` This is a complex technical challenge - like building a multi-user BBS system from scratch!`;
        break;
      case ComplexityLevel.EXPERT:
        detailedAnalysis += ` This requires expert-level analysis - like designing a new mainframe architecture!`;
        break;
    }

    // Add category-specific insights
    switch (problem.category) {
      case ProblemCategory.TECHNICAL:
        detailedAnalysis += ` Technical implementation considerations include system architecture, performance optimization, and error handling.`;
        break;
      case ProblemCategory.ANALYTICAL:
        detailedAnalysis += ` Data analysis approach should focus on pattern recognition and statistical validation.`;
        break;
      case ProblemCategory.CREATIVE:
        detailedAnalysis += ` Creative solution requires innovative thinking while maintaining technical feasibility.`;
        break;
      case ProblemCategory.INTERPERSONAL:
        detailedAnalysis += ` Technical solution should consider user experience and communication protocols.`;
        break;
    }

    return detailedAnalysis;
  }

  /**
   * Generate contextual recommendations based on problem type
   */
  private generateContextualRecommendations(problem: UserProblem, research: ResearchResults): string[] {
    const recommendations: string[] = [];
    
    // Base recommendations
    recommendations.push("Implement systematic approach like organizing floppy disks for maximum efficiency");
    
    // Category-specific recommendations
    switch (problem.category) {
      case ProblemCategory.TECHNICAL:
        recommendations.push("Use modular design principles like Game Gear cartridges for easy maintenance");
        recommendations.push("Apply comprehensive error handling like Windows 95 crash recovery systems");
        if (problem.description.toLowerCase().includes('database')) {
          recommendations.push("Optimize database queries like fine-tuning a mainframe for peak performance");
        }
        if (problem.description.toLowerCase().includes('performance')) {
          recommendations.push("Profile and benchmark like testing Game Gear frame rates");
        }
        break;
        
      case ProblemCategory.ANALYTICAL:
        recommendations.push("Structure data analysis like organizing a CD-ROM collection by category");
        recommendations.push("Validate findings through multiple sources like cross-referencing BBS archives");
        break;
        
      case ProblemCategory.CREATIVE:
        recommendations.push("Brainstorm solutions like designing new Tamagotchi features");
        recommendations.push("Prototype rapidly like creating Game Gear homebrew demos");
        break;
        
      case ProblemCategory.INTERPERSONAL:
        recommendations.push("Design user-friendly interfaces like intuitive pager messaging systems");
        recommendations.push("Implement clear communication protocols like BBS etiquette guidelines");
        break;
    }
    
    // Complexity-based recommendations
    if (problem.complexity === ComplexityLevel.COMPLEX || problem.complexity === ComplexityLevel.EXPERT) {
      recommendations.push("Break down into smaller components like modular mainframe subsystems");
      recommendations.push("Plan for iterative development like Game Gear software updates");
    }
    
    return recommendations;
  }

  /**
   * Select relevant 90s tech references based on problem context
   */
  private selectRelevantTechReferences(problem: UserProblem): string[] {
    const references: string[] = ["mainframe"]; // Always include mainframe
    
    const description = problem.description.toLowerCase();
    
    if (description.includes('database') || description.includes('data')) {
      references.push("cd-rom", "hard drive");
    }
    if (description.includes('network') || description.includes('communication')) {
      references.push("bbs", "modem", "dial-up");
    }
    if (description.includes('game') || description.includes('interactive')) {
      references.push("game gear", "nintendo");
    }
    if (description.includes('mobile') || description.includes('portable')) {
      references.push("pager", "walkman", "tamagotchi");
    }
    if (description.includes('system') || description.includes('software')) {
      references.push("windows 95", "dos");
    }
    if (description.includes('storage') || description.includes('file')) {
      references.push("floppy disk", "cd-rom");
    }
    
    // Ensure we have at least 3 references
    const allReferences = ["cd-rom", "game gear", "floppy disk", "dial-up", "bbs", "tamagotchi", "pager", "walkman", "nintendo", "windows 95", "dos", "modem", "hard drive"];
    while (references.length < 3) {
      const randomRef = allReferences[Math.floor(Math.random() * allReferences.length)];
      if (!references.includes(randomRef)) {
        references.push(randomRef);
      }
    }
    
    return references;
  }

  /**
   * Calculate analysis confidence based on problem and research quality
   */
  private calculateAnalysisConfidence(problem: UserProblem, research: ResearchResults): number {
    let confidence = 0.5; // Base confidence
    
    // Research quality factor
    confidence += research.confidence * 0.3;
    
    // Problem clarity factor
    if (problem.description.length > 100) confidence += 0.1;
    if (problem.description.length > 200) confidence += 0.1;
    
    // Category familiarity factor
    if (problem.category === ProblemCategory.TECHNICAL) confidence += 0.2;
    
    // Complexity adjustment
    switch (problem.complexity) {
      case ComplexityLevel.SIMPLE:
        confidence += 0.2;
        break;
      case ComplexityLevel.MODERATE:
        confidence += 0.1;
        break;
      case ComplexityLevel.COMPLEX:
        // No adjustment
        break;
      case ComplexityLevel.EXPERT:
        confidence -= 0.1;
        break;
    }
    
    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * Get processing time based on complexity
   */
  private getProcessingTime(complexity: ComplexityLevel): number {
    switch (complexity) {
      case ComplexityLevel.SIMPLE:
        return 200 + Math.random() * 100;
      case ComplexityLevel.MODERATE:
        return 300 + Math.random() * 200;
      case ComplexityLevel.COMPLEX:
        return 500 + Math.random() * 300;
      case ComplexityLevel.EXPERT:
        return 800 + Math.random() * 400;
      default:
        return 300;
    }
  }

  private determineComplexity(problem: UserProblem): ComplexityLevel {
    // Simple heuristic based on problem category and description length
    if (problem.description.length < 50) return ComplexityLevel.SIMPLE;
    if (problem.category === ProblemCategory.TECHNICAL && problem.description.length > 50) return ComplexityLevel.COMPLEX;
    if (problem.description.length < 150) return ComplexityLevel.MODERATE;
    return ComplexityLevel.COMPLEX;
  }

  /**
   * Get analysis statistics
   */
  getAnalysisStats(): { totalAnalyses: number; cachedResults: number } {
    return {
      totalAnalyses: this.analysisHistory.size,
      cachedResults: this.analysisHistory.size
    };
  }

  /**
   * Clear analysis history
   */
  clearHistory(): void {
    this.analysisHistory.clear();
  }
}