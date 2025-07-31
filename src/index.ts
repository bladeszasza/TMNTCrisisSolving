/**
 * Cowabunga Crisis Squad - Main Entry Point
 * 
 * A multi-agent conversational AI system demonstrating Open Floor Protocol
 * capabilities through four specialized agents with 90s cartoon personalities.
 */

// Export agents 
export * from './agents/base/BaseSquadAgent';
export * from './agents/LeonardoLeaderAgent';
export * from './agents/DonatelloTechAgent';
export * from './agents/RaphaelAttitudeAgent';
export * from './agents/MichelangeloFunAgent';

// Export protocol (avoiding OrchestrationTask conflict)
// Shim removed – all core protocol types come directly from @openfloor/protocol
export * from './protocol/ConversationEnvelopeHandler';
export * from './protocol/FloorManager';
export * from './protocol/AgentDiscoveryService';
export { 
  CollaborationPatternManager, 
  DelegationRequest 
} from './protocol/CollaborationPatterns';
export * from './protocol/ParallelProcessing';

// Export utilities
export * from './utils';

// Main squad initialization will be implemented in later tasks
export class CowabungaCrisisSquad {
  constructor() {
    console.log('🐢 Cowabunga Crisis Squad initializing...');
  }
}