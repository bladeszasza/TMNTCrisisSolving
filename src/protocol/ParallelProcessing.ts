/**
 * ParallelProcessing - Support for multiple conversation threads and reconvening
 * Enables agents to work in parallel on different aspects of problems
 */

import { Envelope as ConversationEnvelope } from '@openfloor/protocol';
import { OFPEventType as EventType } from './OpenFloorAdapter';
import { FloorManager } from './FloorManager';
import { ConversationEnvelopeHandler } from './ConversationEnvelopeHandler';
import { CollaborationPatternManager } from './CollaborationPatterns';
import {
  UserProblem,
  AgentContribution,
  ExpertiseArea,
  Priority,
  CollaborationPattern
} from '../utils/types';

export interface ConversationThread {
  id: string;
  parentProblemId: string;
  threadType: 'analysis' | 'research' | 'validation' | 'synthesis';
  participants: string[];
  coordinator: string;
  status: 'active' | 'completed' | 'failed' | 'merged';
  startTime: Date;
  endTime?: Date;
  context: any;
  contributions: AgentContribution[];
}

export interface ThreadSynchronizationPoint {
  id: string;
  problemId: string;
  waitingThreads: string[];
  completedThreads: string[];
  requiredThreads: string[];
  syncType: 'all_complete' | 'majority_complete' | 'timeout_based';
  timeout?: Date;
  reconveningAgent: string;
}

export interface ParallelProcessingContext {
  problemId: string;
  activeThreads: Map<string, ConversationThread>;
  syncPoints: Map<string, ThreadSynchronizationPoint>;
  globalContext: any;
  coordinator: string;
}

export interface ThreadResult {
  threadId: string;
  success: boolean;
  contributions: AgentContribution[];
  context: any;
  error?: string;
}

export class ParallelProcessingManager {
  private floorManager: FloorManager;
  private envelopeHandler: ConversationEnvelopeHandler;
  private collaborationManager: CollaborationPatternManager;
  
  private activeContexts: Map<string, ParallelProcessingContext> = new Map();
  private threadResults: Map<string, ThreadResult> = new Map();

  constructor(
    floorManager: FloorManager,
    envelopeHandler: ConversationEnvelopeHandler,
    collaborationManager: CollaborationPatternManager
  ) {
    this.floorManager = floorManager;
    this.envelopeHandler = envelopeHandler;
    this.collaborationManager = collaborationManager;
  }

  /**
   * Initialize parallel processing for a complex problem
   */
  async initializeParallelProcessing(
    problemId: string,
    coordinator: string,
    threadConfigs: Array<{
      type: ConversationThread['threadType'];
      participants: string[];
      context: any;
    }>
  ): Promise<string[]> {
    const context: ParallelProcessingContext = {
      problemId,
      activeThreads: new Map(),
      syncPoints: new Map(),
      globalContext: {},
      coordinator
    };

    const threadIds: string[] = [];

    // Create conversation threads
    for (const config of threadConfigs) {
      const threadId = `thread_${config.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const thread: ConversationThread = {
        id: threadId,
        parentProblemId: problemId,
        threadType: config.type,
        participants: config.participants,
        coordinator,
        status: 'active',
        startTime: new Date(),
        context: config.context,
        contributions: []
      };

      context.activeThreads.set(threadId, thread);
      threadIds.push(threadId);
    }

    this.activeContexts.set(problemId, context);

    // Notify coordinator about parallel processing initialization
    await this.notifyParallelProcessingStart(problemId, threadIds);

    return threadIds;
  }

  /**
   * Start a specific conversation thread
   */
  async startConversationThread(
    threadId: string,
    initialMessage?: string
  ): Promise<void> {
    const thread = this.findThreadById(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    // Create thread start envelope
    const threadEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'thread_start',
        threadId,
        threadType: thread.threadType,
        context: thread.context,
        initialMessage: initialMessage || `Starting ${thread.threadType} thread for parallel processing`
      },
      thread.coordinator,
      thread.participants,
      {
        thread_id: threadId,
        thread_type: thread.threadType,
        parallel_processing: true
      }
    );

    await this.envelopeHandler.routeEnvelope(threadEnvelope);
  }

  /**
   * Add contribution to a conversation thread
   */
  async addThreadContribution(
    threadId: string,
    contribution: AgentContribution
  ): Promise<void> {
    const thread = this.findThreadById(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    thread.contributions.push(contribution);

    // Notify other thread participants about the contribution
    const contributionEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'thread_contribution',
        threadId,
        contribution
      },
      contribution.agentId,
      thread.participants.filter(id => id !== contribution.agentId),
      {
        thread_id: threadId,
        parallel_processing: true
      }
    );

    await this.envelopeHandler.routeEnvelope(contributionEnvelope);
  }

  /**
   * Complete a conversation thread
   */
  async completeConversationThread(
    threadId: string,
    finalContribution?: AgentContribution
  ): Promise<ThreadResult> {
    const thread = this.findThreadById(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    if (finalContribution) {
      thread.contributions.push(finalContribution);
    }

    thread.status = 'completed';
    thread.endTime = new Date();

    const result: ThreadResult = {
      threadId,
      success: true,
      contributions: [...thread.contributions],
      context: thread.context
    };

    this.threadResults.set(threadId, result);

    // Notify thread completion
    await this.notifyThreadCompletion(threadId, result);

    // Check if this triggers any synchronization points
    await this.checkSynchronizationPoints(thread.parentProblemId);

    return result;
  }

  /**
   * Create a synchronization point for thread reconvening
   */
  async createSynchronizationPoint(
    problemId: string,
    requiredThreads: string[],
    syncType: ThreadSynchronizationPoint['syncType'] = 'all_complete',
    reconveningAgent: string,
    timeout?: number
  ): Promise<string> {
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const syncPoint: ThreadSynchronizationPoint = {
      id: syncId,
      problemId,
      waitingThreads: [...requiredThreads],
      completedThreads: [],
      requiredThreads: [...requiredThreads],
      syncType,
      reconveningAgent,
      timeout: timeout ? new Date(Date.now() + timeout) : undefined
    };

    const context = this.activeContexts.get(problemId);
    if (!context) {
      throw new Error(`Parallel processing context for problem ${problemId} not found`);
    }

    context.syncPoints.set(syncId, syncPoint);

    // Notify about synchronization point creation
    await this.notifySynchronizationPointCreated(syncId, syncPoint);

    return syncId;
  }

  /**
   * Reconvene threads at synchronization point
   */
  async reconveneThreads(
    syncId: string,
    reconveningMessage?: string
  ): Promise<AgentContribution[]> {
    const syncPoint = this.findSyncPointById(syncId);
    if (!syncPoint) {
      throw new Error(`Synchronization point ${syncId} not found`);
    }

    // Gather all contributions from completed threads
    const allContributions: AgentContribution[] = [];
    
    for (const threadId of syncPoint.completedThreads) {
      const result = this.threadResults.get(threadId);
      if (result && result.success) {
        allContributions.push(...result.contributions);
      }
    }

    // Mark sync point as completed by clearing waiting threads
    syncPoint.waitingThreads = [];

    // Create reconvening envelope
    const reconveningEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'thread_reconvening',
        syncId,
        completedThreads: syncPoint.completedThreads,
        allContributions,
        reconveningMessage: reconveningMessage || 'Reconvening parallel threads for synthesis'
      },
      syncPoint.reconveningAgent,
      this.getUniqueParticipants(syncPoint.completedThreads),
      {
        sync_id: syncId,
        parallel_processing: true,
        reconvening: true
      }
    );

    await this.envelopeHandler.routeEnvelope(reconveningEnvelope);

    return allContributions;
  }

  /**
   * Preserve context across parallel operations
   */
  async preserveContext(
    problemId: string,
    contextKey: string,
    contextValue: any
  ): Promise<void> {
    const context = this.activeContexts.get(problemId);
    if (!context) {
      throw new Error(`Parallel processing context for problem ${problemId} not found`);
    }

    context.globalContext[contextKey] = contextValue;

    // Notify all active threads about context update
    const contextEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'context_update',
        problemId,
        contextKey,
        contextValue
      },
      context.coordinator,
      this.getAllThreadParticipants(problemId),
      {
        parallel_processing: true,
        context_update: true
      }
    );

    await this.envelopeHandler.routeEnvelope(contextEnvelope);
  }

  /**
   * Get context value
   */
  getContext(problemId: string, contextKey: string): any {
    const context = this.activeContexts.get(problemId);
    return context?.globalContext[contextKey];
  }

  /**
   * Get all active threads for a problem
   */
  getActiveThreads(problemId: string): ConversationThread[] {
    const context = this.activeContexts.get(problemId);
    return context ? Array.from(context.activeThreads.values()) : [];
  }

  /**
   * Get thread results
   */
  getThreadResults(problemId: string): ThreadResult[] {
    const threads = this.getActiveThreads(problemId);
    return threads
      .map(thread => this.threadResults.get(thread.id))
      .filter((result): result is ThreadResult => result !== undefined);
  }

  /**
   * Get synchronization status
   */
  getSynchronizationStatus(problemId: string): {
    activeSyncPoints: ThreadSynchronizationPoint[];
    completedSyncPoints: ThreadSynchronizationPoint[];
    pendingThreads: string[];
  } {
    const context = this.activeContexts.get(problemId);
    if (!context) {
      return { activeSyncPoints: [], completedSyncPoints: [], pendingThreads: [] };
    }

    const syncPoints = Array.from(context.syncPoints.values());
    const activeSyncPoints = syncPoints.filter(sp => sp.waitingThreads.length > 0);
    const completedSyncPoints = syncPoints.filter(sp => sp.waitingThreads.length === 0);
    
    const pendingThreads = Array.from(context.activeThreads.values())
      .filter(thread => thread.status === 'active')
      .map(thread => thread.id);

    return { activeSyncPoints, completedSyncPoints, pendingThreads };
  }

  /**
   * Cleanup completed parallel processing contexts
   */
  async cleanupCompletedContexts(): Promise<void> {
    const now = new Date();
    
    for (const [problemId, context] of this.activeContexts.entries()) {
      const allThreadsCompleted = Array.from(context.activeThreads.values())
        .every(thread => thread.status === 'completed' || thread.status === 'failed');
      
      const allSyncPointsCompleted = Array.from(context.syncPoints.values())
        .every(sp => sp.waitingThreads.length === 0);
      
      // Clean up if all threads and sync points are completed, or if context is older than 10 minutes
      const isOld = Array.from(context.activeThreads.values())
        .some(thread => (now.getTime() - thread.startTime.getTime()) > 600000);
      
      const shouldCleanup = (allThreadsCompleted && allSyncPointsCompleted) || isOld;
      
      if (shouldCleanup) {
        this.activeContexts.delete(problemId);
        
        // Clean up thread results for this problem
        for (const thread of context.activeThreads.values()) {
          this.threadResults.delete(thread.id);
        }
      }
    }
  }

  /**
   * Helper methods
   */
  private findThreadById(threadId: string): ConversationThread | null {
    for (const context of this.activeContexts.values()) {
      const thread = context.activeThreads.get(threadId);
      if (thread) return thread;
    }
    return null;
  }

  private findSyncPointById(syncId: string): ThreadSynchronizationPoint | null {
    for (const context of this.activeContexts.values()) {
      const syncPoint = context.syncPoints.get(syncId);
      if (syncPoint) return syncPoint;
    }
    return null;
  }

  private async checkSynchronizationPoints(problemId: string): Promise<void> {
    const context = this.activeContexts.get(problemId);
    if (!context) return;

    for (const syncPoint of context.syncPoints.values()) {
      const completedThreadIds = Array.from(context.activeThreads.values())
        .filter(thread => thread.status === 'completed')
        .map(thread => thread.id);

      // Update completed threads for this sync point
      syncPoint.completedThreads = syncPoint.requiredThreads.filter(threadId =>
        completedThreadIds.includes(threadId)
      );

      syncPoint.waitingThreads = syncPoint.requiredThreads.filter(threadId =>
        !completedThreadIds.includes(threadId)
      );

      // Check if sync point conditions are met
      const shouldReconvene = this.shouldReconveneAtSyncPoint(syncPoint);
      
      if (shouldReconvene) {
        await this.reconveneThreads(syncPoint.id);
      }
    }
  }

  private shouldReconveneAtSyncPoint(syncPoint: ThreadSynchronizationPoint): boolean {
    switch (syncPoint.syncType) {
      case 'all_complete':
        return syncPoint.waitingThreads.length === 0;
      
      case 'majority_complete':
        const completedRatio = syncPoint.completedThreads.length / syncPoint.requiredThreads.length;
        return completedRatio > 0.5;
      
      case 'timeout_based':
        if (syncPoint.timeout) {
          return new Date() >= syncPoint.timeout;
        }
        return false;
      
      default:
        return false;
    }
  }

  private getAllThreadParticipants(problemId: string): string[] {
    const context = this.activeContexts.get(problemId);
    if (!context) return [];

    const participants = new Set<string>();
    for (const thread of context.activeThreads.values()) {
      thread.participants.forEach(p => participants.add(p));
    }
    
    return Array.from(participants);
  }

  private getUniqueParticipants(threadIds: string[]): string[] {
    const participants = new Set<string>();
    
    for (const threadId of threadIds) {
      const thread = this.findThreadById(threadId);
      if (thread) {
        thread.participants.forEach(p => participants.add(p));
      }
    }
    
    return Array.from(participants);
  }

  private async notifyParallelProcessingStart(
    problemId: string,
    threadIds: string[]
  ): Promise<void> {
    const context = this.activeContexts.get(problemId);
    if (!context) return;

    const notificationEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'parallel_processing_start',
        problemId,
        threadIds,
        threadCount: threadIds.length
      },
      context.coordinator,
      this.getAllThreadParticipants(problemId),
      {
        parallel_processing: true,
        initialization: true
      }
    );

    await this.envelopeHandler.routeEnvelope(notificationEnvelope);
  }

  private async notifyThreadCompletion(
    threadId: string,
    result: ThreadResult
  ): Promise<void> {
    const thread = this.findThreadById(threadId);
    if (!thread) return;

    const completionEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'thread_completion',
        threadId,
        threadType: thread.threadType,
        result
      },
      thread.coordinator,
      thread.participants,
      {
        thread_id: threadId,
        parallel_processing: true,
        completion: true
      }
    );

    await this.envelopeHandler.routeEnvelope(completionEnvelope);
  }

  private async notifySynchronizationPointCreated(
    syncId: string,
    syncPoint: ThreadSynchronizationPoint
  ): Promise<void> {
    const context = this.activeContexts.get(syncPoint.problemId);
    if (!context) return;

    const syncEnvelope = await this.envelopeHandler.createEnvelope(
      EventType.UTTERANCE,
      {
        type: 'sync_point_created',
        syncId,
        requiredThreads: syncPoint.requiredThreads,
        syncType: syncPoint.syncType
      },
      syncPoint.reconveningAgent,
      this.getAllThreadParticipants(syncPoint.problemId),
      {
        sync_id: syncId,
        parallel_processing: true,
        synchronization: true
      }
    );

    await this.envelopeHandler.routeEnvelope(syncEnvelope);
  }
}