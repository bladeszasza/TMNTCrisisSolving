/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import { ValidationUtils } from './validation';
import { SpeakingStyle } from './types';

describe('ValidationUtils', () => {
  describe('validate90sAuthenticity', () => {
    it('should return true for messages with 90s references', () => {
      expect(ValidationUtils.validate90sAuthenticity('That is totally tubular!')).toBe(true);
      expect(ValidationUtils.validate90sAuthenticity('Cowabunga, dude!')).toBe(true);
      expect(ValidationUtils.validate90sAuthenticity('This is so radical!')).toBe(true);
    });

    it('should return false for messages without 90s references', () => {
      expect(ValidationUtils.validate90sAuthenticity('Hello world')).toBe(false);
      expect(ValidationUtils.validate90sAuthenticity('This is a normal message')).toBe(false);
    });
  });

  describe('validateSpeakingStyle', () => {
    it('should validate leader speaking style', () => {
      expect(ValidationUtils.validateSpeakingStyle('Team, let\'s focus!', SpeakingStyle.LEADER)).toBe(true);
      expect(ValidationUtils.validateSpeakingStyle('We need to coordinate', SpeakingStyle.LEADER)).toBe(true);
    });

    it('should validate tech geek speaking style', () => {
      expect(ValidationUtils.validateSpeakingStyle('Let me analyze the data', SpeakingStyle.TECH_GEEK)).toBe(true);
      expect(ValidationUtils.validateSpeakingStyle('The system shows...', SpeakingStyle.TECH_GEEK)).toBe(true);
    });
  });

  describe('scoreNostalgicQuality', () => {
    it('should score messages with 90s references higher', () => {
      const highScore = ValidationUtils.scoreNostalgicQuality('Cowabunga! That\'s totally tubular, dude!');
      const lowScore = ValidationUtils.scoreNostalgicQuality('This is a regular message.');
      
      expect(highScore).toBeGreaterThan(lowScore);
      expect(highScore).toBeGreaterThan(50);
    });

    it('should not exceed 100 points', () => {
      const score = ValidationUtils.scoreNostalgicQuality('Cowabunga tubular radical bogus totally dude gnarly awesome!');
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});