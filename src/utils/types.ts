/**
 * Type definitions for Cowabunga Crisis Squad
 * Extends Open Floor Protocol types with squad-specific interfaces
 */

import { 
  Envelope as ConversationEnvelope,
  BotAgent,
  DialogEvent
} from '@openfloor/protocol';

// Squad-specific enums
export enum ExpertiseArea {
  LEADERSHIP = 'leadership',
  TECHNICAL = 'technical', 
  ATTITUDE = 'attitude',
  ENGAGEMENT = 'engagement'
}

export enum SpeakingStyle {
  LEADER = 'leader',
  TECH_GEEK = 'tech_geek',
  TOUGH_LOVE = 'tough_love',
  SURFER_DUDE = 'surfer_dude'
}

export enum CollaborationPattern {
  ORCHESTRATION = 'orchestration',
  DELEGATION = 'delegation',
  MEDIATION = 'mediation',
  CHANNELING = 'channeling'
}

export enum ProblemCategory {
  TECHNICAL = 'technical',
  CREATIVE = 'creative',
  ANALYTICAL = 'analytical',
  INTERPERSONAL = 'interpersonal'
}

export enum ComplexityLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  EXPERT = 'expert'
}

export enum Priority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  LEADER = 4  // Leonardo gets highest priority
}

// Core interfaces
export interface PersonalityConfig {
  name: string;
  catchphrases: string[];
  speakingStyle: SpeakingStyle;
  nineties_references: string[];
  expertise_area: ExpertiseArea;
}

export interface UserProblem {
  id: string;
  description: string;
  category: ProblemCategory;
  complexity: ComplexityLevel;
  timestamp: Date;
}

export interface AgentContribution {
  agentId: string;
  contributionType: string;
  content: string;
  confidence: number;
  references: string[];
}

export interface SquadResponse {
  problemId: string;
  leadResponse: string;
  techAnalysis?: string;
  realityCheck?: string;
  engagingSolution?: string;
  synthesizedRecommendation: string;
}

// Extended Open Floor Protocol interfaces
export interface SquadAgentManifest {
  // Legacy fields for backward compatibility
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  description: string;
  
  // Squad-specific fields
  personality: PersonalityConfig;
  collaboration_patterns: CollaborationPattern[];
  floor_management_capabilities: string[];
  nineties_authenticity_level: number;
  metadata?: Record<string, any>;
}

export interface SquadConversationEnvelope extends ConversationEnvelope {
  squad_metadata: {
    current_leader: string;
    active_collaboration_pattern: CollaborationPattern;
    floor_history: FloorTransition[];
  };
}

export interface FloorTransition {
  from: string | null;
  to: string | null;
  timestamp: Date;
  reason: string;
}

export interface FloorRequest {
  agentId: string;
  priority: Priority;
  timestamp: Date;
  reason: string;
}

// Research and analysis types
export interface ResearchResults {
  query: string;
  results: string[];
  confidence: number;
  sources: string[];
}

export interface TechnicalInsight {
  analysis: string;
  recommendations: string[];
  complexity: ComplexityLevel;
  tech_references: string[];
}

export interface RealityCheckResult {
  feasible: boolean;
  concerns: string[];
  alternatives: string[];
  attitude_response: string;
}