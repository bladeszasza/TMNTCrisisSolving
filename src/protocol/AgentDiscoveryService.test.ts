/**
 * Unit tests for AgentDiscoveryService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentDiscoveryService, CapabilityFilter, ProblemType, DynamicAgentRegistrationConfig, AgentValidationResult } from './AgentDiscoveryService';
import { ConversationEnvelopeHandler } from './ConversationEnvelopeHandler';
import { SquadAgentManifest, ExpertiseArea, SpeakingStyle, CollaborationPattern, ProblemCategory } from '../utils/types';

describe('AgentDiscoveryService', () => {
  let discoveryService: AgentDiscoveryService;
  let envelopeHandler: ConversationEnvelopeHandler;

  const createMockManifest = (
    id: string,
    expertise: ExpertiseArea,
    capabilities: string[],
    authenticityLevel: number = 8
  ): SquadAgentManifest => ({
    id,
    name: `${id} Agent`,
    version: '1.0.0',
    capabilities,
    description: `Test agent for ${expertise}`,
    personality: {
      name: id,
      catchphrases: [`${id} catchphrase`, 'cowabunga'],
      speakingStyle: SpeakingStyle.LEADER,
      nineties_references: ['Game Gear', 'Tamagotchi'],
      expertise_area: expertise
    },
    collaboration_patterns: [CollaborationPattern.ORCHESTRATION],
    floor_management_capabilities: ['request', 'grant', 'yield'],
    nineties_authenticity_level: authenticityLevel
  });

  beforeEach(() => {
    envelopeHandler = new ConversationEnvelopeHandler();
    vi.spyOn(envelopeHandler, 'routeEnvelope').mockResolvedValue(undefined);
    
    discoveryService = new AgentDiscoveryService(envelopeHandler);
  });

  describe('publishManifest', () => {
    it('should publish a valid manifest successfully', async () => {
      const manifest = createMockManifest('leonardo', ExpertiseArea.LEADERSHIP, ['orchestration', 'coordination']);
      
      await discoveryService.publishManifest('leonardo', manifest);
      
      const retrievedManifest = discoveryService.getAgentManifest('leonardo');
      expect(retrievedManifest).toEqual(manifest);
      expect(envelopeHandler.routeEnvelope).toHaveBeenCalled();
    });

    it('should throw error when agent ID is missing', async () => {
      const manifest = createMockManifest('leonardo', ExpertiseArea.LEADERSHIP, ['orchestration']);
      
      await expect(
        discoveryService.publishManifest('', manifest)
      ).rejects.toThrow('Agent ID is required for manifest publishing');
    });

    it('should throw error when manifest is missing', async () => {
      await expect(
        discoveryService.publishManifest('leonardo', null as any)
      ).rejects.toThrow('Manifest is required for publishing');
    });

    it('should throw error for invalid manifest structure', async () => {
      const invalidManifest = {
        id: 'leonardo',
        // Missing required fields
      } as any;
      
      await expect(
        discoveryService.publishManifest('leonardo', invalidManifest)
      ).rejects.toThrow('Invalid manifest structure');
    });

    it('should update capability and expertise indexes', async () => {
      const manifest = createMockManifest('donatello', ExpertiseArea.TECHNICAL, ['research', 'analysis']);
      
      await discoveryService.publishManifest('donatello', manifest);
      
      const manifests = await discoveryService.getManifests({
        expertise: [ExpertiseArea.TECHNICAL]
      });
      
      expect(manifests).toHaveLength(1);
      expect(manifests[0].id).toBe('donatello');
    });
  });

  describe('getManifests', () => {
    beforeEach(async () => {
      // Publish test manifests
      await discoveryService.publishManifest(
        'leonardo',
        createMockManifest('leonardo', ExpertiseArea.LEADERSHIP, ['orchestration', 'coordination'], 9)
      );
      await discoveryService.publishManifest(
        'donatello',
        createMockManifest('donatello', ExpertiseArea.TECHNICAL, ['research', 'analysis'], 7)
      );
      await discoveryService.publishManifest(
        'raphael',
        createMockManifest('raphael', ExpertiseArea.ATTITUDE, ['reality_check', 'advice'], 8)
      );
    });

    it('should return all manifests when no filter is provided', async () => {
      const manifests = await discoveryService.getManifests();
      
      expect(manifests).toHaveLength(3);
      expect(manifests.map(m => m.id)).toContain('leonardo');
      expect(manifests.map(m => m.id)).toContain('donatello');
      expect(manifests.map(m => m.id)).toContain('raphael');
    });

    it('should filter by expertise area', async () => {
      const manifests = await discoveryService.getManifests({
        expertise: [ExpertiseArea.TECHNICAL]
      });
      
      expect(manifests).toHaveLength(1);
      expect(manifests[0].id).toBe('donatello');
    });

    it('should filter by capabilities', async () => {
      const manifests = await discoveryService.getManifests({
        capabilities: ['orchestration']
      });
      
      expect(manifests).toHaveLength(1);
      expect(manifests[0].id).toBe('leonardo');
    });

    it('should filter by minimum authenticity level', async () => {
      const manifests = await discoveryService.getManifests({
        minAuthenticityLevel: 8
      });
      
      expect(manifests).toHaveLength(2);
      expect(manifests.map(m => m.id)).toContain('leonardo');
      expect(manifests.map(m => m.id)).toContain('raphael');
      expect(manifests.map(m => m.id)).not.toContain('donatello');
    });

    it('should filter by personality traits', async () => {
      const manifests = await discoveryService.getManifests({
        personality: ['cowabunga']
      });
      
      expect(manifests).toHaveLength(3); // All have 'cowabunga' in catchphrases
    });

    it('should apply multiple filters', async () => {
      const manifests = await discoveryService.getManifests({
        expertise: [ExpertiseArea.LEADERSHIP, ExpertiseArea.ATTITUDE],
        minAuthenticityLevel: 8
      });
      
      expect(manifests).toHaveLength(2);
      expect(manifests.map(m => m.id)).toContain('leonardo');
      expect(manifests.map(m => m.id)).toContain('raphael');
    });
  });

  describe('discoverCapabilities', () => {
    beforeEach(async () => {
      await discoveryService.publishManifest(
        'leonardo',
        createMockManifest('leonardo', ExpertiseArea.LEADERSHIP, ['orchestration', 'coordination'])
      );
      await discoveryService.publishManifest(
        'donatello',
        createMockManifest('donatello', ExpertiseArea.TECHNICAL, ['research', 'analysis', 'debugging'])
      );
      await discoveryService.publishManifest(
        'raphael',
        createMockManifest('raphael', ExpertiseArea.ATTITUDE, ['reality_check', 'advice'])
      );
    });

    it('should discover agents by problem category', async () => {
      const agentIds = await discoveryService.discoverCapabilities({
        category: ProblemCategory.TECHNICAL,
        keywords: [],
        complexity: 'moderate',
        requiredCapabilities: []
      });
      
      expect(agentIds).toContain('donatello');
    });

    it('should discover agents by required capabilities', async () => {
      const agentIds = await discoveryService.discoverCapabilities({
        category: ProblemCategory.TECHNICAL,
        keywords: [],
        complexity: 'moderate',
        requiredCapabilities: ['orchestration']
      });
      
      expect(agentIds).toContain('leonardo');
    });

    it('should discover agents by keywords', async () => {
      const agentIds = await discoveryService.discoverCapabilities({
        category: ProblemCategory.TECHNICAL,
        keywords: ['research'],
        complexity: 'moderate',
        requiredCapabilities: []
      });
      
      expect(agentIds).toContain('donatello');
    });

    it('should return agents sorted by capability match score', async () => {
      const agentIds = await discoveryService.discoverCapabilities({
        category: ProblemCategory.TECHNICAL,
        keywords: ['research', 'analysis'],
        complexity: 'moderate',
        requiredCapabilities: ['research']
      });
      
      // Donatello should be first due to better match
      expect(agentIds[0]).toBe('donatello');
    });
  });

  describe('findBestAgentForTask', () => {
    beforeEach(async () => {
      await discoveryService.publishManifest(
        'leonardo',
        createMockManifest('leonardo', ExpertiseArea.LEADERSHIP, ['orchestration', 'coordination'])
      );
      await discoveryService.publishManifest(
        'donatello',
        createMockManifest('donatello', ExpertiseArea.TECHNICAL, ['research', 'analysis'])
      );
    });

    it('should find best agent for technical task', async () => {
      const bestAgent = await discoveryService.findBestAgentForTask(
        'Need to research and analyze technical data',
        ['research'],
        ExpertiseArea.TECHNICAL
      );
      
      expect(bestAgent).toBe('donatello');
    });

    it('should find best agent for leadership task', async () => {
      const bestAgent = await discoveryService.findBestAgentForTask(
        'Need to coordinate team efforts',
        ['coordination'],
        ExpertiseArea.LEADERSHIP
      );
      
      expect(bestAgent).toBe('leonardo');
    });

    it('should return null when no suitable agent is found', async () => {
      const bestAgent = await discoveryService.findBestAgentForTask(
        'Need specialized capability that no agent has',
        ['nonexistent_capability']
      );
      
      expect(bestAgent).toBe(null);
    });

    it('should prioritize preferred expertise when specified', async () => {
      const bestAgent = await discoveryService.findBestAgentForTask(
        'Need leadership and coordination for team task',
        ['coordination'],
        ExpertiseArea.LEADERSHIP
      );
      
      expect(bestAgent).toBe('leonardo');
    });
  });

  describe('unregisterAgent', () => {
    beforeEach(async () => {
      await discoveryService.publishManifest(
        'leonardo',
        createMockManifest('leonardo', ExpertiseArea.LEADERSHIP, ['orchestration'])
      );
      await discoveryService.publishManifest(
        'donatello',
        createMockManifest('donatello', ExpertiseArea.TECHNICAL, ['research'])
      );
    });

    it('should remove agent from registry', async () => {
      await discoveryService.unregisterAgent('leonardo');
      
      const manifest = discoveryService.getAgentManifest('leonardo');
      expect(manifest).toBeUndefined();
    });

    it('should update indexes when agent is removed', async () => {
      await discoveryService.unregisterAgent('leonardo');
      
      const manifests = await discoveryService.getManifests({
        expertise: [ExpertiseArea.LEADERSHIP]
      });
      
      expect(manifests).toHaveLength(0);
    });

    it('should handle unregistering non-existent agent gracefully', async () => {
      await expect(
        discoveryService.unregisterAgent('nonexistent')
      ).resolves.not.toThrow();
    });
  });

  describe('getRegistryStats', () => {
    it('should return correct stats for empty registry', () => {
      const stats = discoveryService.getRegistryStats();
      
      expect(stats.totalAgents).toBe(0);
      expect(stats.capabilitiesCount).toBe(0);
      expect(stats.expertiseAreas).toEqual([]);
      expect(stats.averageAuthenticityLevel).toBe(0);
    });

    it('should return correct stats for populated registry', async () => {
      await discoveryService.publishManifest(
        'leonardo',
        createMockManifest('leonardo', ExpertiseArea.LEADERSHIP, ['orchestration'], 9)
      );
      await discoveryService.publishManifest(
        'donatello',
        createMockManifest('donatello', ExpertiseArea.TECHNICAL, ['research'], 7)
      );
      
      const stats = discoveryService.getRegistryStats();
      
      expect(stats.totalAgents).toBe(2);
      expect(stats.capabilitiesCount).toBe(2); // 'orchestration' and 'research'
      expect(stats.expertiseAreas).toContain(ExpertiseArea.LEADERSHIP);
      expect(stats.expertiseAreas).toContain(ExpertiseArea.TECHNICAL);
      expect(stats.averageAuthenticityLevel).toBe(8); // (9 + 7) / 2
    });
  });

  describe('manifest validation', () => {
    it('should reject manifest with missing required fields', async () => {
      const invalidManifest = {
        id: 'test',
        name: 'Test Agent',
        // Missing version, capabilities, personality, etc.
      } as any;
      
      await expect(
        discoveryService.publishManifest('test', invalidManifest)
      ).rejects.toThrow('Invalid manifest structure');
    });

    it('should reject manifest with invalid authenticity level', async () => {
      const invalidManifest = createMockManifest('test', ExpertiseArea.LEADERSHIP, ['test']);
      invalidManifest.nineties_authenticity_level = 15; // Invalid (should be 0-10)
      
      await expect(
        discoveryService.publishManifest('test', invalidManifest)
      ).rejects.toThrow('Invalid manifest structure');
    });

    it('should reject manifest with non-array capabilities', async () => {
      const invalidManifest = createMockManifest('test', ExpertiseArea.LEADERSHIP, ['test']);
      invalidManifest.capabilities = 'not an array' as any;
      
      await expect(
        discoveryService.publishManifest('test', invalidManifest)
      ).rejects.toThrow('Invalid manifest structure');
    });
  });

  describe('keyword extraction and matching', () => {
    beforeEach(async () => {
      const manifest = createMockManifest('donatello', ExpertiseArea.TECHNICAL, ['research', 'web_search']);
      manifest.personality.catchphrases = ['hack into the mainframe', 'cowabunga'];
      manifest.personality.nineties_references = ['Game Gear', 'Tamagotchi'];
      
      await discoveryService.publishManifest('donatello', manifest);
    });

    it('should match agents by capability keywords', async () => {
      const agentIds = await discoveryService.discoverCapabilities({
        category: ProblemCategory.TECHNICAL,
        keywords: ['research'],
        complexity: 'moderate',
        requiredCapabilities: []
      });
      
      expect(agentIds).toContain('donatello');
    });

    it('should match agents by catchphrase keywords', async () => {
      const agentIds = await discoveryService.discoverCapabilities({
        category: ProblemCategory.TECHNICAL,
        keywords: ['mainframe'],
        complexity: 'moderate',
        requiredCapabilities: []
      });
      
      expect(agentIds).toContain('donatello');
    });

    it('should match agents by 90s reference keywords', async () => {
      const agentIds = await discoveryService.discoverCapabilities({
        category: ProblemCategory.TECHNICAL,
        keywords: ['Game'],
        complexity: 'moderate',
        requiredCapabilities: []
      });
      
      expect(agentIds).toContain('donatello');
    });
  });
});

describe('Dynamic Agent Registration', () => {
  let discoveryService: AgentDiscoveryService;
  let envelopeHandler: ConversationEnvelopeHandler;

  const createMockManifest = (
    id: string,
    expertise: ExpertiseArea,
    capabilities: string[],
    authenticityLevel: number = 8
  ): SquadAgentManifest => ({
    id,
    name: `${id} Agent`,
    version: '1.0.0',
    capabilities,
    description: `Test agent for ${expertise}`,
    personality: {
      name: id,
      catchphrases: [`${id} catchphrase`, 'cowabunga'],
      speakingStyle: SpeakingStyle.LEADER,
      nineties_references: ['Game Gear', 'Tamagotchi'],
      expertise_area: expertise
    },
    collaboration_patterns: [CollaborationPattern.ORCHESTRATION],
    floor_management_capabilities: ['request', 'grant', 'yield'],
    nineties_authenticity_level: authenticityLevel
  });

  beforeEach(() => {
    envelopeHandler = new ConversationEnvelopeHandler();
    vi.spyOn(envelopeHandler, 'routeEnvelope').mockResolvedValue(undefined);
    
    const config: DynamicAgentRegistrationConfig = {
      allowDuplicateExpertise: false,
      requireMinimumAuthenticity: 6,
      maxAgentsPerExpertise: 2,
      validatePersonalityConsistency: true
    };
    
    discoveryService = new AgentDiscoveryService(envelopeHandler, config);
  });

  describe('registerNewAgent', () => {
    it('should successfully register a valid new agent', async () => {
      const manifest = createMockManifest('new-agent', ExpertiseArea.ENGAGEMENT, ['entertainment', 'fun'], 8);
      
      const result = await discoveryService.registerNewAgent('new-agent', manifest);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.compatibilityScore).toBeGreaterThan(0);
      
      const retrievedManifest = discoveryService.getAgentManifest('new-agent');
      expect(retrievedManifest).toEqual(manifest);
    });

    it('should reject agent with low authenticity level', async () => {
      const manifest = createMockManifest('low-auth', ExpertiseArea.ENGAGEMENT, ['entertainment'], 3);
      
      const result = await discoveryService.registerNewAgent('low-auth', manifest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('90s authenticity level 3 is below minimum required 6');
    });

    it('should reject agent with mismatched ID', async () => {
      const manifest = createMockManifest('wrong-id', ExpertiseArea.ENGAGEMENT, ['entertainment'], 8);
      
      const result = await discoveryService.registerNewAgent('correct-id', manifest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Manifest ID 'wrong-id' does not match provided agent ID 'correct-id'");
    });

    it('should reject duplicate agent registration', async () => {
      const manifest = createMockManifest('duplicate', ExpertiseArea.ENGAGEMENT, ['entertainment'], 8);
      
      // Register first time
      await discoveryService.registerNewAgent('duplicate', manifest);
      
      // Try to register again
      const result = await discoveryService.registerNewAgent('duplicate', manifest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Agent with ID 'duplicate' already exists");
    });

    it('should warn about duplicate expertise when not allowed', async () => {
      // Register first agent with leadership expertise
      const firstManifest = createMockManifest('leader1', ExpertiseArea.LEADERSHIP, ['coordination'], 8);
      await discoveryService.registerNewAgent('leader1', firstManifest);
      
      // Register second agent with same expertise
      const secondManifest = createMockManifest('leader2', ExpertiseArea.LEADERSHIP, ['orchestration'], 8);
      await discoveryService.registerNewAgent('leader2', secondManifest);
      
      // Try to register third agent (exceeds maxAgentsPerExpertise)
      const thirdManifest = createMockManifest('leader3', ExpertiseArea.LEADERSHIP, ['delegation'], 8);
      const result = await discoveryService.registerNewAgent('leader3', thirdManifest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Maximum number of agents (2) already registered for expertise area 'leadership'");
    });

    it('should validate personality consistency', async () => {
      const manifest = createMockManifest('no-catchphrases', ExpertiseArea.ENGAGEMENT, ['entertainment'], 8);
      manifest.personality.catchphrases = []; // No catchphrases
      
      const result = await discoveryService.registerNewAgent('no-catchphrases', manifest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Agent must have at least one catchphrase');
    });

    it('should warn about missing 90s references', async () => {
      const manifest = createMockManifest('no-refs', ExpertiseArea.ENGAGEMENT, ['entertainment'], 8);
      manifest.personality.nineties_references = []; // No 90s references
      
      const result = await discoveryService.registerNewAgent('no-refs', manifest);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Agent has no 90s references - may not fit squad theme');
      expect(result.compatibilityScore).toBeLessThan(100);
    });

    it('should validate collaboration patterns', async () => {
      const manifest = createMockManifest('no-patterns', ExpertiseArea.LEADERSHIP, ['coordination'], 8);
      manifest.collaboration_patterns = []; // No collaboration patterns
      
      const result = await discoveryService.registerNewAgent('no-patterns', manifest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Agent must support at least one collaboration pattern');
    });

    it('should warn about missing recommended collaboration patterns', async () => {
      const manifest = createMockManifest('missing-patterns', ExpertiseArea.LEADERSHIP, ['coordination'], 8);
      manifest.collaboration_patterns = [CollaborationPattern.CHANNELING]; // Missing orchestration and delegation
      
      const result = await discoveryService.registerNewAgent('missing-patterns', manifest);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('missing recommended collaboration patterns'))).toBe(true);
    });

    it('should warn about capability overlap', async () => {
      // Register first agent
      const firstManifest = createMockManifest('first', ExpertiseArea.TECHNICAL, ['research', 'analysis'], 8);
      await discoveryService.registerNewAgent('first', firstManifest);
      
      // Register second agent with overlapping capabilities
      const secondManifest = createMockManifest('second', ExpertiseArea.ENGAGEMENT, ['research', 'entertainment'], 8);
      const result = await discoveryService.registerNewAgent('second', secondManifest);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('overlapping capabilities'))).toBe(true);
      expect(result.compatibilityScore).toBeLessThan(100);
    });

    it('should warn about no unique capabilities', async () => {
      // Register first agent
      const firstManifest = createMockManifest('first', ExpertiseArea.TECHNICAL, ['research', 'analysis'], 8);
      await discoveryService.registerNewAgent('first', firstManifest);
      
      // Register second agent with identical capabilities
      const secondManifest = createMockManifest('second', ExpertiseArea.ENGAGEMENT, ['research', 'analysis'], 8);
      const result = await discoveryService.registerNewAgent('second', secondManifest);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('no unique capabilities'))).toBe(true);
      expect(result.compatibilityScore).toBeLessThan(85); // Should have significant penalty
    });
  });

  describe('validateNewAgentManifest', () => {
    it('should validate manifest structure', async () => {
      const invalidManifest = {
        id: 'invalid',
        // Missing required fields
      } as any;
      
      const result = await discoveryService.validateNewAgentManifest('invalid', invalidManifest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid manifest structure - missing required fields');
    });

    it('should check for inappropriate content', async () => {
      const manifest = createMockManifest('inappropriate', ExpertiseArea.ENGAGEMENT, ['entertainment'], 8);
      manifest.personality.catchphrases = ['I hate everything', 'cowabunga'];
      
      const result = await discoveryService.validateNewAgentManifest('inappropriate', manifest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('inappropriate term: hate'))).toBe(true);
    });
  });

  describe('registration callbacks', () => {
    it('should notify callbacks when agent is registered', async () => {
      const callback = vi.fn();
      discoveryService.onAgentRegistered('test-callback', callback);
      
      const manifest = createMockManifest('callback-test', ExpertiseArea.ENGAGEMENT, ['entertainment'], 8);
      await discoveryService.registerNewAgent('callback-test', manifest);
      
      expect(callback).toHaveBeenCalledWith('callback-test', manifest);
    });

    it('should handle callback errors gracefully', async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      
      discoveryService.onAgentRegistered('error-callback', errorCallback);
      
      const manifest = createMockManifest('error-test', ExpertiseArea.ENGAGEMENT, ['entertainment'], 8);
      
      // Should not throw despite callback error
      await expect(discoveryService.registerNewAgent('error-test', manifest)).resolves.not.toThrow();
    });

    it('should remove callbacks', () => {
      const callback = vi.fn();
      discoveryService.onAgentRegistered('removable', callback);
      discoveryService.removeRegistrationCallback('removable');
      
      // Callback should not be called after removal
      const manifest = createMockManifest('remove-test', ExpertiseArea.ENGAGEMENT, ['entertainment'], 8);
      discoveryService.registerNewAgent('remove-test', manifest);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('configuration options', () => {
    it('should allow duplicate expertise when configured', async () => {
      const config: DynamicAgentRegistrationConfig = {
        allowDuplicateExpertise: true,
        requireMinimumAuthenticity: 5,
        maxAgentsPerExpertise: 1,
        validatePersonalityConsistency: true
      };
      
      const service = new AgentDiscoveryService(envelopeHandler, config);
      
      // Register first agent
      const firstManifest = createMockManifest('first', ExpertiseArea.LEADERSHIP, ['coordination'], 8);
      await service.registerNewAgent('first', firstManifest);
      
      // Register second agent with same expertise (should warn but allow)
      const secondManifest = createMockManifest('second', ExpertiseArea.LEADERSHIP, ['orchestration'], 8);
      const result = await service.registerNewAgent('second', secondManifest);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('coordination conflicts'))).toBe(true);
    });

    it('should skip personality validation when disabled', async () => {
      const config: DynamicAgentRegistrationConfig = {
        allowDuplicateExpertise: true,
        requireMinimumAuthenticity: 5,
        maxAgentsPerExpertise: 5,
        validatePersonalityConsistency: false
      };
      
      const service = new AgentDiscoveryService(envelopeHandler, config);
      
      const manifest = createMockManifest('no-validation', ExpertiseArea.ENGAGEMENT, ['entertainment'], 8);
      manifest.personality.catchphrases = []; // Would normally fail validation
      
      const result = await service.registerNewAgent('no-validation', manifest);
      
      // Should succeed when personality validation is disabled
      expect(result.isValid).toBe(true);
      expect(result.errors).not.toContain('Agent must have at least one catchphrase');
    });
  });
});