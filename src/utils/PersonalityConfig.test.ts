/**
 * Unit tests for personality configuration system
 */

import { describe, it, expect } from 'vitest';
import { 
  PersonalityConfigFactory, 
  PersonalityValidator, 
  PersonalityInjector,
  PersonalityValidationResult,
  PersonalityConsistencyResult
} from './PersonalityConfig';
import { PersonalityConfig, ExpertiseArea, SpeakingStyle } from './types';

describe('PersonalityValidator', () => {
  describe('validatePersonalityConfig', () => {
    it('should validate a complete and authentic personality config', () => {
      const validConfig: PersonalityConfig = {
        name: 'Leonardo',
        catchphrases: ['Cowabunga! Team focus!', 'Together we lead!'],
        speakingStyle: SpeakingStyle.LEADER,
        nineties_references: ['cowabunga', 'radical', 'team power'],
        expertise_area: ExpertiseArea.LEADERSHIP
      };

      const result = PersonalityValidator.validatePersonalityConfig(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.authenticityScore).toBeGreaterThan(70);
    });

    it('should identify missing required fields', () => {
      const invalidConfig: PersonalityConfig = {
        name: '',
        catchphrases: [],
        speakingStyle: SpeakingStyle.LEADER,
        nineties_references: [],
        expertise_area: ExpertiseArea.LEADERSHIP
      };

      const result = PersonalityValidator.validatePersonalityConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
      expect(result.errors).toContain('At least one catchphrase is required');
      expect(result.errors).toContain('At least one 90s reference is required');
    });

    it('should warn about missing 90s terms', () => {
      const configWithoutCommon90sTerms: PersonalityConfig = {
        name: 'Test Agent',
        catchphrases: ['Hello there!'],
        speakingStyle: SpeakingStyle.LEADER,
        nineties_references: ['uncommon_reference'],
        expertise_area: ExpertiseArea.LEADERSHIP
      };

      const result = PersonalityValidator.validatePersonalityConfig(configWithoutCommon90sTerms);

      expect(result.warnings).toContain('No common 90s terms found in references');
    });

    it('should warn about speaking style inconsistency', () => {
      const inconsistentConfig: PersonalityConfig = {
        name: 'Test Agent',
        catchphrases: ['Yo yo yo!'], // Doesn't match LEADER style
        speakingStyle: SpeakingStyle.LEADER,
        nineties_references: ['cowabunga'],
        expertise_area: ExpertiseArea.LEADERSHIP
      };

      const result = PersonalityValidator.validatePersonalityConfig(inconsistentConfig);

      expect(result.warnings).toContain('Catchphrases don\'t match leader speaking style');
    });

    it('should warn technical agents without tech references', () => {
      const techConfigWithoutTechTerms: PersonalityConfig = {
        name: 'Tech Agent',
        catchphrases: ['Let me analyze this!'],
        speakingStyle: SpeakingStyle.TECH_GEEK,
        nineties_references: ['cowabunga'], // No tech terms
        expertise_area: ExpertiseArea.TECHNICAL
      };

      const result = PersonalityValidator.validatePersonalityConfig(techConfigWithoutTechTerms);

      expect(result.warnings).toContain('Technical expertise should include tech-specific 90s references');
    });

    it('should calculate authenticity score correctly', () => {
      const highAuthenticityConfig: PersonalityConfig = {
        name: 'Authentic Agent',
        catchphrases: ['Cowabunga team!', 'Radical leadership!', 'Totally focused!'],
        speakingStyle: SpeakingStyle.LEADER,
        nineties_references: ['cowabunga', 'radical', 'totally', 'awesome', 'tubular'],
        expertise_area: ExpertiseArea.LEADERSHIP
      };

      const result = PersonalityValidator.validatePersonalityConfig(highAuthenticityConfig);

      expect(result.authenticityScore).toBeGreaterThan(80);
      expect(result.authenticityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('validate90sAuthenticity', () => {
    it('should validate messages with common 90s terms', () => {
      expect(PersonalityValidator.validate90sAuthenticity('That is totally radical!')).toBe(true);
      expect(PersonalityValidator.validate90sAuthenticity('Cowabunga, dude!')).toBe(true);
      expect(PersonalityValidator.validate90sAuthenticity('This is tubular awesome!')).toBe(true);
    });

    it('should validate messages with tech 90s terms', () => {
      expect(PersonalityValidator.validate90sAuthenticity('Let me check the mainframe')).toBe(true);
      expect(PersonalityValidator.validate90sAuthenticity('Insert the floppy disk')).toBe(true);
      expect(PersonalityValidator.validate90sAuthenticity('My Game Gear shows...')).toBe(true);
    });

    it('should reject messages without 90s terms', () => {
      expect(PersonalityValidator.validate90sAuthenticity('This is a modern message')).toBe(false);
      expect(PersonalityValidator.validate90sAuthenticity('Check your smartphone')).toBe(false);
    });

    it('should handle empty messages', () => {
      expect(PersonalityValidator.validate90sAuthenticity('')).toBe(false);
      expect(PersonalityValidator.validate90sAuthenticity('   ')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(PersonalityValidator.validate90sAuthenticity('TOTALLY RADICAL')).toBe(true);
      expect(PersonalityValidator.validate90sAuthenticity('CoWaBuNgA')).toBe(true);
    });
  });

  describe('checkPersonalityConsistency', () => {
    const testConfig: PersonalityConfig = {
      name: 'Leonardo',
      catchphrases: ['Cowabunga! Team focus!', 'Together we lead!'],
      speakingStyle: SpeakingStyle.LEADER,
      nineties_references: ['cowabunga', 'radical', 'team'],
      expertise_area: ExpertiseArea.LEADERSHIP
    };

    it('should validate consistent responses', () => {
      const consistentResponse = 'Cowabunga! Team focus! Let\'s coordinate this radical solution together!';
      
      const result = PersonalityValidator.checkPersonalityConsistency(consistentResponse, testConfig);

      expect(result.isConsistent).toBe(true);
      expect(result.score).toBeGreaterThan(80);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify missing catchphrases', () => {
      const responseWithoutCatchphrase = 'Let\'s work together on this radical solution';
      
      const result = PersonalityValidator.checkPersonalityConsistency(responseWithoutCatchphrase, testConfig);

      expect(result.issues).toContain('Response does not use any character catchphrases');
      expect(result.suggestions).toContain('Include a catchphrase to maintain character voice');
      expect(result.score).toBeLessThan(100);
    });

    it('should identify missing 90s references', () => {
      const responseWithout90sRefs = 'Together we lead! Let\'s work on this solution';
      
      const result = PersonalityValidator.checkPersonalityConsistency(responseWithout90sRefs, testConfig);

      expect(result.issues).toContain('Response lacks 90s references');
      expect(result.suggestions).toContain('Add period-appropriate references for authenticity');
    });

    it('should identify speaking style inconsistency', () => {
      const inconsistentResponse = 'Cowabunga! This is totally gnarly, dude!'; // Surfer style, not leader
      
      const result = PersonalityValidator.checkPersonalityConsistency(inconsistentResponse, testConfig);

      expect(result.issues).toContain('Response doesn\'t match leader speaking style');
      expect(result.suggestions).toContain('Include words like: team, together, coordinate, focus, lead');
    });

    it('should handle empty responses', () => {
      const result = PersonalityValidator.checkPersonalityConsistency('', testConfig);

      expect(result.isConsistent).toBe(false);
      expect(result.score).toBe(0);
      expect(result.issues).toContain('Empty response');
    });

    it('should provide helpful suggestions', () => {
      const poorResponse = 'This is a solution';
      
      const result = PersonalityValidator.checkPersonalityConsistency(poorResponse, testConfig);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes('catchphrase'))).toBe(true);
    });
  });
});

describe('PersonalityInjector', () => {
  const testConfig: PersonalityConfig = {
    name: 'Leonardo',
    catchphrases: ['Cowabunga! Team focus!', 'Together we lead!'],
    speakingStyle: SpeakingStyle.LEADER,
    nineties_references: ['cowabunga', 'radical', 'team'],
    expertise_area: ExpertiseArea.LEADERSHIP
  };

  describe('injectPersonality', () => {
    it('should inject catchphrase when missing', () => {
      const response = 'This is a solution';
      const enhanced = PersonalityInjector.injectPersonality(response, testConfig);

      expect(enhanced).not.toBe(response);
      expect(testConfig.catchphrases.some(phrase => enhanced.includes(phrase))).toBe(true);
    });

    it('should inject 90s reference when missing', () => {
      const response = 'Together we lead! This is a solution.';
      const enhanced = PersonalityInjector.injectPersonality(response, testConfig);

      expect(enhanced).toMatch(/- \w+ style!$/);
    });

    it('should not modify already authentic responses', () => {
      const authenticResponse = 'Cowabunga! Team focus! This radical solution rocks!';
      const enhanced = PersonalityInjector.injectPersonality(authenticResponse, testConfig);

      // Should be the same or only slightly modified
      expect(enhanced).toContain('Cowabunga!');
      expect(enhanced).toContain('radical');
    });

    it('should handle empty responses gracefully', () => {
      expect(PersonalityInjector.injectPersonality('', testConfig)).toBe('');
      expect(PersonalityInjector.injectPersonality('   ', testConfig)).toBe('   ');
    });

    it('should add catchphrase at beginning or end', () => {
      const response = 'This is a test';
      const enhanced = PersonalityInjector.injectPersonality(response, testConfig);

      const startsWithCatchphrase = testConfig.catchphrases.some(phrase =>
        enhanced.startsWith(phrase)
      );
      const containsCatchphrase = testConfig.catchphrases.some(phrase =>
        enhanced.includes(phrase)
      );

      expect(containsCatchphrase).toBe(true);
    });
  });

  describe('ensureConsistentVoice', () => {
    it('should enhance inconsistent responses', () => {
      const responses = [
        'This is solution one',
        'Cowabunga! This radical solution rocks!',
        'Another plain solution'
      ];

      const enhanced = PersonalityInjector.ensureConsistentVoice(responses, testConfig);

      expect(enhanced).toHaveLength(3);
      // First and third should be enhanced, second should remain similar
      expect(enhanced[0]).not.toBe(responses[0]);
      expect(enhanced[2]).not.toBe(responses[2]);
    });

    it('should leave consistent responses unchanged', () => {
      const consistentResponses = [
        'Cowabunga! Team focus! This radical solution is awesome!',
        'Together we lead! This cowabunga approach works!'
      ];

      const enhanced = PersonalityInjector.ensureConsistentVoice(consistentResponses, testConfig);

      // Should be similar to originals since they're already consistent
      expect(enhanced[0]).toContain('Cowabunga!');
      expect(enhanced[1]).toContain('Together we lead!');
    });
  });
});

describe('PersonalityConfigFactory', () => {
  describe('createLeonardoConfig', () => {
    it('should create valid Leonardo configuration', () => {
      const config = PersonalityConfigFactory.createLeonardoConfig();
      const validation = PersonalityValidator.validatePersonalityConfig(config);

      expect(validation.isValid).toBe(true);
      expect(config.name).toBe('Leonardo');
      expect(config.expertise_area).toBe(ExpertiseArea.LEADERSHIP);
      expect(config.speakingStyle).toBe(SpeakingStyle.LEADER);
      expect(config.catchphrases.length).toBeGreaterThan(0);
      expect(config.nineties_references.length).toBeGreaterThan(0);
    });

    it('should have leadership-appropriate catchphrases', () => {
      const config = PersonalityConfigFactory.createLeonardoConfig();
      
      const hasLeadershipTerms = config.catchphrases.some(phrase =>
        phrase.toLowerCase().includes('team') || 
        phrase.toLowerCase().includes('focus') ||
        phrase.toLowerCase().includes('together')
      );

      expect(hasLeadershipTerms).toBe(true);
    });
  });

  describe('createDonatelloConfig', () => {
    it('should create valid Donatello configuration', () => {
      const config = PersonalityConfigFactory.createDonatelloConfig();
      const validation = PersonalityValidator.validatePersonalityConfig(config);

      expect(validation.isValid).toBe(true);
      expect(config.name).toBe('Donatello');
      expect(config.expertise_area).toBe(ExpertiseArea.TECHNICAL);
      expect(config.speakingStyle).toBe(SpeakingStyle.TECH_GEEK);
    });

    it('should have tech-specific 90s references', () => {
      const config = PersonalityConfigFactory.createDonatelloConfig();
      
      const hasTechTerms = config.nineties_references.some(ref =>
        ['mainframe', 'game gear', 'cd-rom', 'floppy disk'].includes(ref.toLowerCase())
      );

      expect(hasTechTerms).toBe(true);
    });
  });

  describe('createRaphaelConfig', () => {
    it('should create valid Raphael configuration', () => {
      const config = PersonalityConfigFactory.createRaphaelConfig();
      const validation = PersonalityValidator.validatePersonalityConfig(config);

      expect(validation.isValid).toBe(true);
      expect(config.name).toBe('Raphael');
      expect(config.expertise_area).toBe(ExpertiseArea.ATTITUDE);
      expect(config.speakingStyle).toBe(SpeakingStyle.TOUGH_LOVE);
    });

    it('should have attitude-appropriate catchphrases', () => {
      const config = PersonalityConfigFactory.createRaphaelConfig();
      
      const hasAttitudeTerms = config.catchphrases.some(phrase =>
        phrase.toLowerCase().includes('reality') || 
        phrase.toLowerCase().includes('tough') ||
        phrase.toLowerCase().includes('bogus')
      );

      expect(hasAttitudeTerms).toBe(true);
    });
  });

  describe('createMichelangeloConfig', () => {
    it('should create valid Michelangelo configuration', () => {
      const config = PersonalityConfigFactory.createMichelangeloConfig();
      const validation = PersonalityValidator.validatePersonalityConfig(config);

      expect(validation.isValid).toBe(true);
      expect(config.name).toBe('Michelangelo');
      expect(config.expertise_area).toBe(ExpertiseArea.ENGAGEMENT);
      expect(config.speakingStyle).toBe(SpeakingStyle.SURFER_DUDE);
    });

    it('should have fun and engaging references', () => {
      const config = PersonalityConfigFactory.createMichelangeloConfig();
      
      const hasFunTerms = config.nineties_references.some(ref =>
        ['tubular', 'gnarly', 'awesome', 'dude'].includes(ref.toLowerCase())
      );

      expect(hasFunTerms).toBe(true);
    });
  });

  describe('addPersonalityFlair (deprecated)', () => {
    it('should still work for backward compatibility', () => {
      const config = PersonalityConfigFactory.createLeonardoConfig();
      const response = 'This is a test';
      const enhanced = PersonalityConfigFactory.addPersonalityFlair(response, config);

      expect(enhanced).not.toBe(response);
      expect(enhanced.length).toBeGreaterThan(response.length);
    });
  });
});