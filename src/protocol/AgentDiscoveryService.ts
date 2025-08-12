/**
 * AgentDiscoveryService - Manages agent discovery and capability matching
 * Handles manifest publishing, retrieval, and capability-based agent assignment
 */

import { ConversationEnvelopeHandler } from './ConversationEnvelopeHandler';
import { OpenFloorAdapter, OFPAgentManifest } from './OpenFloorAdapter';
import { SquadAgentManifest, ProblemCategory, ExpertiseArea, CollaborationPattern } from '../utils/types';

export interface CapabilityFilter {
  expertise?: ExpertiseArea[];
  capabilities?: string[];
  personality?: string[];
  minAuthenticityLevel?: number;
}

export interface ProblemType {
  category: ProblemCategory;
  keywords: string[];
  complexity: string;
  requiredCapabilities: string[];
}

export interface DynamicAgentRegistrationConfig {
  allowDuplicateExpertise: boolean;
  requireMinimumAuthenticity: number;
  maxAgentsPerExpertise: number;
  validatePersonalityConsistency: boolean;
}

export interface AgentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  compatibilityScore: number;
}

export class AgentDiscoveryService {
  private agentRegistry: Map<string, SquadAgentManifest> = new Map();
  private ofpManifestRegistry: Map<string, OFPAgentManifest> = new Map();
  private capabilityIndex: Map<string, Set<string>> = new Map(); // capability -> agent IDs
  private expertiseIndex: Map<ExpertiseArea, Set<string>> = new Map(); // expertise -> agent IDs
  private envelopeHandler: ConversationEnvelopeHandler;
  private registrationConfig: DynamicAgentRegistrationConfig;
  private registrationCallbacks: Map<string, (agentId: string, manifest: SquadAgentManifest) => void> = new Map();
  private adapter: OpenFloorAdapter;

  constructor(
    envelopeHandler: ConversationEnvelopeHandler,
    registrationConfig: Partial<DynamicAgentRegistrationConfig> = {}
  ) {
    this.envelopeHandler = envelopeHandler;
    this.adapter = OpenFloorAdapter.getInstance();
    this.registrationConfig = {
      allowDuplicateExpertise: true,
      requireMinimumAuthenticity: 5,
      maxAgentsPerExpertise: 5,
      validatePersonalityConsistency: true,
      ...registrationConfig
    };
    this.initializeIndexes();
  }

  /**
   * Publishes an agent manifest to the registry
   */
  async publishManifest(agentId: string, manifest: SquadAgentManifest): Promise<void> {
    if (!agentId) {
      throw new Error('Agent ID is required for manifest publishing');
    }

    if (!manifest) {
      throw new Error('Manifest is required for publishing');
    }

    // Validate manifest structure
    if (!this.validateManifest(manifest)) {
      throw new Error('Invalid manifest structure');
    }

    // Store manifest
    this.agentRegistry.set(agentId, manifest);

    // Update capability index
    this.updateCapabilityIndex(agentId, manifest);

    // Update expertise index
    this.updateExpertiseIndex(agentId, manifest);

    // Create and send publish envelope
    const envelope = await this.envelopeHandler.createManifestPublishEnvelope(agentId, manifest);
    await this.envelopeHandler.routeEnvelope(envelope);
  }

  /**
   * Publishes an Open Floor Protocol compliant manifest
   */
  async publishOFPManifest(agentId: string, ofpManifest: OFPAgentManifest): Promise<void> {
    if (!agentId) {
      throw new Error('Agent ID is required for OFP manifest publishing');
    }

    if (!ofpManifest) {
      throw new Error('OFP Manifest is required for publishing');
    }

    // Validate OFP manifest structure
    if (!this.adapter.validateManifest(ofpManifest)) {
      throw new Error('Invalid OFP manifest structure');
    }

    // Store OFP manifest
    this.ofpManifestRegistry.set(agentId, ofpManifest);

    console.log(`✅ OFP Manifest registered for ${agentId}: ${ofpManifest.identification.conversationalName}`);
  }

  /**
   * Dynamically registers a new agent with comprehensive validation
   */
  async registerNewAgent(agentId: string, manifest: SquadAgentManifest): Promise<AgentValidationResult> {
    // Perform comprehensive validation
    const validationResult = await this.validateNewAgentManifest(agentId, manifest);
    
    if (!validationResult.isValid) {
      return validationResult;
    }

    // Check if agent already exists
    if (this.agentRegistry.has(agentId)) {
      return {
        isValid: false,
        errors: [`Agent with ID '${agentId}' already exists`],
        warnings: [],
        compatibilityScore: 0
      };
    }

    try {
      // Register the agent
      await this.publishManifest(agentId, manifest);
      
      // Notify registration callbacks
      for (const callback of this.registrationCallbacks.values()) {
        try {
          callback(agentId, manifest);
        } catch (error) {
          console.warn(`Registration callback failed for agent ${agentId}:`, error);
        }
      }

      return {
        isValid: true,
        errors: [],
        warnings: validationResult.warnings,
        compatibilityScore: validationResult.compatibilityScore
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to register agent: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        compatibilityScore: 0
      };
    }
  }

  /**
   * Validates a new agent manifest for dynamic registration
   */
  async validateNewAgentManifest(agentId: string, manifest: SquadAgentManifest): Promise<AgentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let compatibilityScore = 100;

    // Basic manifest validation
    if (!this.validateManifest(manifest)) {
      errors.push('Invalid manifest structure - missing required fields');
      return { isValid: false, errors, warnings, compatibilityScore: 0 };
    }

    // Agent ID consistency check
    if (manifest.id !== agentId) {
      errors.push(`Manifest ID '${manifest.id}' does not match provided agent ID '${agentId}'`);
    }

    // Authenticity level validation
    if (manifest.nineties_authenticity_level < this.registrationConfig.requireMinimumAuthenticity) {
      errors.push(`90s authenticity level ${manifest.nineties_authenticity_level} is below minimum required ${this.registrationConfig.requireMinimumAuthenticity}`);
    }

    // Expertise area validation
    const existingExpertiseAgents = this.expertiseIndex.get(manifest.personality.expertise_area);
    if (existingExpertiseAgents && existingExpertiseAgents.size >= this.registrationConfig.maxAgentsPerExpertise) {
      if (!this.registrationConfig.allowDuplicateExpertise) {
        errors.push(`Maximum number of agents (${this.registrationConfig.maxAgentsPerExpertise}) already registered for expertise area '${manifest.personality.expertise_area}'`);
      } else {
        warnings.push(`Multiple agents registered for expertise area '${manifest.personality.expertise_area}' - may cause coordination conflicts`);
        compatibilityScore -= 20;
      }
    }

    // Personality consistency validation
    if (this.registrationConfig.validatePersonalityConsistency) {
      const personalityValidation = this.validatePersonalityConsistency(manifest);
      errors.push(...personalityValidation.errors);
      warnings.push(...personalityValidation.warnings);
      compatibilityScore -= personalityValidation.scorePenalty;
    }

    // Capability overlap validation
    const capabilityValidation = this.validateCapabilityOverlap(manifest);
    warnings.push(...capabilityValidation.warnings);
    compatibilityScore -= capabilityValidation.scorePenalty;

    // Collaboration pattern validation
    const collaborationValidation = this.validateCollaborationPatterns(manifest);
    if (collaborationValidation.errors.length > 0) {
      errors.push(...collaborationValidation.errors);
    }
    warnings.push(...collaborationValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      compatibilityScore: Math.max(0, compatibilityScore)
    };
  }

  /**
   * Registers a callback to be notified when new agents are registered
   */
  onAgentRegistered(callbackId: string, callback: (agentId: string, manifest: SquadAgentManifest) => void): void {
    this.registrationCallbacks.set(callbackId, callback);
  }

  /**
   * Removes a registration callback
   */
  removeRegistrationCallback(callbackId: string): void {
    this.registrationCallbacks.delete(callbackId);
  }

  /**
   * Retrieves manifests based on optional filter criteria
   */
  async getManifests(filter?: CapabilityFilter): Promise<SquadAgentManifest[]> {
    let manifests = Array.from(this.agentRegistry.values());

    if (filter) {
      manifests = this.applyFilter(manifests, filter);
    }

    return manifests;
  }

  /**
   * Discovers agents capable of handling a specific problem type
   */
  async discoverCapabilities(problemType: ProblemType): Promise<string[]> {
    const candidateAgents = new Set<string>();

    // Find agents by expertise area
    const expertiseAgents = this.expertiseIndex.get(this.mapCategoryToExpertise(problemType.category));
    if (expertiseAgents) {
      expertiseAgents.forEach(agentId => candidateAgents.add(agentId));
    }

    // Find agents by required capabilities
    for (const capability of problemType.requiredCapabilities) {
      const capabilityAgents = this.capabilityIndex.get(capability);
      if (capabilityAgents) {
        capabilityAgents.forEach(agentId => candidateAgents.add(agentId));
      }
    }

    // Find agents by keyword matching
    const keywordAgents = this.findAgentsByKeywords(problemType.keywords);
    keywordAgents.forEach(agentId => candidateAgents.add(agentId));

    // Convert to array and sort by capability match score
    const agentIds = Array.from(candidateAgents);
    return this.sortByCapabilityMatch(agentIds, problemType);
  }

  /**
   * Matches capabilities between a problem and available agent manifests
   */
  private matchCapabilities(problem: ProblemType, manifests: SquadAgentManifest[]): string[] {
    const matches: Array<{ agentId: string; score: number }> = [];

    for (const manifest of manifests) {
      const score = this.calculateMatchScore(problem, manifest);
      if (score > 0) {
        matches.push({ agentId: manifest.id, score });
      }
    }

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);
    
    return matches.map(match => match.agentId);
  }

  /**
   * Gets a specific agent manifest by ID
   */
  getAgentManifest(agentId: string): SquadAgentManifest | undefined {
    return this.agentRegistry.get(agentId);
  }

  /**
   * Removes an agent from the registry
   */
  async unregisterAgent(agentId: string): Promise<void> {
    const manifest = this.agentRegistry.get(agentId);
    if (!manifest) {
      return; // Agent not registered
    }

    // Remove from registry
    this.agentRegistry.delete(agentId);

    // Remove from capability index
    for (const capability of manifest.capabilities) {
      const agentSet = this.capabilityIndex.get(capability);
      if (agentSet) {
        agentSet.delete(agentId);
        if (agentSet.size === 0) {
          this.capabilityIndex.delete(capability);
        }
      }
    }

    // Remove from expertise index
    const expertiseSet = this.expertiseIndex.get(manifest.personality.expertise_area);
    if (expertiseSet) {
      expertiseSet.delete(agentId);
      if (expertiseSet.size === 0) {
        this.expertiseIndex.delete(manifest.personality.expertise_area);
      }
    }
  }

  /**
   * Gets registry statistics
   */
  getRegistryStats(): {
    totalAgents: number;
    capabilitiesCount: number;
    expertiseAreas: ExpertiseArea[];
    averageAuthenticityLevel: number;
  } {
    const manifests = Array.from(this.agentRegistry.values());
    
    // Only return expertise areas that have agents
    const activeExpertiseAreas = Array.from(this.expertiseIndex.entries())
      .filter(([_, agentSet]) => agentSet.size > 0)
      .map(([expertise, _]) => expertise);
    
    return {
      totalAgents: manifests.length,
      capabilitiesCount: this.capabilityIndex.size,
      expertiseAreas: activeExpertiseAreas,
      averageAuthenticityLevel: manifests.length > 0 
        ? manifests.reduce((sum, m) => sum + m.nineties_authenticity_level, 0) / manifests.length
        : 0
    };
  }

  /**
   * Finds the best agent for a specific task
   */
  async findBestAgentForTask(
    taskDescription: string,
    requiredCapabilities: string[],
    preferredExpertise?: ExpertiseArea
  ): Promise<string | null> {
    const problemType: ProblemType = {
      category: this.inferCategoryFromDescription(taskDescription),
      keywords: this.extractKeywords(taskDescription),
      complexity: 'moderate', // Default complexity
      requiredCapabilities
    };

    const candidates = await this.discoverCapabilities(problemType);
    
    // Filter candidates to only those that actually have the required capabilities
    const qualifiedCandidates = candidates.filter(agentId => {
      const manifest = this.agentRegistry.get(agentId);
      if (!manifest) return false;
      
      // Check if agent has at least one required capability
      if (requiredCapabilities.length > 0) {
        const hasRequiredCapability = requiredCapabilities.some(cap =>
          manifest.capabilities.includes(cap)
        );
        if (!hasRequiredCapability) return false;
      }
      
      return true;
    });
    
    if (qualifiedCandidates.length === 0) {
      return null;
    }

    // If preferred expertise is specified, prioritize those agents
    if (preferredExpertise) {
      const expertiseAgents = qualifiedCandidates.filter(agentId => {
        const manifest = this.agentRegistry.get(agentId);
        return manifest?.personality.expertise_area === preferredExpertise;
      });
      
      if (expertiseAgents.length > 0) {
        return expertiseAgents[0];
      }
    }

    return qualifiedCandidates[0]; // Return best match
  }

  /**
   * Validates manifest structure and required fields
   */
  private validateManifest(manifest: SquadAgentManifest): boolean {
    return !!(
      manifest.id &&
      manifest.name &&
      manifest.version &&
      manifest.capabilities &&
      Array.isArray(manifest.capabilities) &&
      manifest.personality &&
      manifest.personality.expertise_area &&
      manifest.personality.catchphrases &&
      Array.isArray(manifest.personality.catchphrases) &&
      manifest.collaboration_patterns &&
      Array.isArray(manifest.collaboration_patterns) &&
      typeof manifest.nineties_authenticity_level === 'number' &&
      manifest.nineties_authenticity_level >= 0 &&
      manifest.nineties_authenticity_level <= 10
    );
  }

  /**
   * Updates capability index when manifest is published
   */
  private updateCapabilityIndex(agentId: string, manifest: SquadAgentManifest): void {
    for (const capability of manifest.capabilities) {
      if (!this.capabilityIndex.has(capability)) {
        this.capabilityIndex.set(capability, new Set());
      }
      this.capabilityIndex.get(capability)!.add(agentId);
    }
  }

  /**
   * Updates expertise index when manifest is published
   */
  private updateExpertiseIndex(agentId: string, manifest: SquadAgentManifest): void {
    const expertise = manifest.personality.expertise_area;
    if (!this.expertiseIndex.has(expertise)) {
      this.expertiseIndex.set(expertise, new Set());
    }
    this.expertiseIndex.get(expertise)!.add(agentId);
  }

  /**
   * Applies filter criteria to manifest list
   */
  private applyFilter(manifests: SquadAgentManifest[], filter: CapabilityFilter): SquadAgentManifest[] {
    return manifests.filter(manifest => {
      // Filter by expertise
      if (filter.expertise && !filter.expertise.includes(manifest.personality.expertise_area)) {
        return false;
      }

      // Filter by capabilities
      if (filter.capabilities) {
        const hasRequiredCapabilities = filter.capabilities.some(cap => 
          manifest.capabilities.includes(cap)
        );
        if (!hasRequiredCapabilities) {
          return false;
        }
      }

      // Filter by personality traits
      if (filter.personality) {
        const hasPersonalityTraits = filter.personality.some(trait =>
          manifest.personality.catchphrases.some(phrase => 
            phrase.toLowerCase().includes(trait.toLowerCase())
          )
        );
        if (!hasPersonalityTraits) {
          return false;
        }
      }

      // Filter by authenticity level
      if (filter.minAuthenticityLevel && 
          manifest.nineties_authenticity_level < filter.minAuthenticityLevel) {
        return false;
      }

      return true;
    });
  }

  /**
   * Finds agents by keyword matching in their capabilities and personality
   */
  private findAgentsByKeywords(keywords: string[]): string[] {
    const matchingAgents = new Set<string>();

    for (const [agentId, manifest] of this.agentRegistry) {
      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();
        
        // Check capabilities
        const hasCapabilityMatch = manifest.capabilities.some(cap =>
          cap.toLowerCase().includes(keywordLower)
        );

        // Check personality catchphrases
        const hasCatchphraseMatch = manifest.personality.catchphrases.some(phrase =>
          phrase.toLowerCase().includes(keywordLower)
        );

        // Check 90s references
        const hasReferenceMatch = manifest.personality.nineties_references.some(ref =>
          ref.toLowerCase().includes(keywordLower)
        );

        if (hasCapabilityMatch || hasCatchphraseMatch || hasReferenceMatch) {
          matchingAgents.add(agentId);
          break; // Found a match, no need to check other keywords for this agent
        }
      }
    }

    return Array.from(matchingAgents);
  }

  /**
   * Sorts agent IDs by their capability match score for a given problem
   */
  private sortByCapabilityMatch(agentIds: string[], problemType: ProblemType): string[] {
    const scores = agentIds.map(agentId => {
      const manifest = this.agentRegistry.get(agentId);
      if (!manifest) return { agentId, score: 0 };
      
      const score = this.calculateMatchScore(problemType, manifest);
      return { agentId, score };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores.map(item => item.agentId);
  }

  /**
   * Calculates match score between a problem and an agent manifest
   */
  private calculateMatchScore(problem: ProblemType, manifest: SquadAgentManifest): number {
    let score = 0;

    // Expertise area match (high weight)
    if (manifest.personality.expertise_area === this.mapCategoryToExpertise(problem.category)) {
      score += 50;
    }

    // Required capabilities match (high weight)
    const capabilityMatches = problem.requiredCapabilities.filter(cap =>
      manifest.capabilities.includes(cap)
    ).length;
    score += capabilityMatches * 20;

    // Keyword matches (medium weight)
    const keywordMatches = problem.keywords.filter(keyword =>
      manifest.capabilities.some(cap => cap.toLowerCase().includes(keyword.toLowerCase())) ||
      manifest.personality.catchphrases.some(phrase => phrase.toLowerCase().includes(keyword.toLowerCase()))
    ).length;
    score += keywordMatches * 10;

    // Authenticity level bonus (low weight)
    score += manifest.nineties_authenticity_level;

    return score;
  }

  /**
   * Maps problem category to expertise area
   */
  private mapCategoryToExpertise(category: ProblemCategory): ExpertiseArea {
    switch (category) {
      case ProblemCategory.TECHNICAL:
        return ExpertiseArea.TECHNICAL;
      case ProblemCategory.CREATIVE:
        return ExpertiseArea.ENGAGEMENT;
      case ProblemCategory.ANALYTICAL:
        return ExpertiseArea.TECHNICAL;
      case ProblemCategory.INTERPERSONAL:
        return ExpertiseArea.ATTITUDE;
      default:
        return ExpertiseArea.LEADERSHIP;
    }
  }

  /**
   * Infers problem category from task description
   */
  private inferCategoryFromDescription(description: string): ProblemCategory {
    const descLower = description.toLowerCase();
    
    if (descLower.includes('code') || descLower.includes('technical') || descLower.includes('debug')) {
      return ProblemCategory.TECHNICAL;
    }
    if (descLower.includes('creative') || descLower.includes('design') || descLower.includes('fun')) {
      return ProblemCategory.CREATIVE;
    }
    if (descLower.includes('analyze') || descLower.includes('research') || descLower.includes('data')) {
      return ProblemCategory.ANALYTICAL;
    }
    if (descLower.includes('people') || descLower.includes('team') || descLower.includes('communication')) {
      return ProblemCategory.INTERPERSONAL;
    }
    
    return ProblemCategory.TECHNICAL; // Default
  }

  /**
   * Extracts keywords from task description
   */
  private extractKeywords(description: string): string[] {
    // Simple keyword extraction - split by spaces and filter common words
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    return description
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .slice(0, 10); // Limit to first 10 keywords
  }

  /**
   * Validates personality consistency for new agents
   */
  private validatePersonalityConsistency(manifest: SquadAgentManifest): {
    errors: string[];
    warnings: string[];
    scorePenalty: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let scorePenalty = 0;

    // Check catchphrase authenticity
    if (manifest.personality.catchphrases.length === 0) {
      errors.push('Agent must have at least one catchphrase');
    }

    // Check 90s references
    if (manifest.personality.nineties_references.length === 0) {
      warnings.push('Agent has no 90s references - may not fit squad theme');
      scorePenalty += 10;
    }

    // Check for inappropriate content
    const allText = [
      ...manifest.personality.catchphrases,
      ...manifest.personality.nineties_references,
      manifest.name,
      manifest.description
    ].join(' ').toLowerCase();

    const inappropriateTerms = ['hate', 'violence', 'offensive'];
    for (const term of inappropriateTerms) {
      if (allText.includes(term)) {
        errors.push(`Agent content contains inappropriate term: ${term}`);
      }
    }

    return { errors, warnings, scorePenalty };
  }

  /**
   * Validates capability overlap with existing agents
   */
  private validateCapabilityOverlap(manifest: SquadAgentManifest): {
    warnings: string[];
    scorePenalty: number;
  } {
    const warnings: string[] = [];
    let scorePenalty = 0;

    // Check for exact capability duplicates
    const duplicateCapabilities: string[] = [];
    for (const capability of manifest.capabilities) {
      const existingAgents = this.capabilityIndex.get(capability);
      if (existingAgents && existingAgents.size > 0) {
        duplicateCapabilities.push(capability);
      }
    }

    if (duplicateCapabilities.length > 0) {
      warnings.push(`Agent has overlapping capabilities with existing agents: ${duplicateCapabilities.join(', ')}`);
      scorePenalty += duplicateCapabilities.length * 5;
    }

    // Check for unique value proposition
    const uniqueCapabilities = manifest.capabilities.filter(cap => 
      !this.capabilityIndex.has(cap) || this.capabilityIndex.get(cap)!.size === 0
    );

    if (uniqueCapabilities.length === 0) {
      warnings.push('Agent provides no unique capabilities - consider specialization');
      scorePenalty += 15;
    }

    return { warnings, scorePenalty };
  }

  /**
   * Validates collaboration patterns
   */
  private validateCollaborationPatterns(manifest: SquadAgentManifest): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!manifest.collaboration_patterns || manifest.collaboration_patterns.length === 0) {
      errors.push('Agent must support at least one collaboration pattern');
    }

    // Check for required patterns based on expertise
    const requiredPatterns = this.getRequiredCollaborationPatterns(manifest.personality.expertise_area);
    const missingPatterns = requiredPatterns.filter(pattern => 
      !manifest.collaboration_patterns.includes(pattern)
    );

    if (missingPatterns.length > 0) {
      warnings.push(`Agent missing recommended collaboration patterns for ${manifest.personality.expertise_area}: ${missingPatterns.join(', ')}`);
    }

    return { errors, warnings };
  }

  /**
   * Gets required collaboration patterns for an expertise area
   */
  private getRequiredCollaborationPatterns(expertise: ExpertiseArea): CollaborationPattern[] {
    switch (expertise) {
      case ExpertiseArea.LEADERSHIP:
        return [CollaborationPattern.ORCHESTRATION, CollaborationPattern.DELEGATION];
      case ExpertiseArea.TECHNICAL:
        return [CollaborationPattern.DELEGATION, CollaborationPattern.CHANNELING];
      case ExpertiseArea.ATTITUDE:
        return [CollaborationPattern.MEDIATION, CollaborationPattern.CHANNELING];
      case ExpertiseArea.ENGAGEMENT:
        return [CollaborationPattern.CHANNELING, CollaborationPattern.MEDIATION];
      default:
        return [CollaborationPattern.CHANNELING];
    }
  }

  /**
   * Initializes the capability and expertise indexes
   */
  private initializeIndexes(): void {
    // Initialize expertise index with all possible expertise areas
    for (const expertise of Object.values(ExpertiseArea)) {
      this.expertiseIndex.set(expertise, new Set());
    }
  }
}