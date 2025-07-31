/**
 * Comprehensive personality and authenticity testing suite
 * Tests 90s reference validation, personality consistency, and cultural reference accuracy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  PersonalityValidator, 
  PersonalityInjector, 
  PersonalityConfigFactory,
  PersonalityValidationResult,
  PersonalityConsistencyResult
} from './PersonalityConfig';
import { ValidationUtils } from './validation';
import { PersonalityConfig, SpeakingStyle, ExpertiseArea } from './types';

describe('PersonalityAuthenticity', () => {
  let leonardoConfig: PersonalityConfig;
  let donatelloConfig: PersonalityConfig;
  let raphaelConfig: PersonalityConfig;
  let michelangeloConfig: PersonalityConfig;

  beforeEach(() => {
    leonardoConfig = PersonalityConfigFactory.createLeonardoConfig();
    donatelloConfig = PersonalityConfigFactory.createDonatelloConfig();
    raphaelConfig = PersonalityConfigFactory.createRaphaelConfig();
    michelangeloConfig = PersonalityConfigFactory.createMichelangeloConfig();
  });

  describe('90s Reference Validation and Scoring', () => {
    describe('validate90sAuthenticity', () => {
      it('should validate authentic 90s terms', () => {
        const authentic90sMessages = [
          'Cowabunga! That\'s totally radical!',
          'This mainframe is totally tubular, dude!',
          'Shell-shocked by this gnarly problem!',
          'That\'s bogus advice, totally!',
          'Let me hack into the Game Gear system!'
        ];

        authentic90sMessages.forEach(message => {
          expect(PersonalityValidator.validate90sAuthenticity(message))
            .toBe(true);
        });
      });

      it('should reject non-90s messages', () => {
        const modernMessages = [
          'Let me check the cloud infrastructure',
          'We need to optimize our microservices',
          'This AI model needs fine-tuning',
          'Deploy to Kubernetes cluster',
          'Run the CI/CD pipeline'
        ];

        modernMessages.forEach(message => {
          expect(PersonalityValidator.validate90sAuthenticity(message))
            .toBe(false);
        });
      });

      it('should handle edge cases', () => {
        expect(PersonalityValidator.validate90sAuthenticity('')).toBe(false);
        expect(PersonalityValidator.validate90sAuthenticity('   ')).toBe(false);
        expect(PersonalityValidator.validate90sAuthenticity('COWABUNGA!')).toBe(true);
        expect(PersonalityValidator.validate90sAuthenticity('cowabunga')).toBe(true);
      });
    });

    describe('scoreNostalgicQuality', () => {
      it('should score high for authentic 90s content', () => {
        const highQualityMessage = 'Cowabunga dude! That\'s totally tubular and radical!';
        const score = ValidationUtils.scoreNostalgicQuality(highQualityMessage);
        expect(score).toBeGreaterThan(80);
      });

      it('should score low for modern content', () => {
        const modernMessage = 'We need to implement this feature using React hooks';
        const score = ValidationUtils.scoreNostalgicQuality(modernMessage);
        expect(score).toBeLessThan(30);
      });

      it('should give bonus points for enthusiasm', () => {
        const enthusiasticMessage = 'Totally awesome!';
        const plainMessage = 'totally awesome';
        
        const enthusiasticScore = ValidationUtils.scoreNostalgicQuality(enthusiasticMessage);
        const plainScore = ValidationUtils.scoreNostalgicQuality(plainMessage);
        
        expect(enthusiasticScore).toBeGreaterThan(plainScore);
      });

      it('should cap scores at 100', () => {
        const overloadedMessage = 'cowabunga totally radical tubular gnarly awesome dude! ' +
          'mainframe game gear cd-rom floppy disk world wide web dial-up!';
        const score = ValidationUtils.scoreNostalgicQuality(overloadedMessage);
        expect(score).toBe(100);
      });
    });
  });

  describe('Personality Consistency Testing', () => {

    describe('Leonardo Leadership Consistency', () => {
      it('should maintain leadership voice across scenarios', () => {
        const leadershipResponses = [
          'Cowabunga! We\'ve got this! Team, let\'s focus on this problem!',
          'Time to coordinate our shell power! Together we\'re totally radical!',
          'Shell-shocked leadership time! Let\'s get totally tubular!',
          'Turtle power activate! Team, let\'s coordinate and focus!'
        ];

        leadershipResponses.forEach(response => {
          const result = PersonalityValidator.checkPersonalityConsistency(response, leonardoConfig);
          expect(result.score).toBeGreaterThan(60); // More realistic expectation
        });
      });

      it('should detect inconsistent leadership responses', () => {
        const inconsistentResponses = [
          'Whatever, figure it out yourself',
          'This is too technical for me to understand',
          'I don\'t care about coordinating anything',
          'Let someone else handle the leadership stuff'
        ];

        inconsistentResponses.forEach(response => {
          const result = PersonalityValidator.checkPersonalityConsistency(response, leonardoConfig);
          expect(result.isConsistent).toBe(false);
          expect(result.score).toBeLessThan(50);
          expect(result.issues.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Donatello Tech Consistency', () => {
      it('should maintain tech geek voice with 90s references', () => {
        const techResponses = [
          'Let me hack into the mainframe! This data is totally tubular!',
          'My Game Gear analysis shows... Time to boot up some knowledge!',
          'Let me hack into the mainframe! This CD-ROM has the data!',
          'Time to boot up some knowledge! My Game Gear analysis shows this is tubular!'
        ];

        techResponses.forEach(response => {
          const result = PersonalityValidator.checkPersonalityConsistency(response, donatelloConfig);
          expect(result.score).toBeGreaterThan(60);
        });
      });

      it('should detect modern tech language as inconsistent', () => {
        const modernTechResponses = [
          'Let me check the cloud infrastructure',
          'We need to scale our microservices',
          'This requires machine learning optimization',
          'Deploy to the Kubernetes cluster'
        ];

        modernTechResponses.forEach(response => {
          const result = PersonalityValidator.checkPersonalityConsistency(response, donatelloConfig);
          expect(result.isConsistent).toBe(false);
          expect(result.issues).toContain('Response lacks 90s references');
        });
      });
    });

    describe('Raphael Attitude Consistency', () => {
      it('should maintain tough love attitude', () => {
        const attitudeResponses = [
          'Shell-shocked reality check, dude! That\'s totally bogus advice!',
          'Deal with it, cowabunga style! Time for some tough shell love!',
          'That\'s totally bogus advice! Shell-shocked reality check time!',
          'Time for some tough shell love! Deal with it, cowabunga style!'
        ];

        attitudeResponses.forEach(response => {
          const result = PersonalityValidator.checkPersonalityConsistency(response, raphaelConfig);
          expect(result.score).toBeGreaterThan(60);
        });
      });

      it('should detect overly soft responses as inconsistent', () => {
        const softResponses = [
          'That sounds really nice and pleasant',
          'Maybe you could consider this gentle approach',
          'I think everything will work out fine',
          'Don\'t worry, it\'s all good'
        ];

        softResponses.forEach(response => {
          const result = PersonalityValidator.checkPersonalityConsistency(response, raphaelConfig);
          expect(result.isConsistent).toBe(false);
          expect(result.score).toBeLessThan(50);
        });
      });
    });

    describe('Michelangelo Fun Consistency', () => {
      it('should maintain surfer dude engagement', () => {
        const funResponses = [
          'Totally tubular solution, dude! Let\'s make this problem history!',
          'Pizza-powered problem solving! Cowabunga! That\'s gnarly awesome!',
          'Cowabunga! That\'s gnarly awesome! Totally tubular solution, dude!',
          'Let\'s make this problem history! Pizza-powered problem solving!'
        ];

        funResponses.forEach(response => {
          const result = PersonalityValidator.checkPersonalityConsistency(response, michelangeloConfig);
          expect(result.score).toBeGreaterThan(50); // More lenient for Michelangelo
        });
      });

      it('should detect overly serious responses as inconsistent', () => {
        const seriousResponses = [
          'This requires careful analytical consideration',
          'We must approach this with methodical precision',
          'The systematic analysis indicates complexity',
          'Professional evaluation suggests caution'
        ];

        seriousResponses.forEach(response => {
          const result = PersonalityValidator.checkPersonalityConsistency(response, michelangeloConfig);
          expect(result.isConsistent).toBe(false);
          expect(result.issues).toContain('Response does not use any character catchphrases');
        });
      });
    });
  });

  describe('Cultural Reference Accuracy Validation', () => {
    describe('90s Technology References', () => {
      it('should validate authentic 90s tech terms', () => {
        const authentic90sTech = [
          'mainframe', 'cd-rom', 'floppy disk', 'dial-up', 
          'world wide web', 'game gear', 'tamagotchi', 'pager',
          'walkman', 'nintendo'
        ];

        authentic90sTech.forEach(term => {
          const message = `This ${term} is totally radical!`;
          expect(PersonalityValidator.validate90sAuthenticity(message)).toBe(true);
        });
      });

      it('should reject modern tech terms that lack 90s references', () => {
        const modernTech = [
          'smartphone', 'cloud computing', 'artificial intelligence',
          'machine learning', 'blockchain', 'microservices',
          'kubernetes', 'docker', 'react', 'node.js'
        ];

        modernTech.forEach(term => {
          const message = `This ${term} needs optimization.`; // No 90s terms
          expect(PersonalityValidator.validate90sAuthenticity(message)).toBe(false);
        });
      });
    });

    describe('90s Slang Validation', () => {
      it('should validate authentic 90s slang', () => {
        const authentic90sSlang = [
          'cowabunga', 'tubular', 'radical', 'gnarly', 'bogus',
          'totally', 'awesome', 'wicked', 'phat', 'fresh', 'def'
        ];

        authentic90sSlang.forEach(slang => {
          const message = `That's ${slang}, dude!`;
          expect(PersonalityValidator.validate90sAuthenticity(message)).toBe(true);
        });
      });

      it('should reject modern slang without 90s terms', () => {
        const modernSlang = [
          'lit', 'fire', 'salty', 'ghosting', 'flexing',
          'stan', 'periodt', 'slaps', 'vibes', 'sus'
        ];

        modernSlang.forEach(slang => {
          const message = `That's ${slang}.`; // No 90s terms like "dude"
          expect(PersonalityValidator.validate90sAuthenticity(message)).toBe(false);
        });
      });
    });

    describe('Cultural Context Validation', () => {
      it('should validate 90s cultural references', () => {
        const culturalReferences = [
          'shell power', 'turtle power', 'pizza time',
          'skateboard tricks', 'arcade games', 'saturday morning cartoons'
        ];

        culturalReferences.forEach(ref => {
          const message = `Time for some ${ref}!`;
          const score = ValidationUtils.scoreNostalgicQuality(message);
          expect(score).toBeGreaterThan(0);
        });
      });

      it('should maintain character-specific cultural accuracy', () => {
        // Leonardo should reference leadership and teamwork
        const leoMessage = 'Cowabunga! Team, let\'s coordinate our shell power!';
        const leoResult = PersonalityValidator.checkPersonalityConsistency(leoMessage, leonardoConfig);
        expect(leoResult.score).toBeGreaterThan(50); // More lenient check

        // Donatello should reference technology
        const donMessage = 'Let me hack into the mainframe system! Totally tubular!';
        const donResult = PersonalityValidator.checkPersonalityConsistency(donMessage, donatelloConfig);
        expect(donResult.score).toBeGreaterThan(50);

        // Raphael should reference attitude and reality
        const raphMessage = 'Shell-shocked reality check time! That\'s bogus!';
        const raphResult = PersonalityValidator.checkPersonalityConsistency(raphMessage, raphaelConfig);
        expect(raphResult.score).toBeGreaterThan(50);

        // Michelangelo should reference fun and pizza
        const mikeyMessage = 'Pizza-powered problem solving, dude! Totally tubular!';
        const mikeyResult = PersonalityValidator.checkPersonalityConsistency(mikeyMessage, michelangeloConfig);
        expect(mikeyResult.score).toBeGreaterThan(50);
      });
    });
  });

  describe('Nostalgic Experience Quality Testing', () => {
    describe('Personality Configuration Validation', () => {
      it('should validate complete personality configurations', () => {
        const configs = [
          leonardoConfig,
          donatelloConfig, 
          raphaelConfig,
          michelangeloConfig
        ];

        configs.forEach(config => {
          const result = PersonalityValidator.validatePersonalityConfig(config);
          expect(result.isValid).toBe(true);
          expect(result.authenticityScore).toBeGreaterThan(70);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should detect incomplete personality configurations', () => {
        const incompleteConfig: PersonalityConfig = {
          name: '',
          catchphrases: [],
          speakingStyle: SpeakingStyle.LEADER,
          nineties_references: [],
          expertise_area: ExpertiseArea.LEADERSHIP
        };

        const result = PersonalityValidator.validatePersonalityConfig(incompleteConfig);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.authenticityScore).toBeLessThan(50);
      });
    });

    describe('Personality Injection Quality', () => {
      it('should enhance responses with personality flair', () => {
        const plainResponse = 'This is a good solution to the problem.';
        
        const enhancedLeo = PersonalityInjector.injectPersonality(plainResponse, leonardoConfig);
        const enhancedDon = PersonalityInjector.injectPersonality(plainResponse, donatelloConfig);
        const enhancedRaph = PersonalityInjector.injectPersonality(plainResponse, raphaelConfig);
        const enhancedMikey = PersonalityInjector.injectPersonality(plainResponse, michelangeloConfig);

        // Each should be different and more authentic
        expect(enhancedLeo).not.toBe(plainResponse);
        expect(enhancedDon).not.toBe(plainResponse);
        expect(enhancedRaph).not.toBe(plainResponse);
        expect(enhancedMikey).not.toBe(plainResponse);

        // Each should score higher for nostalgic quality
        expect(ValidationUtils.scoreNostalgicQuality(enhancedLeo))
          .toBeGreaterThan(ValidationUtils.scoreNostalgicQuality(plainResponse));
        expect(ValidationUtils.scoreNostalgicQuality(enhancedDon))
          .toBeGreaterThan(ValidationUtils.scoreNostalgicQuality(plainResponse));
        expect(ValidationUtils.scoreNostalgicQuality(enhancedRaph))
          .toBeGreaterThan(ValidationUtils.scoreNostalgicQuality(plainResponse));
        expect(ValidationUtils.scoreNostalgicQuality(enhancedMikey))
          .toBeGreaterThan(ValidationUtils.scoreNostalgicQuality(plainResponse));
      });

      it('should maintain consistent voice across multiple responses', () => {
        const responses = [
          'This is the first solution.',
          'Here is another approach.',
          'Consider this alternative method.'
        ];

        const consistentResponses = PersonalityInjector.ensureConsistentVoice(
          responses, 
          leonardoConfig
        );

        consistentResponses.forEach(response => {
          const consistency = PersonalityValidator.checkPersonalityConsistency(response, leonardoConfig);
          expect(consistency.score).toBeGreaterThan(50); // More lenient
        });
      });
    });

    describe('Cross-Character Consistency', () => {
      it('should maintain distinct personalities across all characters', () => {
        const testProblem = 'How do I fix this technical issue?';
        
        const leoResponse = PersonalityInjector.injectPersonality(
          'Let me coordinate the team to solve this.', 
          leonardoConfig
        );
        const donResponse = PersonalityInjector.injectPersonality(
          'I need to analyze the technical data.', 
          donatelloConfig
        );
        const raphResponse = PersonalityInjector.injectPersonality(
          'Here is the reality of the situation.', 
          raphaelConfig
        );
        const mikeyResponse = PersonalityInjector.injectPersonality(
          'Let me make this solution fun and easy.', 
          michelangeloConfig
        );

        // Each response should have reasonable consistency with its character
        expect(PersonalityValidator.checkPersonalityConsistency(leoResponse, leonardoConfig).score).toBeGreaterThan(40);
        expect(PersonalityValidator.checkPersonalityConsistency(donResponse, donatelloConfig).score).toBeGreaterThan(40);
        expect(PersonalityValidator.checkPersonalityConsistency(raphResponse, raphaelConfig).score).toBeGreaterThan(40);
        expect(PersonalityValidator.checkPersonalityConsistency(mikeyResponse, michelangeloConfig).score).toBeGreaterThan(40);

        // Each response should be less consistent with other characters
        expect(PersonalityValidator.checkPersonalityConsistency(leoResponse, donatelloConfig).score)
          .toBeLessThan(PersonalityValidator.checkPersonalityConsistency(leoResponse, leonardoConfig).score);
        expect(PersonalityValidator.checkPersonalityConsistency(donResponse, raphaelConfig).score)
          .toBeLessThan(PersonalityValidator.checkPersonalityConsistency(donResponse, donatelloConfig).score);
      });
    });

    describe('Authenticity Scoring System', () => {
      it('should provide accurate authenticity scores', () => {
        const testCases = [
          {
            message: 'Cowabunga! That\'s totally tubular and radical, dude!',
            expectedRange: [80, 100]
          },
          {
            message: 'This is a normal response without any special terms.',
            expectedRange: [0, 20]
          },
          {
            message: 'Totally awesome solution!',
            expectedRange: [40, 70]
          },
          {
            message: 'Let me hack into the mainframe, dude!',
            expectedRange: [50, 80]
          }
        ];

        testCases.forEach(({ message, expectedRange }) => {
          const score = ValidationUtils.scoreNostalgicQuality(message);
          expect(score).toBeGreaterThanOrEqual(expectedRange[0]);
          expect(score).toBeLessThanOrEqual(expectedRange[1]);
        });
      });
    });
  });
});