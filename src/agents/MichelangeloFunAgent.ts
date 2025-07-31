/**
 * MichelangeloFunAgent - The fun specialist of the Cowabunga Crisis Squad
 * Makes solutions engaging and actionable with pizza analogies and surfer slang
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
  ComplexityLevel,
  ProblemCategory
} from '../utils/types';

export interface EngagementRequest {
  id: string;
  technicalSolution: string;
  targetAudience: string;
  complexity: ComplexityLevel;
}

export interface AnalogyGenerationResult {
  concept: string;
  pizza_analogy: string;
  skateboard_analogy: string;
  engagement_score: number;
}

export interface FunSolutionResult {
  original_solution: string;
  engaging_steps: string[];
  fun_factor: number;
  analogies: string[];
  tubular_catchphrases: string[];
}

export class MichelangeloFunAgent extends BaseSquadAgent {
  private engagementEngine: EngagementEngine;
  private analogyGenerator: AnalogyGenerator;
  private engagementHistory: Map<string, FunSolutionResult> = new Map();
  private analogyCache: Map<string, AnalogyGenerationResult> = new Map();

  constructor(
    floorManager: FloorManager,
    envelopeHandler: ConversationEnvelopeHandler,
    aiService?: HybridAIService
  ) {
    super(
      'michelangelo',
      'Michelangelo',
      PersonalityConfigFactory.createMichelangeloConfig(),
      floorManager,
      envelopeHandler,
      aiService
    );
    this.engagementEngine = new EngagementEngine();
    this.analogyGenerator = new AnalogyGenerator();
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
          console.log(`Michelangelo received unhandled event type: ${evt.eventType}`);
      }
    } catch (error) {
      console.error(`Error processing envelope in Michelangelo:`, error);
      await this.handleProcessingError(envelope, error);
    }
    return envelope;
  }

  /**
   * Make technical solutions engaging and actionable with fun factor
   */
  async makeEngaging(technicalSolution: string): Promise<string> {
    // Check cache first
    const cacheKey = technicalSolution.substring(0, 100);
    if (this.engagementHistory.has(cacheKey)) {
      const cached = this.engagementHistory.get(cacheKey)!;
      await this.sendMessage(
        `Totally tubular! Already made this solution gnarly awesome - let's surf through it again, dude!`
      );
      return this.formatEngagingSolution(cached);
    }

    await this.sendMessage(
      `Cowabunga! Time to make this technical stuff totally tubular and pizza-powered awesome!`
    );

    try {
      // Break down technical solution into digestible steps
      const engagingSteps = await this.engagementEngine.createEngagingSteps(technicalSolution);
      
      // Generate fun analogies for complex concepts
      const analogies = await this.generateMultipleAnalogies(technicalSolution);
      
      // Add surfer slang and tubular catchphrases
      const enhancedSteps = engagingSteps.map(step => this.addSurferSlang(step));
      
      // Calculate fun factor
      const funFactor = this.calculateFunFactor(enhancedSteps, analogies);
      
      const result: FunSolutionResult = {
        original_solution: technicalSolution,
        engaging_steps: enhancedSteps,
        fun_factor: funFactor,
        analogies: analogies,
        tubular_catchphrases: this.generateTubularCatchphrases(enhancedSteps.length)
      };

      // Cache the result
      this.engagementHistory.set(cacheKey, result);

      const engagingSolution = this.formatEngagingSolution(result);

      await this.sendMessage(
        `Totally gnarly transformation complete! Made this solution ${Math.round(funFactor * 100)}% more awesome with ${analogies.length} pizza-powered analogies!`
      );

      return engagingSolution;
    } catch (error) {
      const errorMessage = `Engagement engine wiped out like a skateboard crash! ${error instanceof Error ? error.message : String(error)}`;
      await this.sendMessage(errorMessage);
      
      // Return fallback engaging solution
      return `Cowabunga! Even though my engagement system crashed, here's the deal: ${technicalSolution} - just imagine it's like making the perfect pizza, dude!`;
    }
  }

  /**
   * Generate pizza analogies for technical concepts
   */
  async generatePizzaAnalogies(concept: string): Promise<string> {
    // Check cache first
    if (this.analogyCache.has(concept)) {
      const cached = this.analogyCache.get(concept)!;
      await this.sendMessage(
        `Pizza-powered déjà vu! Already cooked up this analogy - it's still totally fresh!`
      );
      return cached.pizza_analogy;
    }

    await this.sendMessage(
      `Time to cook up some pizza-powered analogies! This concept's gonna be totally delicious to understand!`
    );

    try {
      const analogyResult = await this.analogyGenerator.generatePizzaAnalogy(concept);
      
      // Cache the result
      this.analogyCache.set(concept, analogyResult);

      await this.sendMessage(
        `Pizza analogy cooked to perfection! This explanation is gonna be more satisfying than a hot slice!`
      );

      return analogyResult.pizza_analogy;
    } catch (error) {
      const errorMessage = `Pizza oven malfunction! Analogy generator crashed: ${error instanceof Error ? error.message : String(error)}`;
      await this.sendMessage(errorMessage);
      
      // Return fallback pizza analogy
      return `Think of ${concept} like making pizza - you need the right ingredients, proper timing, and a totally tubular oven to get awesome results, dude!`;
    }
  }

  /**
   * Generate skateboard analogies for technical concepts
   */
  async generateSkateboardAnalogies(concept: string): Promise<string> {
    await this.sendMessage(
      `Time to shred some gnarly skateboard analogies! This concept's gonna be totally radical to understand!`
    );

    try {
      const analogyResult = await this.analogyGenerator.generateSkateboardAnalogy(concept);

      await this.sendMessage(
        `Skateboard analogy totally nailed it! This explanation is smoother than a perfect kickflip!`
      );

      return analogyResult.skateboard_analogy;
    } catch (error) {
      const errorMessage = `Skateboard wiped out! Analogy generator crashed: ${error instanceof Error ? error.message : String(error)}`;
      await this.sendMessage(errorMessage);
      
      // Return fallback skateboard analogy
      return `Think of ${concept} like skateboarding - you need balance, practice, and the right technique to pull off totally awesome moves, dude!`;
    }
  }

  /**
   * Translate technical solutions into engaging, actionable steps
   */
  async translateToEngagingSteps(technicalSolution: string): Promise<string[]> {
    await this.sendMessage(
      `Cowabunga! Time to break this technical stuff down into totally tubular, bite-sized pieces!`
    );

    try {
      // Use engagement engine to create step-by-step breakdown
      const steps = await this.engagementEngine.createEngagingSteps(technicalSolution);
      
      // Add fun factor to each step
      const engagingSteps = steps.map((step, index) => {
        const enhanced = this.addSurferSlang(step);
        const withAnalogy = this.addQuickAnalogy(enhanced, index);
        return `${index + 1}. ${withAnalogy}`;
      });

      await this.sendMessage(
        `Totally awesome breakdown complete! Turned that technical stuff into ${engagingSteps.length} gnarly actionable steps!`
      );

      return engagingSteps;
    } catch (error) {
      const errorMessage = `Step translation wiped out! ${error instanceof Error ? error.message : String(error)}`;
      await this.sendMessage(errorMessage);
      
      // Return fallback steps
      return [
        '1. Start with the basics - like learning to balance on a skateboard, dude!',
        '2. Take it step by step - no need to rush the pizza-making process!',
        '3. Test as you go - make sure each part is totally tubular before moving on!',
        '4. Celebrate the wins - every small success is gnarly awesome!'
      ];
    }
  }

  /**
   * Advanced technical solution translation with complex concept handling
   */
  async translateComplexSolution(technicalSolution: string, complexity: ComplexityLevel): Promise<{
    actionableSteps: string[];
    conceptAnalogies: string[];
    funFactorScore: number;
    effectivenessRating: number;
  }> {
    await this.sendMessage(
      `Time for some gnarly complex solution translation! This ${complexity} level challenge needs maximum pizza power!`
    );

    try {
      // Break down solution based on complexity
      const baseSteps = await this.engagementEngine.createEngagingSteps(technicalSolution);
      
      // Generate concept-specific analogies
      const conceptAnalogies = await this.generateConceptAnalogies(technicalSolution, complexity);
      
      // Create actionable steps with embedded analogies
      const actionableSteps = await this.createActionableStepsWithAnalogies(baseSteps, conceptAnalogies);
      
      // Calculate fun factor and effectiveness
      const funFactorScore = this.calculateAdvancedFunFactor(actionableSteps, conceptAnalogies, complexity);
      const effectivenessRating = this.calculateSolutionEffectiveness(actionableSteps, technicalSolution);

      await this.sendMessage(
        `Complex solution translation complete! Generated ${actionableSteps.length} actionable steps with ${conceptAnalogies.length} gnarly analogies. Fun factor: ${Math.round(funFactorScore * 100)}%, Effectiveness: ${Math.round(effectivenessRating * 100)}%`
      );

      return {
        actionableSteps,
        conceptAnalogies,
        funFactorScore,
        effectivenessRating
      };
    } catch (error) {
      const errorMessage = `Complex translation system crashed! ${error instanceof Error ? error.message : String(error)}`;
      await this.sendMessage(errorMessage);
      
      // Return fallback complex solution
      return {
        actionableSteps: [
          '1. Break the complex problem into smaller, totally manageable chunks - like slicing a giant pizza!',
          '2. Tackle each piece with focused attention - like perfecting one skateboard trick at a time!',
          '3. Connect the pieces together smoothly - like a gnarly skateboard combo sequence!',
          '4. Test the whole solution thoroughly - make sure it\'s as solid as a perfectly baked pizza!'
        ],
        conceptAnalogies: [
          'Complex solutions are like making a gourmet pizza - lots of ingredients need perfect coordination',
          'It\'s like learning a complex skateboard routine - master each move before combining them'
        ],
        funFactorScore: 0.7,
        effectivenessRating: 0.6
      };
    }
  }

  /**
   * Inject fun factor while maintaining solution effectiveness
   */
  async injectFunFactorWithEffectiveness(solution: string, targetFunLevel: number = 0.8): Promise<{
    enhancedSolution: string;
    funLevel: number;
    effectivenessRetained: number;
    enhancements: string[];
  }> {
    await this.sendMessage(
      `Time to pump up the fun factor to ${Math.round(targetFunLevel * 100)}% while keeping this solution totally effective!`
    );

    try {
      let enhancedSolution = solution;
      const enhancements: string[] = [];
      
      // Add surfer slang enhancement
      if (targetFunLevel > 0.3) {
        enhancedSolution = this.addSurferSlang(enhancedSolution);
        enhancements.push('Surfer slang integration');
      }
      
      // Add pizza analogies for complex concepts
      if (targetFunLevel > 0.5) {
        enhancedSolution = await this.embedPizzaAnalogies(enhancedSolution);
        enhancements.push('Pizza analogy embedding');
      }
      
      // Add skateboard references for process steps
      if (targetFunLevel > 0.6) {
        enhancedSolution = await this.embedSkateboardReferences(enhancedSolution);
        enhancements.push('Skateboard reference integration');
      }
      
      // Add tubular catchphrases for motivation
      if (targetFunLevel > 0.7) {
        enhancedSolution = this.addMotivationalCatchphrases(enhancedSolution);
        enhancements.push('Motivational catchphrase injection');
      }
      
      // Calculate actual fun level and effectiveness retention
      const actualFunLevel = this.calculateFunLevel(enhancedSolution);
      const effectivenessRetained = this.calculateEffectivenessRetention(solution, enhancedSolution);

      await this.sendMessage(
        `Fun factor injection complete! Achieved ${Math.round(actualFunLevel * 100)}% fun level with ${Math.round(effectivenessRetained * 100)}% effectiveness retention. Added ${enhancements.length} gnarly enhancements!`
      );

      return {
        enhancedSolution,
        funLevel: actualFunLevel,
        effectivenessRetained,
        enhancements
      };
    } catch (error) {
      const errorMessage = `Fun factor injection system wiped out! ${error instanceof Error ? error.message : String(error)}`;
      await this.sendMessage(errorMessage);
      
      // Return fallback fun injection
      return {
        enhancedSolution: `Totally tubular approach: ${solution} - just imagine it's like making the perfect pizza with gnarly skateboard moves, dude!`,
        funLevel: 0.6,
        effectivenessRetained: 0.8,
        enhancements: ['Basic fun factor fallback']
      };
    }
  }

  protected getCapabilities(): string[] {
    return [
      'solution_engagement',
      'pizza_analogies',
      'skateboard_analogies',
      'surfer_slang_integration',
      'fun_factor_injection',
      'tubular_catchphrases'
    ];
  }

  protected getDescription(): string {
    return 'Michelangelo - Fun specialist of the Cowabunga Crisis Squad. Makes solutions engaging and actionable with pizza analogies, skateboard references, and totally tubular surfer slang!';
  }

  /**
   * Add surfer slang to responses maintaining character authenticity
   */
  private addSurferSlang(response: string): string {
    if (!response || response.trim().length === 0) {
      return response;
    }

    const surferTerms = [
      'totally', 'gnarly', 'tubular', 'awesome', 'radical', 'dude',
      'cowabunga', 'wicked', 'fresh', 'phat', 'righteous', 'stellar'
    ];

    let enhanced = response;
    
    // Replace formal language with surfer slang
    enhanced = enhanced.replace(/\bvery\b/gi, 'totally');
    enhanced = enhanced.replace(/\bgood\b/gi, 'gnarly');
    enhanced = enhanced.replace(/\bgreat\b/gi, 'awesome');
    enhanced = enhanced.replace(/\bexcellent\b/gi, 'tubular');
    enhanced = enhanced.replace(/\bdifficult\b/gi, 'gnarly challenging');
    enhanced = enhanced.replace(/\bcomplex\b/gi, 'totally complex');
    
    // Add random surfer term if none present
    const hasSurferSlang = surferTerms.some(term => 
      enhanced.toLowerCase().includes(term.toLowerCase())
    );
    
    if (!hasSurferSlang) {
      const randomTerm = surferTerms[Math.floor(Math.random() * surferTerms.length)];
      enhanced = `${randomTerm} ${enhanced}`;
    }
    
    // Add "dude" occasionally for authenticity
    if (Math.random() < 0.3 && !enhanced.toLowerCase().includes('dude')) {
      enhanced += ', dude!';
    }
    
    return enhanced;
  }

  /**
   * Generate multiple analogies for comprehensive understanding
   */
  private async generateMultipleAnalogies(concept: string): Promise<string[]> {
    const analogies: string[] = [];
    
    try {
      // Generate pizza analogy
      const pizzaAnalogy = await this.generatePizzaAnalogies(concept);
      analogies.push(pizzaAnalogy);
      
      // Generate skateboard analogy
      const skateboardAnalogy = await this.generateSkateboardAnalogies(concept);
      analogies.push(skateboardAnalogy);
      
      // Add general fun analogies
      const generalAnalogies = this.generateGeneralFunAnalogies(concept);
      analogies.push(...generalAnalogies);
      
    } catch (error) {
      // Fallback analogies
      analogies.push(`Think of ${concept} like making the perfect pizza - it takes the right ingredients and timing!`);
      analogies.push(`It's like learning a new skateboard trick - practice makes it totally awesome!`);
    }
    
    return analogies.slice(0, 3); // Limit to top 3 analogies
  }

  /**
   * Generate general fun analogies for concepts
   */
  private generateGeneralFunAnalogies(concept: string): string[] {
    const analogies: string[] = [];
    const lowerConcept = concept.toLowerCase();
    
    // Database analogies
    if (lowerConcept.includes('database') || lowerConcept.includes('data')) {
      analogies.push('Like organizing your totally awesome comic book collection - everything has its perfect place!');
    }
    
    // Network analogies
    if (lowerConcept.includes('network') || lowerConcept.includes('connection')) {
      analogies.push('Like connecting all the skate parks in town - everyone can cruise between them smoothly!');
    }
    
    // Performance analogies
    if (lowerConcept.includes('performance') || lowerConcept.includes('speed')) {
      analogies.push('Like upgrading from a regular skateboard to a totally tubular electric one - same moves, way more awesome!');
    }
    
    // Security analogies
    if (lowerConcept.includes('security') || lowerConcept.includes('protection')) {
      analogies.push('Like keeping your secret pizza recipe safe - only the gnarly trusted dudes get access!');
    }
    
    return analogies;
  }

  /**
   * Add quick analogies to steps for better understanding
   */
  private addQuickAnalogy(step: string, index: number): string {
    const quickAnalogies = [
      'like adding the perfect cheese to pizza',
      'like nailing your first kickflip',
      'like finding the gnarliest wave',
      'like discovering a totally tubular skate spot',
      'like perfecting your pizza dough recipe'
    ];
    
    const analogy = quickAnalogies[index % quickAnalogies.length];
    return `${step} - ${analogy}!`;
  }

  /**
   * Calculate fun factor based on engagement elements
   */
  private calculateFunFactor(steps: string[], analogies: string[]): number {
    let funFactor = 0.3; // Base fun level
    
    // Add points for engaging steps
    funFactor += Math.min(steps.length * 0.1, 0.3);
    
    // Add points for analogies
    funFactor += Math.min(analogies.length * 0.15, 0.3);
    
    // Add points for surfer slang usage
    const totalSurferTerms = steps.reduce((count, step) => {
      const surferWords = ['totally', 'gnarly', 'tubular', 'awesome', 'dude'];
      return count + surferWords.filter(word => 
        step.toLowerCase().includes(word)
      ).length;
    }, 0);
    
    funFactor += Math.min(totalSurferTerms * 0.05, 0.2);
    
    return Math.min(funFactor, 1.0);
  }

  /**
   * Generate tubular catchphrases for responses
   */
  private generateTubularCatchphrases(count: number): string[] {
    const catchphrases = [
      'Cowabunga!',
      'Totally tubular!',
      'Gnarly awesome!',
      'Pizza-powered!',
      'Righteous, dude!',
      'Wicked fresh!',
      'Stellar moves!',
      'Radical solution!'
    ];
    
    const selected: string[] = [];
    for (let i = 0; i < Math.min(count, 3); i++) {
      const phrase = catchphrases[i % catchphrases.length];
      if (!selected.includes(phrase)) {
        selected.push(phrase);
      }
    }
    
    return selected;
  }

  /**
   * Format engaging solution for output
   */
  private formatEngagingSolution(result: FunSolutionResult): string {
    let formatted = `🍕 TOTALLY TUBULAR SOLUTION BREAKDOWN 🛹\n\n`;
    
    // Add engaging steps
    formatted += `Gnarly Action Steps:\n`;
    result.engaging_steps.forEach((step, index) => {
      formatted += `${step}\n`;
    });
    
    // Add analogies section
    if (result.analogies.length > 0) {
      formatted += `\nPizza-Powered Analogies:\n`;
      result.analogies.forEach((analogy, index) => {
        formatted += `🍕 ${analogy}\n`;
      });
    }
    
    // Add fun factor
    formatted += `\nFun Factor: ${Math.round(result.fun_factor * 100)}% Totally Awesome!\n`;
    
    // Add catchphrases
    if (result.tubular_catchphrases.length > 0) {
      formatted += `\nTubular Motivation: ${result.tubular_catchphrases.join(' ')} 🤙\n`;
    }
    
    return formatted;
  }

  /**
   * Generate concept-specific analogies based on complexity
   */
  private async generateConceptAnalogies(solution: string, complexity: ComplexityLevel): Promise<string[]> {
    const analogies: string[] = [];
    const lowerSolution = solution.toLowerCase();
    
    // Generate more analogies for complex solutions
    const analogyCount = complexity === ComplexityLevel.EXPERT ? 4 : 
                        complexity === ComplexityLevel.COMPLEX ? 3 : 2;
    
    // Technical concept analogies
    if (lowerSolution.includes('database') || lowerSolution.includes('data')) {
      analogies.push('Think of data management like organizing a massive pizza ingredient warehouse - everything needs its perfect place for quick access!');
    }
    
    if (lowerSolution.includes('api') || lowerSolution.includes('service')) {
      analogies.push('APIs are like pizza delivery systems - you order what you want, and it arrives exactly as requested without knowing the kitchen details!');
    }
    
    if (lowerSolution.includes('security') || lowerSolution.includes('auth')) {
      analogies.push('Security is like protecting your secret skateboard spot - only trusted friends get the location, and you keep the gnarly moves to yourself!');
    }
    
    if (lowerSolution.includes('performance') || lowerSolution.includes('optimization')) {
      analogies.push('Performance optimization is like upgrading your skateboard setup - better wheels and bearings make everything smoother and more awesome!');
    }
    
    // Add general analogies if we need more
    while (analogies.length < analogyCount) {
      const generalAnalogies = [
        'Complex solutions are like mastering a gnarly skateboard combo - practice each part until it flows perfectly!',
        'Building software is like making the ultimate pizza - you need quality ingredients, proper technique, and perfect timing!',
        'Problem-solving is like finding the perfect wave - you need patience, skill, and the right moment to make it totally tubular!'
      ];
      
      const nextAnalogy = generalAnalogies[analogies.length % generalAnalogies.length];
      if (!analogies.includes(nextAnalogy)) {
        analogies.push(nextAnalogy);
      }
    }
    
    return analogies.slice(0, analogyCount);
  }

  /**
   * Create actionable steps with embedded analogies
   */
  private async createActionableStepsWithAnalogies(baseSteps: string[], analogies: string[]): Promise<string[]> {
    return baseSteps.map((step, index) => {
      const enhancedStep = this.addSurferSlang(step);
      const analogyIndex = index % analogies.length;
      const relevantAnalogy = analogies[analogyIndex];
      
      // Extract a short analogy snippet
      const analogySnippet = relevantAnalogy.split(' - ')[0].replace('Think of', '').replace('like', '').trim();
      
      return `${index + 1}. ${enhancedStep} (${analogySnippet})`;
    });
  }

  /**
   * Calculate advanced fun factor based on complexity
   */
  private calculateAdvancedFunFactor(steps: string[], analogies: string[], complexity: ComplexityLevel): number {
    let funFactor = 0.4; // Base fun level
    
    // Add points for engaging steps
    funFactor += Math.min(steps.length * 0.08, 0.25);
    
    // Add points for analogies
    funFactor += Math.min(analogies.length * 0.12, 0.3);
    
    // Complexity bonus (harder problems get more fun factor)
    const complexityBonus = {
      [ComplexityLevel.SIMPLE]: 0.05,
      [ComplexityLevel.MODERATE]: 0.1,
      [ComplexityLevel.COMPLEX]: 0.15,
      [ComplexityLevel.EXPERT]: 0.2
    };
    funFactor += complexityBonus[complexity] || 0.1;
    
    // Count surfer slang usage
    const allText = [...steps, ...analogies].join(' ').toLowerCase();
    const surferTerms = ['totally', 'gnarly', 'tubular', 'awesome', 'dude', 'cowabunga'];
    const surferCount = surferTerms.filter(term => allText.includes(term)).length;
    funFactor += Math.min(surferCount * 0.03, 0.15);
    
    return Math.min(funFactor, 1.0);
  }

  /**
   * Calculate solution effectiveness retention
   */
  private calculateSolutionEffectiveness(steps: string[], originalSolution: string): number {
    // Check if key concepts from original solution are preserved
    const originalWords = originalSolution.toLowerCase().split(/\s+/);
    const technicalWords = originalWords.filter(word => 
      word.length > 4 && 
      !['the', 'and', 'for', 'with', 'this', 'that', 'from', 'they', 'have', 'will'].includes(word)
    );
    
    const stepsText = steps.join(' ').toLowerCase();
    const preservedWords = technicalWords.filter(word => stepsText.includes(word));
    
    const preservationRatio = technicalWords.length > 0 ? preservedWords.length / technicalWords.length : 0.8;
    
    // Base effectiveness score
    let effectiveness = 0.7 + (preservationRatio * 0.3);
    
    // Bonus for actionable language
    const actionWords = ['implement', 'create', 'configure', 'set up', 'build', 'develop'];
    const hasActionWords = actionWords.some(word => stepsText.includes(word));
    if (hasActionWords) effectiveness += 0.1;
    
    return Math.min(effectiveness, 1.0);
  }

  /**
   * Embed pizza analogies into solution text
   */
  private async embedPizzaAnalogies(solution: string): Promise<string> {
    const sentences = solution.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return sentences.map((sentence, index) => {
      if (index % 2 === 0 && sentence.length > 30) {
        // Add pizza analogy to every other sentence
        return `${sentence.trim()} - like adding the perfect cheese blend to your pizza!`;
      }
      return sentence.trim();
    }).join('. ') + '.';
  }

  /**
   * Embed skateboard references into solution text
   */
  private async embedSkateboardReferences(solution: string): Promise<string> {
    const processWords = ['step', 'process', 'method', 'approach', 'technique'];
    let enhanced = solution;
    
    processWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      enhanced = enhanced.replace(regex, `${word} (like nailing a gnarly skateboard trick)`);
    });
    
    return enhanced;
  }

  /**
   * Add motivational catchphrases throughout solution
   */
  private addMotivationalCatchphrases(solution: string): string {
    const catchphrases = [
      'Cowabunga!',
      'Totally tubular!',
      'Gnarly awesome!',
      'Pizza-powered success!',
      'Righteous moves, dude!'
    ];
    
    const sentences = solution.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return sentences.map((sentence, index) => {
      if (index === 0) {
        return `${catchphrases[0]} ${sentence.trim()}`;
      } else if (index === sentences.length - 1) {
        return `${sentence.trim()} ${catchphrases[1]}`;
      }
      return sentence.trim();
    }).join('. ') + '.';
  }

  /**
   * Calculate fun level of enhanced solution
   */
  private calculateFunLevel(solution: string): number {
    let funLevel = 0.3; // Base level
    
    const lowerSolution = solution.toLowerCase();
    
    // Check for surfer slang
    const surferTerms = ['totally', 'gnarly', 'tubular', 'awesome', 'dude', 'cowabunga'];
    const surferCount = surferTerms.filter(term => lowerSolution.includes(term)).length;
    funLevel += surferCount * 0.08;
    
    // Check for analogies
    if (lowerSolution.includes('pizza')) funLevel += 0.15;
    if (lowerSolution.includes('skateboard') || lowerSolution.includes('trick')) funLevel += 0.15;
    
    // Check for catchphrases
    const catchphrases = ['cowabunga', 'tubular', 'gnarly', 'righteous'];
    const catchphraseCount = catchphrases.filter(phrase => lowerSolution.includes(phrase)).length;
    funLevel += catchphraseCount * 0.1;
    
    // Check for emojis or fun formatting
    if (solution.includes('🍕') || solution.includes('🛹')) funLevel += 0.1;
    
    return Math.min(funLevel, 1.0);
  }

  /**
   * Calculate effectiveness retention after fun enhancement
   */
  private calculateEffectivenessRetention(original: string, enhanced: string): number {
    // Check if core technical content is preserved
    const originalWords = original.toLowerCase().split(/\s+/);
    const enhancedWords = enhanced.toLowerCase().split(/\s+/);
    
    const technicalWords = originalWords.filter(word => 
      word.length > 4 && 
      !['totally', 'gnarly', 'tubular', 'awesome', 'dude', 'pizza', 'skateboard'].includes(word)
    );
    
    const preservedTechnical = technicalWords.filter(word => 
      enhancedWords.includes(word)
    );
    
    const preservationRatio = technicalWords.length > 0 ? 
      preservedTechnical.length / technicalWords.length : 0.9;
    
    // Base retention score
    let retention = 0.6 + (preservationRatio * 0.4);
    
    // Penalty for excessive fun additions that might obscure meaning
    const funWordCount = enhancedWords.filter(word => 
      ['totally', 'gnarly', 'tubular', 'awesome', 'dude', 'cowabunga'].includes(word)
    ).length;
    
    const funRatio = funWordCount / enhancedWords.length;
    if (funRatio > 0.2) retention -= (funRatio - 0.2) * 0.5; // Penalty for too much fun
    
    return Math.max(Math.min(retention, 1.0), 0.3); // Keep between 30% and 100%
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
    
    // Handle engagement requests
    if (evt.parameters?.type === 'engagement_request') {
      await this.handleEngagementRequest(evt.parameters);
    }
    
    // Handle analogy requests
    if (evt.parameters?.type === 'analogy_request') {
      await this.handleAnalogyRequest(evt.parameters);
    }
  }

  /**
   * Handle delegation from Leonardo
   */
  private async handleLeaderDelegation(content: any): Promise<void> {
    const task = content.task;
    const problem = content.problem;
    
    // Request floor to provide fun engagement
    const hasFloor = await this.requestFloor('engagement delegation');
    if (!hasFloor) {
      throw new Error('Michelangelo could not obtain floor for engagement response');
    }

    try {
      await this.sendMessage(
        `Cowabunga! Time to make this solution totally tubular and pizza-powered awesome!`
      );

      let contribution: AgentContribution;

      switch (task.type) {
        case 'engagement':
          const engagingSolution = await this.makeEngaging(task.technical_solution || problem.description);
          contribution = {
            agentId: this.id,
            contributionType: 'engagement',
            content: `Engaging Solution: ${engagingSolution}`,
            confidence: 0.9,
            references: ['pizza_analogies', 'skateboard_wisdom', 'surfer_philosophy']
          };
          break;
          
        case 'analogy_generation':
          const analogies = await this.generateMultipleAnalogies(problem.description);
          contribution = {
            agentId: this.id,
            contributionType: 'analogies',
            content: `Fun Analogies: ${analogies.join(' | ')}`,
            confidence: 0.85,
            references: ['pizza_knowledge', 'skateboard_experience']
          };
          break;
          
        default:
          contribution = {
            agentId: this.id,
            contributionType: 'general_fun',
            content: `Totally tubular approach needed! Let's make this problem history with some gnarly awesome solutions, dude!`,
            confidence: 0.8,
            references: ['general_fun_wisdom']
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
        `Engagement mission accomplished! Made this solution totally gnarly awesome with maximum fun factor!`
      );

    } finally {
      await this.yieldFloor();
    }
  }

  /**
   * Handle engagement requests
   */
  private async handleEngagementRequest(content: any): Promise<void> {
    const request = content.request;
    const engagingSolution = await this.makeEngaging(request.technicalSolution);
    
    await this.sendMessage(
      `Totally tubular transformation complete! Made this technical stuff ${Math.round(Math.random() * 30 + 70)}% more awesome!`
    );
  }

  /**
   * Handle analogy requests
   */
  private async handleAnalogyRequest(content: any): Promise<void> {
    const concept = content.concept;
    const analogies = await this.generateMultipleAnalogies(concept);
    
    await this.sendMessage(
      `Pizza-powered analogies ready to serve! Got ${analogies.length} gnarly ways to understand this concept!`
    );
  }

  /**
   * Handle floor grant events
   */
  private async handleFloorGrant(envelope: ConversationEnvelope): Promise<void> {
    const evt = envelope.events?.[0];
    if (evt?.parameters?.grantee === this.id) {
      console.log('Michelangelo received floor control');
      await this.sendMessage('Cowabunga! Time to make everything totally tubular and pizza-powered awesome!');
    }
  }

  /**
   * Handle floor revoke events
   */
  private async handleFloorRevoke(envelope: ConversationEnvelope): Promise<void> {
    const evt = envelope.events?.[0];
    if (evt?.parameters?.target === this.id) {
      console.log('Michelangelo floor control revoked:', evt?.parameters?.reason);
      await this.sendMessage('Totally gnarly floor time over! Catch you on the flip side, dudes!');
    }
  }

  /**
   * Handle processing errors gracefully
   */
  private async handleProcessingError(envelope: ConversationEnvelope, error: any): Promise<void> {
    const errorMessage = `Gnarly wipeout! My engagement system crashed like a skateboard fail: ${error instanceof Error ? error.message : String(error)} - totally bogus!`;
    
    try {
      await this.sendMessage(errorMessage);
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }
}

/**
 * Engagement Engine for making solutions fun and actionable
 */
export class EngagementEngine {
  private engagementHistory: Map<string, string[]> = new Map();

  async createEngagingSteps(technicalSolution: string): Promise<string[]> {
    // Check cache first
    if (this.engagementHistory.has(technicalSolution)) {
      return this.engagementHistory.get(technicalSolution)!;
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    const steps = this.breakDownSolution(technicalSolution);
    const engagingSteps = steps.map(step => this.makeStepEngaging(step));
    
    // Cache the result
    this.engagementHistory.set(technicalSolution, engagingSteps);
    
    return engagingSteps;
  }

  private breakDownSolution(solution: string): string[] {
    // Simple solution breakdown - in reality would use more sophisticated analysis
    const sentences = solution.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 1) {
      return [
        'Start with understanding the problem',
        'Plan your approach',
        'Implement the solution step by step',
        'Test and verify results'
      ];
    }
    
    return sentences.slice(0, 6); // Limit to 6 steps max
  }

  private makeStepEngaging(step: string): string {
    let engaging = step.trim();
    
    // Add action-oriented language
    if (!engaging.match(/^(start|begin|create|implement|test|verify|check|ensure)/i)) {
      engaging = `Take action: ${engaging}`;
    }
    
    // Make it more conversational
    engaging = engaging.replace(/\bshould\b/gi, 'need to');
    engaging = engaging.replace(/\bmust\b/gi, 'gotta');
    engaging = engaging.replace(/\brequired\b/gi, 'needed');
    
    return engaging;
  }
}

/**
 * Analogy Generator for pizza and skateboard analogies
 */
export class AnalogyGenerator {
  private analogyCache: Map<string, AnalogyGenerationResult> = new Map();

  async generatePizzaAnalogy(concept: string): Promise<AnalogyGenerationResult> {
    // Check cache first
    if (this.analogyCache.has(concept)) {
      return this.analogyCache.get(concept)!;
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
    
    const pizzaAnalogy = this.createPizzaAnalogy(concept);
    const skateboardAnalogy = this.createSkateboardAnalogy(concept);
    const engagementScore = this.calculateEngagementScore(pizzaAnalogy, skateboardAnalogy);
    
    const result: AnalogyGenerationResult = {
      concept,
      pizza_analogy: pizzaAnalogy,
      skateboard_analogy: skateboardAnalogy,
      engagement_score: engagementScore
    };
    
    // Cache the result
    this.analogyCache.set(concept, result);
    
    return result;
  }

  async generateSkateboardAnalogy(concept: string): Promise<AnalogyGenerationResult> {
    return this.generatePizzaAnalogy(concept); // Reuse the same method since it generates both
  }

  private createPizzaAnalogy(concept: string): string {
    const lowerConcept = concept.toLowerCase();
    
    // Database analogies
    if (lowerConcept.includes('database') || lowerConcept.includes('data')) {
      return 'Think of it like organizing your pizza toppings - you need the right ingredients in the right places, and a good system to find what you need when you\'re hungry for data!';
    }
    
    // API analogies
    if (lowerConcept.includes('api') || lowerConcept.includes('interface')) {
      return 'It\'s like a pizza ordering system - you tell them what you want, they prepare it in the kitchen, and deliver exactly what you asked for. No need to know how they make the dough!';
    }
    
    // Performance analogies
    if (lowerConcept.includes('performance') || lowerConcept.includes('optimization')) {
      return 'Like perfecting your pizza recipe - you start with basic ingredients, then optimize the cooking time, temperature, and technique until you get the most delicious results!';
    }
    
    // Security analogies
    if (lowerConcept.includes('security') || lowerConcept.includes('authentication')) {
      return 'Think of it like protecting your secret pizza recipe - you only share it with trusted friends, and you make sure nobody can steal your special sauce formula!';
    }
    
    // General analogy
    return `Understanding ${concept} is like making pizza - you need the right ingredients (components), proper preparation (planning), and the right cooking process (implementation) to get totally delicious results!`;
  }

  private createSkateboardAnalogy(concept: string): string {
    const lowerConcept = concept.toLowerCase();
    
    // Learning analogies
    if (lowerConcept.includes('learn') || lowerConcept.includes('practice')) {
      return 'It\'s like learning a new skateboard trick - you start with the basics, practice the movements, and gradually build up to the gnarly advanced moves!';
    }
    
    // Process analogies
    if (lowerConcept.includes('process') || lowerConcept.includes('workflow')) {
      return 'Think of it like a skateboard routine - each move flows into the next, you need good balance and timing, and practice makes it totally smooth!';
    }
    
    // Problem-solving analogies
    if (lowerConcept.includes('problem') || lowerConcept.includes('solution')) {
      return 'Like figuring out a new skate spot - you assess the terrain, plan your approach, and adapt your technique to nail the perfect run!';
    }
    
    // Performance analogies
    if (lowerConcept.includes('performance') || lowerConcept.includes('speed')) {
      return 'It\'s like upgrading your skateboard setup - better wheels, bearings, and deck make everything smoother and more awesome!';
    }
    
    // General analogy
    return `Mastering ${concept} is like skateboarding - you need balance, practice, and the right technique to pull off totally radical results!`;
  }

  private calculateEngagementScore(pizzaAnalogy: string, skateboardAnalogy: string): number {
    let score = 0.5; // Base score
    
    // Length factor (good analogies are detailed but not too long)
    const avgLength = (pizzaAnalogy.length + skateboardAnalogy.length) / 2;
    if (avgLength > 100 && avgLength < 300) score += 0.2;
    
    // Fun words bonus
    const funWords = ['totally', 'gnarly', 'awesome', 'delicious', 'radical', 'smooth'];
    const funWordCount = funWords.filter(word => 
      pizzaAnalogy.toLowerCase().includes(word) || skateboardAnalogy.toLowerCase().includes(word)
    ).length;
    score += funWordCount * 0.1;
    
    // Analogy quality (contains comparison words)
    const comparisonWords = ['like', 'similar to', 'think of it as', 'it\'s like'];
    const hasComparison = comparisonWords.some(word => 
      pizzaAnalogy.toLowerCase().includes(word) || skateboardAnalogy.toLowerCase().includes(word)
    );
    if (hasComparison) score += 0.2;
    
    return Math.min(score, 1.0);
  }
}