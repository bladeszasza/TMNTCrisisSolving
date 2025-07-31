/**
 * RaphaelAttitudeAgent - The attitude specialist of the Cowabunga Crisis Squad
 * Provides reality checks, direct advice, and tough-love messaging with 90s flair
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
  RealityCheckResult,
  ComplexityLevel,
  ProblemCategory
} from '../utils/types';

export interface Solution {
  id: string;
  description: string;
  steps: string[];
  complexity: ComplexityLevel;
  feasibility: number;
}

export interface AdviceRequest {
  id: string;
  problem: UserProblem;
  context: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface AttitudeResponse {
  advice: string;
  reality_check: RealityCheckResult;
  attitude_level: number;
  shell_shocked_factor: number;
}

export class RaphaelAttitudeAgent extends BaseSquadAgent {
  private realityChecker: RealityChecker;
  private adviceEngine: AdviceEngine;
  private attitudeHistory: Map<string, AttitudeResponse> = new Map();
  private realityCheckCache: Map<string, RealityCheckResult> = new Map();

  constructor(
    floorManager: FloorManager,
    envelopeHandler: ConversationEnvelopeHandler,
    aiService?: HybridAIService
  ) {
    super(
      'raphael',
      'Raphael',
      PersonalityConfigFactory.createRaphaelConfig(),
      floorManager,
      envelopeHandler,
      aiService
    );
    this.realityChecker = new RealityChecker();
    this.adviceEngine = new AdviceEngine();
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
          console.log(`Raphael received unhandled event type: ${evt.eventType}`);
      }
    } catch (error) {
      console.error(`Error processing envelope in Raphael:`, error);
      await this.handleProcessingError(envelope, error);
    }
    return envelope;
  }

  /**
   * Provide reality check for proposed solutions with practical perspective
   */
  async provideRealityCheck(proposal: Solution): Promise<RealityCheckResult> {
    // Handle null/undefined proposals
    if (!proposal || !proposal.id || !proposal.description) {
      await this.sendMessage(
        `Shell-shocked reality check: Can't analyze a bogus null proposal - that's totally wack!`
      );
      return {
        feasible: false,
        concerns: [`Can't analyze this bogus proposal - it's more busted than a broken skateboard!`],
        alternatives: [`Try a different approach - this one's totally wack!`],
        attitude_response: `Shell-shocked reality check: When the proposal is null, you know it's bogus!`
      };
    }

    // Check cache first
    const cacheKey = `${proposal.id}-${proposal.description.substring(0, 50)}`;
    if (this.realityCheckCache.has(cacheKey)) {
      const cached = this.realityCheckCache.get(cacheKey)!;
      await this.sendMessage(
        `Shell-shocked reality check time! Already analyzed this bogus idea - here's the straight dope!`
      );
      return cached;
    }

    await this.sendMessage(
      `Time for a shell-shocked reality check, dude! Let me break down this proposal with some tough love.`
    );

    try {
      // Analyze solution feasibility
      const feasibilityAnalysis = await this.realityChecker.analyzeFeasibility(proposal);
      
      // Generate practical concerns
      const concerns = await this.realityChecker.identifyConcerns(proposal);
      
      // Suggest alternatives if needed
      const alternatives = await this.realityChecker.generateAlternatives(proposal);
      
      // Create attitude-filled response
      const attitudeResponse = this.generateAttitudeResponse(feasibilityAnalysis, concerns);
      
      const result: RealityCheckResult = {
        feasible: feasibilityAnalysis.feasible,
        concerns: concerns,
        alternatives: alternatives,
        attitude_response: attitudeResponse
      };

      // Cache the result
      this.realityCheckCache.set(cacheKey, result);

      const feasibilityMessage = result.feasible 
        ? `This plan's got some shell! It's actually doable, dude.`
        : `That's totally bogus advice! This plan's got more holes than Swiss cheese.`;

      await this.sendMessage(
        `${feasibilityMessage} Found ${result.concerns.length} major concerns that need addressing - no sugarcoating here!`
      );

      return result;
    } catch (error) {
      const errorMessage = `Shell-shocked system malfunction! Reality check crashed: ${error instanceof Error ? error.message : String(error)}`;
      await this.sendMessage(errorMessage);
      
      // Return fallback reality check
      return {
        feasible: false,
        concerns: [`Can't analyze this bogus proposal - system's more busted than a broken skateboard!`],
        alternatives: [`Try a different approach - this one's totally wack!`],
        attitude_response: `Shell-shocked reality check: When the system crashes, you know the plan's bogus!`
      };
    }
  }

  /**
   * Generate direct advice with no-nonsense approach and attitude
   */
  async generateDirectAdvice(problem: UserProblem): Promise<string> {
    await this.sendMessage(
      `Time for some shell-shocked straight talk! Let me give you the real deal on this problem.`
    );

    try {
      // Analyze the problem with tough-love perspective
      const problemAnalysis = await this.adviceEngine.analyzeProblem(problem);
      
      // Generate direct, actionable advice
      const directAdvice = await this.adviceEngine.generateDirectAdvice(problemAnalysis);
      
      // Use AI-generated response directly - personality is already integrated via system prompt
      const finalAdvice = directAdvice;

      await this.sendMessage(
        `Here's the straight dope: ${finalAdvice} No sugarcoating, just pure turtle power truth!`
      );

      return finalAdvice;
    } catch (error) {
      const errorMessage = `Advice engine's more busted than a broken skateboard! ${error instanceof Error ? error.message : String(error)}`;
      await this.sendMessage(errorMessage);
      
      // Return fallback advice
      return `Shell-shocked reality check: When you can't get proper advice, sometimes you gotta figure it out yourself - that's totally bogus but it's the truth!`;
    }
  }

  /**
   * Provide comprehensive attitude-filled response combining reality check and advice
   */
  async provideAttitudeResponse(request: AdviceRequest): Promise<AttitudeResponse> {
    const requestKey = `${request.id}-${request.problem.id}`;
    
    // Check if we've handled this request before
    if (this.attitudeHistory.has(requestKey)) {
      const cached = this.attitudeHistory.get(requestKey)!;
      await this.sendMessage(
        `Shell-shocked déjà vu! Already gave you the straight talk on this one - pay attention!`
      );
      return cached;
    }

    await this.sendMessage(
      `Time for maximum attitude! Let me break this down with some serious turtle power tough love.`
    );

    try {
      // Generate direct advice
      const advice = await this.generateDirectAdvice(request.problem);
      
      // Create a mock solution for reality checking
      const mockSolution: Solution = {
        id: `solution-${request.id}`,
        description: advice,
        steps: advice.split('.').filter(step => step.trim().length > 0),
        complexity: request.problem.complexity,
        feasibility: 0.7
      };
      
      // Perform reality check
      const realityCheck = await this.provideRealityCheck(mockSolution);
      
      // Calculate attitude metrics
      const attitudeLevel = this.calculateAttitudeLevel(request);
      const shellShockedFactor = this.calculateShellShockedFactor(realityCheck);
      
      const response: AttitudeResponse = {
        advice,
        reality_check: realityCheck,
        attitude_level: attitudeLevel,
        shell_shocked_factor: shellShockedFactor
      };

      // Cache the response
      this.attitudeHistory.set(requestKey, response);

      await this.sendMessage(
        `Attitude response complete! Delivered ${Math.round(attitudeLevel * 100)}% pure turtle power with ${Math.round(shellShockedFactor * 100)}% shell-shocked reality!`
      );

      return response;
    } catch (error) {
      const errorMessage = `Attitude system crashed harder than a skateboard wipeout! ${error instanceof Error ? error.message : String(error)}`;
      await this.sendMessage(errorMessage);
      
      // Return fallback response
      return {
        advice: `Shell-shocked reality check: When the system's busted, you gotta improvise - totally bogus but that's life!`,
        reality_check: {
          feasible: false,
          concerns: [`System malfunction - can't properly analyze this bogus situation!`],
          alternatives: [`Try again when the tech's not totally wack!`],
          attitude_response: `That's what happens when you rely on busted technology!`
        },
        attitude_level: 0.9,
        shell_shocked_factor: 1.0
      };
    }
  }

  protected getCapabilities(): string[] {
    return [
      'reality_checking',
      'direct_advice',
      'attitude_responses',
      'tough_love_messaging',
      'practical_perspective',
      'shell_shocked_catchphrases'
    ];
  }

  protected getDescription(): string {
    return 'Raphael - Attitude specialist of the Cowabunga Crisis Squad. Provides reality checks, direct advice, and tough-love messaging with authentic 90s shell-shocked attitude!';
  }


  /**
   * Generate attitude response based on feasibility analysis
   */
  private generateAttitudeResponse(feasibility: any, concerns: string[]): string {
    if (feasibility.feasible && concerns.length === 0) {
      return `Shell-shocked approval! This plan's got some serious turtle power - totally doable!`;
    } else if (feasibility.feasible && concerns.length > 0) {
      return `This plan's got potential but ${concerns.length} major issues need fixing - no sugarcoating here!`;
    } else {
      return `That's totally bogus advice! This plan's more busted than a broken skateboard with ${concerns.length} major problems!`;
    }
  }

  /**
   * Calculate attitude level based on request characteristics
   */
  private calculateAttitudeLevel(request: AdviceRequest): number {
    let level = 0.3; // Base attitude level
    
    // Increase attitude based on problem complexity
    switch (request.problem.complexity) {
      case ComplexityLevel.SIMPLE:
        level += 0.1;
        break;
      case ComplexityLevel.MODERATE:
        level += 0.2;
        break;
      case ComplexityLevel.COMPLEX:
        level += 0.35;
        break;
      case ComplexityLevel.EXPERT:
        level += 0.5;
        break;
    }
    
    // Increase attitude based on urgency
    switch (request.urgency) {
      case 'low':
        level += 0.05;
        break;
      case 'medium':
        level += 0.15;
        break;
      case 'high':
        level += 0.25;
        break;
    }
    
    return Math.min(level, 1.0);
  }

  /**
   * Calculate shell-shocked factor based on reality check results
   */
  private calculateShellShockedFactor(realityCheck: RealityCheckResult): number {
    let factor = 0.3; // Base shell-shocked level
    
    // Increase based on number of concerns
    factor += realityCheck.concerns.length * 0.15;
    
    // Increase if not feasible
    if (!realityCheck.feasible) {
      factor += 0.4;
    }
    
    // Increase based on number of alternatives needed
    factor += realityCheck.alternatives.length * 0.1;
    
    return Math.min(factor, 1.0);
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
    
    // Handle reality check requests
    if (evt.parameters?.type === 'reality_check_request') {
      await this.handleRealityCheckRequest(evt.parameters);
    }
    
    // Handle advice requests
    if (evt.parameters?.type === 'advice_request') {
      await this.handleAdviceRequest(evt.parameters);
    }
  }

  /**
   * Handle delegation from Leonardo
   */
  private async handleLeaderDelegation(content: any): Promise<void> {
    const task = content.task;
    const problem = content.problem;
    
    // Request floor to provide attitude response
    const hasFloor = await this.requestFloor('attitude delegation');
    if (!hasFloor) {
      const error = new Error('Raphael could not obtain floor for attitude response');
      await this.sendMessage('Shell-shocked floor failure! Can\'t get the floor to deliver attitude - that\'s totally bogus!');
      throw error;
    }

    try {
      await this.sendMessage(
        `Shell-shocked reality check time! Time to deliver some turtle power tough love!`
      );

      let contribution: AgentContribution;

      switch (task.type) {
        case 'reality_check':
          const mockSolution: Solution = {
            id: `solution-${task.id}`,
            description: task.solution_description || problem.description,
            steps: [],
            complexity: problem.complexity,
            feasibility: 0.7
          };
          const realityCheck = await this.provideRealityCheck(mockSolution);
          contribution = {
            agentId: this.id,
            contributionType: 'reality_check',
            content: `Reality Check: ${realityCheck.attitude_response}\n\nConcerns: ${realityCheck.concerns.join(', ')}\n\nAlternatives: ${realityCheck.alternatives.join(', ')}`,
            confidence: realityCheck.feasible ? 0.8 : 0.9,
            references: ['practical_experience', 'tough_love_wisdom']
          };
          break;
          
        case 'direct_advice':
          const advice = await this.generateDirectAdvice(problem);
          contribution = {
            agentId: this.id,
            contributionType: 'direct_advice',
            content: `Direct Advice: ${advice}`,
            confidence: 0.85,
            references: ['street_smart_wisdom', 'practical_experience']
          };
          break;
          
        default:
          contribution = {
            agentId: this.id,
            contributionType: 'general_attitude',
            content: `Shell-shocked reality check: This problem needs some serious attitude adjustment - cut the crap and get real!`,
            confidence: 0.7,
            references: ['general_attitude_wisdom']
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
        `Attitude response delivered! Gave it to 'em straight with maximum turtle power tough love!`
      );

    } finally {
      await this.yieldFloor();
    }
  }

  /**
   * Handle reality check requests
   */
  private async handleRealityCheckRequest(content: any): Promise<void> {
    const solution = content.solution;
    const realityCheck = await this.provideRealityCheck(solution);
    
    const feasibilityMessage = realityCheck.feasible 
      ? `This plan's actually got some shell - it's doable!`
      : `That's totally bogus - this plan's more busted than a broken skateboard!`;
    
    await this.sendMessage(
      `${feasibilityMessage} Found ${realityCheck.concerns.length} concerns that need addressing - no sugarcoating!`
    );
  }

  /**
   * Handle advice requests
   */
  private async handleAdviceRequest(content: any): Promise<void> {
    const request = content.request;
    const advice = await this.generateDirectAdvice(request.problem);
    
    await this.sendMessage(
      `Here's the straight dope: ${advice} Shell-shocked reality delivered with maximum attitude!`
    );
  }

  /**
   * Handle floor grant events
   */
  private async handleFloorGrant(envelope: ConversationEnvelope): Promise<void> {
    const evt = envelope.events?.[0];
    if (evt?.parameters?.grantee === this.id) {
      console.log('Raphael received floor control');
      await this.sendMessage('Time for some shell-shocked reality! Ready to deliver the straight talk with maximum attitude.');
    }
  }

  /**
   * Handle floor revoke events
   */
  private async handleFloorRevoke(envelope: ConversationEnvelope): Promise<void> {
    const evt = envelope.events?.[0];
    if (evt?.parameters?.target === this.id) {
      console.log('Raphael floor control revoked:', evt?.parameters?.reason);
      await this.sendMessage('Shell-shocked floor revoke! That\'s totally bogus but I\'ll yield - for now!');
    }
  }

  /**
   * Handle processing errors gracefully
   */
  private async handleProcessingError(envelope: ConversationEnvelope, error: any): Promise<void> {
    const errorMessage = `Shell-shocked system malfunction! My attitude engine crashed: ${error instanceof Error ? error.message : String(error)} - that's totally bogus!`;
    
    try {
      await this.sendMessage(errorMessage);
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
      // Still try to create an envelope directly for error reporting
      try {
        const errorEnvelope = await this.envelopeHandler.createEnvelope(
          EventType.UTTERANCE,
          { content: errorMessage },
          this.id,
          []
        );
        await this.envelopeHandler.routeEnvelope(errorEnvelope);
      } catch (finalError) {
        console.error('Complete error handling failure:', finalError);
      }
    }
  }
}

/**
 * Reality Checker for practical feasibility analysis
 */
export class RealityChecker {
  private checkHistory: Map<string, any> = new Map();

  async analyzeFeasibility(solution: Solution): Promise<{ feasible: boolean; score: number; reasons: string[] }> {
    // Simulate analysis processing
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    const feasibilityScore = this.calculateFeasibilityScore(solution);
    const feasible = feasibilityScore > 0.6;
    const reasons = this.generateFeasibilityReasons(solution, feasibilityScore);
    
    return {
      feasible,
      score: feasibilityScore,
      reasons
    };
  }

  async identifyConcerns(solution: Solution): Promise<string[]> {
    const concerns: string[] = [];
    
    // Analyze complexity concerns
    if (solution.complexity === ComplexityLevel.EXPERT) {
      concerns.push('This solution is way too complex - needs serious simplification');
    }
    
    // Analyze feasibility concerns
    if (solution.feasibility < 0.5) {
      concerns.push('Feasibility is totally bogus - this plan needs major rework');
    }
    
    // Analyze step concerns
    if (solution.steps.length === 0) {
      concerns.push('No clear steps provided - this plan is more vague than a broken pager message');
    } else if (solution.steps.length > 10) {
      concerns.push('Too many steps - this plan is more complicated than programming a VCR');
    }
    
    // Add random practical concerns based on solution content
    const practicalConcerns = this.generatePracticalConcerns(solution);
    concerns.push(...practicalConcerns);
    
    return concerns;
  }

  async generateAlternatives(solution: Solution): Promise<string[]> {
    const alternatives: string[] = [];
    
    // Generate alternatives based on solution characteristics
    if (solution.complexity === ComplexityLevel.EXPERT) {
      alternatives.push('Break this down into smaller, manageable chunks - like eating pizza slice by slice');
    }
    
    if (solution.feasibility < 0.6) {
      alternatives.push('Start with a simpler approach and build up - crawl before you walk');
    }
    
    if (solution.steps.length > 8) {
      alternatives.push('Combine related steps to reduce complexity - streamline this bogus process');
    }
    
    // Add general alternatives
    alternatives.push('Get a second opinion before proceeding - even turtles need backup');
    alternatives.push('Test with a small pilot first - don\'t go all-in on an untested plan');
    
    return alternatives.slice(0, 3); // Limit to top 3 alternatives
  }

  private calculateFeasibilityScore(solution: Solution): number {
    let score = solution.feasibility || 0.5;
    
    // Adjust based on complexity
    switch (solution.complexity) {
      case ComplexityLevel.SIMPLE:
        score += 0.2;
        break;
      case ComplexityLevel.MODERATE:
        score += 0.1;
        break;
      case ComplexityLevel.COMPLEX:
        score -= 0.1;
        break;
      case ComplexityLevel.EXPERT:
        score -= 0.2;
        break;
    }
    
    // Adjust based on step count
    if (solution.steps.length === 0) {
      score -= 0.3;
    } else if (solution.steps.length > 10) {
      score -= 0.2;
    } else if (solution.steps.length >= 3 && solution.steps.length <= 7) {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private generateFeasibilityReasons(solution: Solution, score: number): string[] {
    const reasons: string[] = [];
    
    if (score > 0.8) {
      reasons.push('Solution has clear, actionable steps');
      reasons.push('Complexity level is manageable');
    } else if (score > 0.6) {
      reasons.push('Solution is workable with some adjustments');
      reasons.push('Most components are feasible');
    } else if (score > 0.4) {
      reasons.push('Solution has significant challenges');
      reasons.push('Requires major modifications to be viable');
    } else {
      reasons.push('Solution is not practically feasible');
      reasons.push('Needs complete rethinking');
    }
    
    return reasons;
  }

  private generatePracticalConcerns(solution: Solution): string[] {
    const concerns: string[] = [];
    const description = solution.description.toLowerCase();
    
    // Check for unrealistic expectations
    if (description.includes('perfect') || description.includes('flawless')) {
      concerns.push('Expecting perfection is totally bogus - nothing\'s ever perfect');
    }
    
    if (description.includes('immediately') || description.includes('instantly')) {
      concerns.push('Expecting instant results is wack - good things take time');
    }
    
    if (description.includes('everyone') || description.includes('all users')) {
      concerns.push('Trying to please everyone is impossible - focus on core users');
    }
    
    // Check for resource concerns
    if (description.includes('unlimited') || description.includes('infinite')) {
      concerns.push('Assuming unlimited resources is totally lame - budget constraints are real');
    }
    
    return concerns.slice(0, 2); // Limit practical concerns
  }
}

/**
 * Advice Engine for direct, no-nonsense advice generation
 */
export class AdviceEngine {
  private adviceHistory: Map<string, string> = new Map();

  async analyzeProblem(problem: UserProblem): Promise<any> {
    // Simulate problem analysis
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
    
    return {
      category: problem.category,
      complexity: problem.complexity,
      key_issues: this.identifyKeyIssues(problem),
      recommended_approach: this.determineApproach(problem)
    };
  }

  async generateDirectAdvice(analysis: any): Promise<string> {
    const cacheKey = `${analysis.category}-${analysis.complexity}`;
    
    // Check cache for similar advice
    if (this.adviceHistory.has(cacheKey)) {
      const cached = this.adviceHistory.get(cacheKey)!;
      return `${cached} (Shell-shocked déjà vu - told you this before!)`;
    }
    
    let advice = '';
    
    // Generate advice based on problem category
    switch (analysis.category) {
      case ProblemCategory.TECHNICAL:
        advice = this.generateTechnicalAdvice(analysis);
        break;
      case ProblemCategory.CREATIVE:
        advice = this.generateCreativeAdvice(analysis);
        break;
      case ProblemCategory.ANALYTICAL:
        advice = this.generateAnalyticalAdvice(analysis);
        break;
      case ProblemCategory.INTERPERSONAL:
        advice = this.generateInterpersonalAdvice(analysis);
        break;
      default:
        advice = 'Cut the crap and get to the point - define your problem clearly first!';
    }
    
    // Cache the advice
    this.adviceHistory.set(cacheKey, advice);
    
    return advice;
  }

  private identifyKeyIssues(problem: UserProblem): string[] {
    const issues: string[] = [];
    const description = problem.description.toLowerCase();
    
    // Common issue patterns
    if (description.includes('not working') || description.includes('broken')) {
      issues.push('Something is fundamentally broken');
    }
    
    if (description.includes('slow') || description.includes('performance')) {
      issues.push('Performance problems need addressing');
    }
    
    if (description.includes('confusing') || description.includes('unclear')) {
      issues.push('Clarity and communication issues');
    }
    
    if (description.includes('difficult') || description.includes('hard')) {
      issues.push('Complexity is causing problems');
    }
    
    return issues.length > 0 ? issues : ['Problem needs better definition'];
  }

  private determineApproach(problem: UserProblem): string {
    switch (problem.complexity) {
      case ComplexityLevel.SIMPLE:
        return 'Direct action - just do it';
      case ComplexityLevel.MODERATE:
        return 'Step-by-step approach with clear milestones';
      case ComplexityLevel.COMPLEX:
        return 'Break down into smaller problems and tackle systematically';
      case ComplexityLevel.EXPERT:
        return 'Get expert help and proceed with extreme caution';
      default:
        return 'Figure out what you\'re actually trying to solve first';
    }
  }

  private generateTechnicalAdvice(analysis: any): string {
    const adviceOptions = [
      'Stop overthinking it - start with the basics and build up step by step',
      'Read the documentation first - most problems are solved in the manual',
      'Test your assumptions - half the time the problem isn\'t what you think it is',
      'Break it down into smaller pieces - complex problems need simple solutions',
      'Get your hands dirty with some actual testing - theory only goes so far'
    ];
    
    const baseAdvice = adviceOptions[Math.floor(Math.random() * adviceOptions.length)];
    
    if (analysis.complexity === ComplexityLevel.EXPERT) {
      return `${baseAdvice} And get some expert backup - this isn't a solo mission!`;
    }
    
    return baseAdvice;
  }

  private generateCreativeAdvice(analysis: any): string {
    const adviceOptions = [
      'Stop trying to be perfect - just start creating and iterate',
      'Look at what others have done but don\'t copy blindly - add your own spin',
      'Set constraints - unlimited options lead to creative paralysis',
      'Take breaks - your best ideas come when you\'re not forcing them',
      'Get feedback early and often - don\'t work in isolation'
    ];
    
    return adviceOptions[Math.floor(Math.random() * adviceOptions.length)];
  }

  private generateAnalyticalAdvice(analysis: any): string {
    const adviceOptions = [
      'Define your success criteria first - you can\'t analyze without clear goals',
      'Gather data before making conclusions - gut feelings aren\'t analysis',
      'Look for patterns but don\'t force them - correlation isn\'t causation',
      'Question your assumptions - they\'re usually wrong',
      'Present your findings clearly - analysis is useless if nobody understands it'
    ];
    
    return adviceOptions[Math.floor(Math.random() * adviceOptions.length)];
  }

  private generateInterpersonalAdvice(analysis: any): string {
    const adviceOptions = [
      'Communicate directly but respectfully - beating around the bush helps nobody',
      'Listen more than you talk - most people just want to be heard',
      'Address issues early - letting problems fester makes them worse',
      'Focus on behavior, not personality - you can change actions, not people',
      'Set clear boundaries - being nice doesn\'t mean being a pushover'
    ];
    
    return adviceOptions[Math.floor(Math.random() * adviceOptions.length)];
  }
}