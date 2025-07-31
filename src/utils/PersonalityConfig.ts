/**
 * Personality configuration utilities for squad agents
 * Provides validation, consistency checking, and personality injection
 */

import { PersonalityConfig, ExpertiseArea, SpeakingStyle } from './types';

/**
 * Validation result for personality configurations
 */
export interface PersonalityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  authenticityScore: number;
}

/**
 * Consistency check result for personality responses
 */
export interface PersonalityConsistencyResult {
  isConsistent: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

/**
 * Validator for personality configurations and 90s authenticity
 */
export class PersonalityValidator {
  private static readonly REQUIRED_90S_TERMS = [
    'cowabunga', 'radical', 'tubular', 'gnarly', 'bogus', 'dude', 
    'totally', 'awesome', 'wicked', 'phat', 'fresh', 'def'
  ];

  private static readonly TECH_90S_TERMS = [
    'mainframe', 'cd-rom', 'floppy disk', 'dial-up', 'world wide web',
    'game gear', 'tamagotchi', 'pager', 'walkman', 'nintendo'
  ];

  private static readonly SPEAKING_STYLE_PATTERNS = {
    [SpeakingStyle.LEADER]: ['team', 'together', 'coordinate', 'focus', 'lead'],
    [SpeakingStyle.TECH_GEEK]: ['analyze', 'data', 'system', 'compute', 'research'],
    [SpeakingStyle.TOUGH_LOVE]: ['reality', 'truth', 'deal with', 'straight up', 'tough'],
    [SpeakingStyle.SURFER_DUDE]: ['dude', 'totally', 'awesome', 'gnarly', 'chill']
  };

  /**
   * Validates a personality configuration for completeness and authenticity
   */
  static validatePersonalityConfig(config: PersonalityConfig): PersonalityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let authenticityScore = 0;

    // Check required fields
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!config.catchphrases || config.catchphrases.length === 0) {
      errors.push('At least one catchphrase is required');
    } else {
      authenticityScore += Math.min(config.catchphrases.length * 10, 30);
    }

    if (!config.nineties_references || config.nineties_references.length === 0) {
      errors.push('At least one 90s reference is required');
    } else {
      authenticityScore += Math.min(config.nineties_references.length * 5, 25);
    }

    if (!config.speakingStyle) {
      errors.push('Speaking style is required');
    } else {
      authenticityScore += 15;
    }

    if (!config.expertise_area) {
      errors.push('Expertise area is required');
    } else {
      authenticityScore += 10;
    }

    // Validate 90s authenticity
    const has90sTerms = config.nineties_references.some(ref => 
      this.REQUIRED_90S_TERMS.includes(ref.toLowerCase())
    );
    
    if (!has90sTerms) {
      warnings.push('No common 90s terms found in references');
    } else {
      authenticityScore += 10;
    }

    // Validate speaking style consistency
    if (config.speakingStyle && config.catchphrases) {
      const stylePatterns = this.SPEAKING_STYLE_PATTERNS[config.speakingStyle];
      const hasStyleConsistency = config.catchphrases.some(phrase =>
        stylePatterns.some(pattern => 
          phrase.toLowerCase().includes(pattern.toLowerCase())
        )
      );

      if (!hasStyleConsistency) {
        warnings.push(`Catchphrases don't match ${config.speakingStyle} speaking style`);
      } else {
        authenticityScore += 10;
      }
    }

    // Validate expertise area alignment
    if (config.expertise_area === ExpertiseArea.TECHNICAL) {
      const hasTechTerms = config.nineties_references.some(ref =>
        this.TECH_90S_TERMS.includes(ref.toLowerCase())
      );
      if (!hasTechTerms) {
        warnings.push('Technical expertise should include tech-specific 90s references');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      authenticityScore: Math.min(authenticityScore, 100)
    };
  }

  /**
   * Validates 90s authenticity of a message
   */
  static validate90sAuthenticity(message: string): boolean {
    if (!message || message.trim().length === 0) {
      return false;
    }

    const lowerMessage = message.toLowerCase();
    
    // Check for 90s terms
    const has90sTerms = this.REQUIRED_90S_TERMS.some(term => 
      lowerMessage.includes(term)
    );

    // Check for tech 90s terms
    const hasTech90sTerms = this.TECH_90S_TERMS.some(term =>
      lowerMessage.includes(term)
    );

    return has90sTerms || hasTech90sTerms;
  }

  /**
   * Checks personality consistency in a response
   */
  static checkPersonalityConsistency(
    response: string, 
    config: PersonalityConfig
  ): PersonalityConsistencyResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    if (!response || response.trim().length === 0) {
      return {
        isConsistent: false,
        score: 0,
        issues: ['Empty response'],
        suggestions: ['Provide a non-empty response']
      };
    }

    const lowerResponse = response.toLowerCase();

    // Check for catchphrase usage
    const usesCatchphrase = config.catchphrases.some(phrase =>
      lowerResponse.includes(phrase.toLowerCase())
    );

    if (!usesCatchphrase) {
      issues.push('Response does not use any character catchphrases');
      suggestions.push('Include a catchphrase to maintain character voice');
      score -= 20;
    }

    // Check for 90s references
    const uses90sReferences = config.nineties_references.some(ref =>
      lowerResponse.includes(ref.toLowerCase())
    );

    if (!uses90sReferences) {
      issues.push('Response lacks 90s references');
      suggestions.push('Add period-appropriate references for authenticity');
      score -= 15;
    }

    // Check speaking style consistency
    const stylePatterns = this.SPEAKING_STYLE_PATTERNS[config.speakingStyle];
    const matchesStyle = stylePatterns.some(pattern =>
      lowerResponse.includes(pattern.toLowerCase())
    );

    if (!matchesStyle) {
      issues.push(`Response doesn't match ${config.speakingStyle} speaking style`);
      suggestions.push(`Include words like: ${stylePatterns.join(', ')}`);
      score -= 25;
    }

    // Check for general 90s authenticity
    if (!this.validate90sAuthenticity(response)) {
      issues.push('Response lacks overall 90s authenticity');
      suggestions.push('Add more 90s slang and cultural references');
      score -= 20;
    }

    return {
      isConsistent: issues.length === 0,
      score: Math.max(score, 0),
      issues,
      suggestions
    };
  }
}

/**
 * Utility class for injecting personality into responses
 */
export class PersonalityInjector {
  /**
   * Injects personality flair into a response
   */
  static injectPersonality(response: string, config: PersonalityConfig): string {
    if (!response || response.trim().length === 0) {
      return response;
    }

    let enhancedResponse = response;

    // Add catchphrase if not already present
    const hasCatchphrase = config.catchphrases.some(phrase =>
      response.toLowerCase().includes(phrase.toLowerCase())
    );

    if (!hasCatchphrase && config.catchphrases.length > 0) {
      const randomCatchphrase = config.catchphrases[
        Math.floor(Math.random() * config.catchphrases.length)
      ];
      
      // Add at beginning or end randomly
      if (Math.random() < 0.5) {
        enhancedResponse = `${randomCatchphrase} ${enhancedResponse}`;
      } else {
        enhancedResponse = `${enhancedResponse} ${randomCatchphrase}`;
      }
    }

    // Add 90s reference if missing
    const has90sReference = config.nineties_references.some(ref =>
      enhancedResponse.toLowerCase().includes(ref.toLowerCase())
    );

    if (!has90sReference && config.nineties_references.length > 0) {
      const randomReference = config.nineties_references[
        Math.floor(Math.random() * config.nineties_references.length)
      ];
      
      // Inject reference naturally
      enhancedResponse = enhancedResponse.replace(
        /\.$/, 
        ` - ${randomReference} style!`
      );
    }

    return enhancedResponse;
  }

  /**
   * Ensures consistent character voice across multiple responses
   */
  static ensureConsistentVoice(
    responses: string[], 
    config: PersonalityConfig
  ): string[] {
    return responses.map(response => {
      const consistency = PersonalityValidator.checkPersonalityConsistency(response, config);
      
      if (consistency.score < 70) {
        return this.injectPersonality(response, config);
      }
      
      return response;
    });
  }
}

export class PersonalityConfigFactory {
  /**
   * Creates Leonardo's leadership personality configuration
   */
  static createLeonardoConfig(): PersonalityConfig {
    return {
      name: 'Leonardo',
      catchphrases: [
        'Cowabunga! We\'ve got this!',
        'Team, let\'s focus!',
        'Time to coordinate our shell power!',
        'Together we\'re totally radical!',
        'Shell-shocked leadership time!',
        'Turtle power activate!',
        'Let\'s get totally tubular!'
      ],
      speakingStyle: SpeakingStyle.LEADER,
      nineties_references: [
        'cowabunga',
        'radical',
        'totally',
        'tubular',
        'awesome',
        'shell power',
        'turtle power',
        'gnarly',
        'team',
        'focus',
        'coordinate'
      ],
      expertise_area: ExpertiseArea.LEADERSHIP
    };
  }

  /**
   * Creates Donatello's tech personality configuration
   */
  static createDonatelloConfig(): PersonalityConfig {
    return {
      name: 'Donatello',
      catchphrases: [
        'Let me hack into the mainframe!',
        'This data is totally tubular!',
        'Time to boot up some knowledge!',
        'My Game Gear analysis shows...'
      ],
      speakingStyle: SpeakingStyle.TECH_GEEK,
      nineties_references: [
        'mainframe',
        'game gear',
        'cd-rom',
        'dial-up',
        'floppy disk',
        'world wide web'
      ],
      expertise_area: ExpertiseArea.TECHNICAL
    };
  }

  /**
   * Creates Raphael's attitude personality configuration
   */
  static createRaphaelConfig(): PersonalityConfig {
    return {
      name: 'Raphael',
      catchphrases: [
        'Shell-shocked reality check, dude!',
        'That\'s totally bogus advice!',
        'Time for some tough shell love!',
        'Deal with it, cowabunga style!'
      ],
      speakingStyle: SpeakingStyle.TOUGH_LOVE,
      nineties_references: [
        'shell-shocked',
        'bogus',
        'deal with it',
        'straight up',
        'radical truth',
        'totally wack',
        'get real',
        'wake up and smell the pizza',
        'cut the crap',
        'for real',
        'no joke',
        'that\'s lame'
      ],
      expertise_area: ExpertiseArea.ATTITUDE
    };
  }

  /**
   * Creates Michelangelo's fun personality configuration
   */
  static createMichelangeloConfig(): PersonalityConfig {
    return {
      name: 'Michelangelo',
      catchphrases: [
        'Totally tubular solution, dude!',
        'Let\'s make this problem history!',
        'Pizza-powered problem solving!',
        'Cowabunga! That\'s gnarly awesome!'
      ],
      speakingStyle: SpeakingStyle.SURFER_DUDE,
      nineties_references: [
        'tubular',
        'gnarly',
        'awesome',
        'pizza-powered',
        'totally',
        'dude'
      ],
      expertise_area: ExpertiseArea.ENGAGEMENT
    };
  }

  /**
   * Adds personality flair to a response based on configuration
   * @deprecated Use PersonalityInjector.injectPersonality instead
   */
  static addPersonalityFlair(response: string, config: PersonalityConfig): string {
    return PersonalityInjector.injectPersonality(response, config);
  }
}