/**
 * CollaborationPatterns - Implementation of multi-agent collaboration patterns
 * Supports orchestration, delegation, mediation, and channeling patterns
 */

import { Envelope as ConversationEnvelope } from '@openfloor/protocol';
import { OFPEventType as EventType } from './OpenFloorAdapter';
import { FloorManager } from './FloorManager';
import { ConversationEnvelopeHandler } from './ConversationEnvelopeHandler';
import { AgentDiscoveryService } from './AgentDiscoveryService';
import {
  CollaborationPattern,
  UserProblem,
  AgentContribution,
  ExpertiseArea,
  Priority,
  SquadAgentManifest
} from '../utils/types';

export interface CollaborationContext {
  problemId: string;
  pattern: CollaborationPattern;
  initiator: string;
  participants: string[];
  metadata: Record<string, any>;
}

export interface OrchestrationTask {
  id: string;
  type: string;
  targetAgent: string;
  description: string;
  priority: Priority;
  status: 'pending' | 'assigned' | 'completed' | 'failed';
  result?: AgentContribution;
}

export interface DelegationRequest {
  taskId: string;
  fromAgent: string;
  toAgent: string;
  taskType: string;
  description: string;
  context: any;
  deadline?: Date;
}

export interface MediationSession {
  id: string;
  mediator: string;
  participants: string[];
  topic: string;
  status: 'active' | 'resolved' | 'failed';
  resolution?: string;
}

export interface ChannelingSession {
  id: string;
  channeler: string;
  sourceAgent: string;
  targetAudience: string[];
  message: string;
  channelType: 'translation' | 'amplification' | 'filtering';
}

export class CollaborationPatternManager {
  private floorManager: FloorManager;
  private envelopeHandler: ConversationEnvelopeHandler;
  private discoveryService: AgentDiscoveryService;
  
  private activeOrchestrations: Map<string, CollaborationContext> = new Map();
  private activeDelegations: Map<string, DelegationRequest> = new Map();
  private activeMediations: Map<string, MediationSession> = new Map();
  private activeChanneling: Map<string, ChannelingSession> = new Map();

  constructor(
    floorManager: FloorManager,
    envelopeHandler: ConversationEnvelopeHandler,
    discoveryService: AgentDiscoveryService
  ) {
    this.floorManager = floorManager;
    this.envelopeHandler = envelopeHandler;
    this.discoveryService = discoveryService;
  }

  /**
   * ORCHESTRATION PATTERN
   * Leonardo manages overall flow and coordinates multiple agents
   */
  async initiateOrchestration(
    orchestratorId: string,
    problem: UserProblem,
    requiredExpertise: ExpertiseArea[]
  ): Promise<string> {
    const contextId = `orchestration_${Date.now()}`;
    
    // Find agents with required expertise
    const manifests = await this.discoveryService.getManifests();
    const participants = this.findAgentsByExpertise(manifests, requiredExpertise);
    
    const context: CollaborationContext = {
      problemId: problem.id,
      pattern: CollaborationPattern.ORCHESTRATION,
      initiator: orchestratorId,
      participants,
      metadata: {
        problem,
        requiredExpertise,
        startTime: new Date(),
        tasks: []
      }
    };
    
    this.activeOrchestrations.set(contextId, context);
    
    // Notify all participants about orchestration
    await this.notifyOrchestrationParticipants(contextId, context);
    
    return contextId;
  }

  async executeOrchestrationTask(
    contextId: string,
    task: OrchestrationTask
  ): Promise<AgentContribution | null> {
    const context = this.activeOrchestrations.get(contextId);
    if (!context) {
      throw new Error(`Orchestration context ${contextId} not found`);
    }

    // Add task to context
    context.metadata.tasks.push(task);
    task.status = 'assigned';

    // Create delegation envelope for the task
    const delegationEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'orchestration_task',
        contextId,
        task,
        problem: context.metadata.problem
      },
      context.initiator,
      [task.targetAgent],
      {
        collaboration_pattern: CollaborationPattern.ORCHESTRATION,
        task_id: task.id
      }
    );

    await this.envelopeHandler.routeEnvelope(delegationEnvelope);
    
    // Wait for task completion (simplified for testing)
    return await this.waitForOrchestrationTaskCompletion(contextId, task.id);
  }

  async completeOrchestrationTask(
    contextId: string,
    taskId: string,
    contribution: AgentContribution
  ): Promise<void> {
    const context = this.activeOrchestrations.get(contextId);
    if (!context) {
      throw new Error(`Orchestration context ${contextId} not found`);
    }

    const task = context.metadata.tasks.find((t: OrchestrationTask) => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in orchestration context`);
    }

    task.status = 'completed';
    task.result = contribution;

    // Notify orchestrator of task completion
    const completionEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'orchestration_task_complete',
        contextId,
        taskId,
        contribution
      },
      contribution.agentId,
      [context.initiator],
      {
        collaboration_pattern: CollaborationPattern.ORCHESTRATION
      }
    );

    await this.envelopeHandler.routeEnvelope(completionEnvelope);
  }

  /**
   * DELEGATION PATTERN
   * Direct task assignment from one agent to another
   */
  async initiateDelegation(
    fromAgent: string,
    toAgent: string,
    taskType: string,
    description: string,
    context: any
  ): Promise<string> {
    const taskId = `delegation_${Date.now()}`;
    
    const delegation: DelegationRequest = {
      taskId,
      fromAgent,
      toAgent,
      taskType,
      description,
      context,
      deadline: new Date(Date.now() + 30000) // 30 second deadline
    };
    
    this.activeDelegations.set(taskId, delegation);
    
    // Send delegation request
    const delegationEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'delegation_request',
        delegation
      },
      fromAgent,
      [toAgent],
      {
        collaboration_pattern: CollaborationPattern.DELEGATION,
        task_id: taskId
      }
    );
    
    await this.envelopeHandler.routeEnvelope(delegationEnvelope);
    
    return taskId;
  }

  async completeDelegation(
    taskId: string,
    contribution: AgentContribution
  ): Promise<void> {
    const delegation = this.activeDelegations.get(taskId);
    if (!delegation) {
      throw new Error(`Delegation ${taskId} not found`);
    }

    // Send completion back to delegating agent
    const completionEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'delegation_complete',
        taskId,
        contribution
      },
      delegation.toAgent,
      [delegation.fromAgent],
      {
        collaboration_pattern: CollaborationPattern.DELEGATION
      }
    );

    await this.envelopeHandler.routeEnvelope(completionEnvelope);
    
    // Clean up delegation
    this.activeDelegations.delete(taskId);
  }

  /**
   * MEDIATION PATTERN
   * Agent-to-agent communication through a mediator
   */
  async initiateMediation(
    mediatorId: string,
    participants: string[],
    topic: string
  ): Promise<string> {
    const sessionId = `mediation_${Date.now()}`;
    
    const session: MediationSession = {
      id: sessionId,
      mediator: mediatorId,
      participants,
      topic,
      status: 'active'
    };
    
    this.activeMediations.set(sessionId, session);
    
    // Notify all participants about mediation session
    const mediationEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'mediation_start',
        sessionId,
        topic,
        participants
      },
      mediatorId,
      participants,
      {
        collaboration_pattern: CollaborationPattern.MEDIATION,
        session_id: sessionId
      }
    );
    
    await this.envelopeHandler.routeEnvelope(mediationEnvelope);
    
    return sessionId;
  }

  async mediateMessage(
    sessionId: string,
    fromAgent: string,
    message: string,
    targetAgent?: string
  ): Promise<void> {
    const session = this.activeMediations.get(sessionId);
    if (!session) {
      throw new Error(`Mediation session ${sessionId} not found`);
    }

    if (session.status !== 'active') {
      throw new Error(`Mediation session ${sessionId} is not active`);
    }

    // Determine recipients
    const recipients = targetAgent 
      ? [targetAgent, session.mediator]
      : [...session.participants, session.mediator];

    // Send mediated message
    const mediatedEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'mediated_message',
        sessionId,
        fromAgent,
        message,
        targetAgent
      },
      session.mediator,
      recipients.filter(id => id !== fromAgent),
      {
        collaboration_pattern: CollaborationPattern.MEDIATION,
        session_id: sessionId
      }
    );

    await this.envelopeHandler.routeEnvelope(mediatedEnvelope);
  }

  async resolveMediation(
    sessionId: string,
    resolution: string
  ): Promise<void> {
    const session = this.activeMediations.get(sessionId);
    if (!session) {
      throw new Error(`Mediation session ${sessionId} not found`);
    }

    session.status = 'resolved';
    session.resolution = resolution;

    // Notify all participants of resolution
    const resolutionEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'mediation_resolved',
        sessionId,
        resolution
      },
      session.mediator,
      session.participants,
      {
        collaboration_pattern: CollaborationPattern.MEDIATION,
        session_id: sessionId
      }
    );

    await this.envelopeHandler.routeEnvelope(resolutionEnvelope);
  }

  /**
   * CHANNELING PATTERN
   * One agent channels/translates another agent's message
   */
  async initiateChanneling(
    channelerId: string,
    sourceAgent: string,
    targetAudience: string[],
    message: string,
    channelType: 'translation' | 'amplification' | 'filtering' = 'translation'
  ): Promise<string> {
    const sessionId = `channeling_${Date.now()}`;
    
    const session: ChannelingSession = {
      id: sessionId,
      channeler: channelerId,
      sourceAgent,
      targetAudience,
      message,
      channelType
    };
    
    this.activeChanneling.set(sessionId, session);
    
    // Request channeling from the channeler
    const channelingEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'channeling_request',
        sessionId,
        sourceAgent,
        originalMessage: message,
        channelType,
        targetAudience
      },
      sourceAgent,
      [channelerId],
      {
        collaboration_pattern: CollaborationPattern.CHANNELING,
        session_id: sessionId
      }
    );
    
    await this.envelopeHandler.routeEnvelope(channelingEnvelope);
    
    return sessionId;
  }

  async completeChanneling(
    sessionId: string,
    channeledMessage: string
  ): Promise<void> {
    const session = this.activeChanneling.get(sessionId);
    if (!session) {
      throw new Error(`Channeling session ${sessionId} not found`);
    }

    // Send channeled message to target audience
    const channeledEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'channeled_message',
        sessionId,
        originalMessage: session.message,
        channeledMessage,
        channelType: session.channelType,
        sourceAgent: session.sourceAgent
      },
      session.channeler,
      session.targetAudience,
      {
        collaboration_pattern: CollaborationPattern.CHANNELING,
        session_id: sessionId
      }
    );

    await this.envelopeHandler.routeEnvelope(channeledEnvelope);
    
    // Clean up channeling session
    this.activeChanneling.delete(sessionId);
  }

  /**
   * Get active collaboration contexts
   */
  getActiveCollaborations(): {
    orchestrations: CollaborationContext[];
    delegations: DelegationRequest[];
    mediations: MediationSession[];
    channeling: ChannelingSession[];
  } {
    return {
      orchestrations: Array.from(this.activeOrchestrations.values()),
      delegations: Array.from(this.activeDelegations.values()),
      mediations: Array.from(this.activeMediations.values()),
      channeling: Array.from(this.activeChanneling.values())
    };
  }

  /**
   * Clean up expired collaborations
   */
  async cleanupExpiredCollaborations(): Promise<void> {
    const now = new Date();
    
    // Clean up expired delegations
    for (const [taskId, delegation] of this.activeDelegations.entries()) {
      if (delegation.deadline && delegation.deadline < now) {
        this.activeDelegations.delete(taskId);
      }
    }
    
    // Clean up old orchestrations (older than 5 minutes)
    for (const [contextId, context] of this.activeOrchestrations.entries()) {
      const startTime = context.metadata.startTime;
      if (startTime && (now.getTime() - startTime.getTime()) > 300000) {
        this.activeOrchestrations.delete(contextId);
      }
    }
  }

  /**
   * Helper methods
   */
  private findAgentsByExpertise(
    manifests: SquadAgentManifest[],
    requiredExpertise: ExpertiseArea[]
  ): string[] {
    const participants: string[] = [];
    
    for (const expertise of requiredExpertise) {
      const agent = manifests.find(m => 
        m.personality?.expertise_area === expertise
      );
      if (agent) {
        participants.push(agent.id);
      }
    }
    
    return participants;
  }

  private async notifyOrchestrationParticipants(
    contextId: string,
    context: CollaborationContext
  ): Promise<void> {
    const notificationEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'orchestration_start',
        contextId,
        problem: context.metadata.problem,
        requiredExpertise: context.metadata.requiredExpertise
      },
      context.initiator,
      context.participants,
      {
        collaboration_pattern: CollaborationPattern.ORCHESTRATION,
        context_id: contextId
      }
    );

    await this.envelopeHandler.routeEnvelope(notificationEnvelope);
  }

  private async waitForOrchestrationTaskCompletion(
    contextId: string,
    taskId: string,
    timeout: number = 5000
  ): Promise<AgentContribution | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const context = this.activeOrchestrations.get(contextId);
      if (!context) return null;
      
      const task = context.metadata.tasks.find((t: OrchestrationTask) => t.id === taskId);
      if (task && task.status === 'completed' && task.result) {
        return task.result;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return null; // Timeout
  }
}