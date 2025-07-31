/**
 * Validation utilities for 90s authenticity and Open Floor Protocol compliance
 */

import { PersonalityConfig, SpeakingStyle } from './types';

// 90s reference validation
const VALID_90S_REFERENCES = [
  'cowabunga', 'tubular', 'radical', 'bogus', 'shell-shocked',
  'mainframe', 'game gear', 'tamagotchi', 'pager', 'cd-rom',
  'world wide web', 'dial-up', 'floppy disk', 'nintendo',
  'totally', 'dude', 'gnarly', 'fresh', 'phat'
];

const SPEAKING_STYLE_PATTERNS = {
  [SpeakingStyle.LEADER]: ['team', 'focus', 'coordinate', 'together'],
  [SpeakingStyle.TECH_GEEK]: ['analyze', 'compute', 'data', 'system'],
  [SpeakingStyle.TOUGH_LOVE]: ['reality check', 'straight up', 'deal with it'],
  [SpeakingStyle.SURFER_DUDE]: ['dude', 'totally', 'awesome', 'chill']
};

export class ValidationUtils {
  /**
   * Validates if a message contains authentic 90s references
   */
  static validate90sAuthenticity(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return VALID_90S_REFERENCES.some(ref => lowerMessage.includes(ref));
  }

  /**
   * Validates if a message matches the expected speaking style
   */
  static validateSpeakingStyle(message: string, style: SpeakingStyle): boolean {
    const lowerMessage = message.toLowerCase();
    const patterns = SPEAKING_STYLE_PATTERNS[style] || [];
    return patterns.some(pattern => lowerMessage.includes(pattern));
  }

  /**
   * Validates personality configuration completeness
   */
  static validatePersonalityConfig(config: PersonalityConfig): boolean {
    return !!(
      config.name &&
      config.catchphrases?.length > 0 &&
      config.speakingStyle &&
      config.nineties_references?.length > 0 &&
      config.expertise_area
    );
  }

  /**
   * Scores the nostalgic quality of a message (0-100)
   */
  static scoreNostalgicQuality(message: string): number {
    const lowerMessage = message.toLowerCase();
    let score = 0;
    
    // Count 90s references
    const referenceCount = VALID_90S_REFERENCES.filter(ref => 
      lowerMessage.includes(ref)
    ).length;
    
    score += Math.min(referenceCount * 20, 80); // Max 80 points for references
    
    // Bonus for authentic slang usage
    if (lowerMessage.includes('dude') || lowerMessage.includes('totally')) {
      score += 10;
    }
    
    // Bonus for exclamation usage (90s enthusiasm)
    if (message.includes('!')) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }
}