/**
 * FloorManager - Manages floor control for Open Floor Protocol conversations
 * Handles floor requests, grants, revokes, and yields with priority-based queuing
 */

import { ConversationEnvelopeHandler } from './ConversationEnvelopeHandler';
import { Priority, FloorRequest, FloorTransition } from '../utils/types';

export interface FloorManagerConfig {
  defaultTimeout: number; // milliseconds
  maxQueueSize: number;
  leonardoPriority: Priority;
  deadlockDetectionInterval: number; // milliseconds
  maxRetries: number;
  gracefulDegradationEnabled: boolean;
}

export interface AgentHealthStatus {
  agentId: string;
  isResponsive: boolean;
  lastActivity: Date;
  consecutiveFailures: number;
  isAvailable: boolean;
}

export interface DeadlockDetectionResult {
  isDeadlocked: boolean;
  involvedAgents: string[];
  detectionTime: Date;
  resolutionStrategy: 'revoke_all' | 'prioritize_leader' | 'reset_queue';
}

export class FloorManager {
  private currentSpeaker: string | null = null;
  private floorQueue: FloorRequest[] = [];
  private floorHistory: FloorTransition[] = [];
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private envelopeHandler: ConversationEnvelopeHandler;
  private config: FloorManagerConfig;
  private registeredAgents: Set<string> = new Set();
  private agentPriorities: Map<string, Priority> = new Map();
  
  // Error handling and recovery state
  private agentHealthStatus: Map<string, AgentHealthStatus> = new Map();
  private deadlockDetectionTimer: NodeJS.Timeout | null = null;
  private retryAttempts: Map<string, number> = new Map();
  private unavailableAgents: Set<string> = new Set();
  private errorCallbacks: Map<string, (error: Error, agentId: string) => void> = new Map();

  constructor(
    envelopeHandler: ConversationEnvelopeHandler,
    config: Partial<FloorManagerConfig> = {}
  ) {
    this.envelopeHandler = envelopeHandler;
    this.config = {
      defaultTimeout: 30000, // 30 seconds
      maxQueueSize: 10,
      leonardoPriority: Priority.LEADER,
      deadlockDetectionInterval: 60000, // 1 minute
      maxRetries: 3,
      gracefulDegradationEnabled: true,
      ...config
    };
    
    // Start deadlock detection if enabled
    if (this.config.gracefulDegradationEnabled) {
      this.startDeadlockDetection();
    }
  }



  /**
   * Grants floor control to specified agent
   */
  async grantFloor(agentId: string): Promise<void> {
    if (!agentId) {
      throw new Error('Agent ID is required for floor grant');
    }

    // Remove from queue if present
    const requestIndex = this.floorQueue.findIndex(req => req.agentId === agentId);
    if (requestIndex >= 0) {
      this.floorQueue.splice(requestIndex, 1);
    }

    // Record transition
    const transition: FloorTransition = {
      from: this.currentSpeaker,
      to: agentId,
      timestamp: new Date(),
      reason: 'Floor granted'
    };
    this.floorHistory.push(transition);

    // Clear existing timeout
    if (this.currentSpeaker) {
      this.clearTimeout(this.currentSpeaker);
    }

    // Update current speaker
    const previousSpeaker = this.currentSpeaker;
    this.currentSpeaker = agentId;

    // Set timeout for new speaker
    this.setFloorTimeout(agentId);

    // Create and send grant envelope
    const envelope = await this.envelopeHandler.createFloorGrantEnvelope('floor_manager', agentId);
    await this.envelopeHandler.routeEnvelope(envelope);

    // Notify previous speaker if different
    if (previousSpeaker && previousSpeaker !== agentId) {
      const revokeEnvelope = await this.envelopeHandler.createFloorRevokeEnvelope(
        'floor_manager',
        previousSpeaker,
        'Floor granted to another agent'
      );
      await this.envelopeHandler.routeEnvelope(revokeEnvelope);
    }
  }

  /**
   * Revokes floor control from specified agent
   */
  async revokeFloor(agentId: string, reason: string): Promise<void> {
    if (!agentId) {
      throw new Error('Agent ID is required for floor revocation');
    }

    if (!reason) {
      throw new Error('Reason is required for floor revocation');
    }

    // Only revoke if agent currently has floor
    if (this.currentSpeaker !== agentId) {
      throw new Error(`Cannot revoke floor from ${agentId}: not current speaker`);
    }

    // Clear timeout
    this.clearTimeout(agentId);

    // Record transition
    const transition: FloorTransition = {
      from: agentId,
      to: null,
      timestamp: new Date(),
      reason
    };
    this.floorHistory.push(transition);

    // Update current speaker
    this.currentSpeaker = null;

    // Create and send revoke envelope
    const envelope = await this.envelopeHandler.createFloorRevokeEnvelope('floor_manager', agentId, reason);
    await this.envelopeHandler.routeEnvelope(envelope);

    // Process next in queue
    await this.processNextInQueue();
  }

  /**
   * Agent yields floor control voluntarily
   */
  async yieldFloor(agentId: string, reason?: string): Promise<void> {
    if (!agentId) {
      throw new Error('Agent ID is required for floor yield');
    }

    // Only yield if agent currently has floor
    if (this.currentSpeaker !== agentId) {
      throw new Error(`Cannot yield floor from ${agentId}: not current speaker`);
    }

    // Clear timeout
    this.clearTimeout(agentId);

    // Record transition
    const transition: FloorTransition = {
      from: agentId,
      to: null,
      timestamp: new Date(),
      reason: reason || 'Agent yielded floor control'
    };
    this.floorHistory.push(transition);

    // Update current speaker
    this.currentSpeaker = null;

    // Create and send yield envelope
    const envelope = await this.envelopeHandler.createFloorYieldEnvelope(agentId, reason);
    await this.envelopeHandler.routeEnvelope(envelope);

    // Process next in queue
    await this.processNextInQueue();
  }

  /**
   * Gets current floor status
   */
  getFloorStatus(): {
    currentSpeaker: string | null;
    queueLength: number;
    nextInQueue: string | null;
  } {
    return {
      currentSpeaker: this.currentSpeaker,
      queueLength: this.floorQueue.length,
      nextInQueue: this.floorQueue.length > 0 ? this.floorQueue[0].agentId : null
    };
  }

  /**
   * Gets current speaker
   */
  getCurrentSpeaker(): string | null {
    return this.currentSpeaker;
  }

  /**
   * Gets floor queue
   */
  getFloorQueue(): FloorRequest[] {
    return [...this.floorQueue];
  }

  /**
   * Gets last transition timestamp
   */
  getLastTransition(): string | null {
    if (this.floorHistory.length === 0) {
      return null;
    }
    return this.floorHistory[this.floorHistory.length - 1].timestamp.toISOString();
  }

  /**
   * Gets floor history
   */
  getFloorHistory(): FloorTransition[] {
    return [...this.floorHistory]; // Return copy to prevent mutation
  }

  /**
   * Gets current queue state
   */
  getQueue(): FloorRequest[] {
    return [...this.floorQueue]; // Return copy to prevent mutation
  }

  /**
   * Validates floor transition from one agent to another
   */
  private validateFloorTransition(from: string | null, to: string): boolean {
    // Can always grant to someone if no current speaker
    if (!from) {
      return true;
    }

    // Cannot grant to same agent
    if (from === to) {
      return false;
    }

    // Leonardo (leader) can always take floor with highest priority
    if (to === 'leonardo') {
      return true;
    }

    return true; // Allow other transitions
  }

  /**
   * Sorts queue by priority (highest first) and timestamp (earliest first for same priority)
   */
  private sortQueue(): void {
    this.floorQueue.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Earlier timestamp first for same priority
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }

  /**
   * Processes next request in queue
   */
  private async processNextInQueue(): Promise<void> {
    if (this.floorQueue.length === 0) {
      return;
    }

    const nextRequest = this.floorQueue[0];
    
    // Validate transition
    if (this.validateFloorTransition(this.currentSpeaker, nextRequest.agentId)) {
      await this.grantFloor(nextRequest.agentId);
    } else {
      // Remove invalid request and try next
      this.floorQueue.shift();
      await this.processNextInQueue();
    }
  }



  /**
   * Clears timeout for specified agent
   */
  private clearTimeout(agentId: string): void {
    const timeout = this.timeouts.get(agentId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(agentId);
    }
  }

  /**
   * Registers a new agent for floor management
   */
  registerAgent(agentId: string, priority: Priority = Priority.NORMAL): void {
    if (!agentId) {
      throw new Error('Agent ID is required for registration');
    }

    this.registeredAgents.add(agentId);
    this.agentPriorities.set(agentId, priority);
    
    // Log registration for debugging
    console.log(`Agent ${agentId} registered with floor manager (priority: ${priority})`);
  }

  /**
   * Registers multiple agents at once for batch operations
   */
  registerAgents(agents: Array<{ id: string; priority?: Priority }>): void {
    for (const agent of agents) {
      this.registerAgent(agent.id, agent.priority || Priority.NORMAL);
    }
  }

  /**
   * Unregisters an agent from floor management
   */
  unregisterAgent(agentId: string): void {
    if (!agentId) {
      return;
    }

    // Remove from registered agents
    this.registeredAgents.delete(agentId);
    this.agentPriorities.delete(agentId);

    // Clear any timeouts
    this.clearTimeout(agentId);

    // Remove from queue
    this.floorQueue = this.floorQueue.filter(req => req.agentId !== agentId);

    // If agent currently has floor, revoke it
    if (this.currentSpeaker === agentId) {
      this.currentSpeaker = null;
      // Process next in queue
      this.processNextInQueue().catch(error => {
        console.error('Error processing next in queue after agent unregistration:', error);
      });
    }
  }

  /**
   * Updates an agent's priority
   */
  updateAgentPriority(agentId: string, priority: Priority): void {
    if (!this.registeredAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    this.agentPriorities.set(agentId, priority);

    // If agent is in queue, update their request priority and re-sort
    const queueRequest = this.floorQueue.find(req => req.agentId === agentId);
    if (queueRequest) {
      queueRequest.priority = priority;
      this.sortQueue();
    }
  }

  /**
   * Gets list of registered agents
   */
  getRegisteredAgents(): string[] {
    return Array.from(this.registeredAgents);
  }

  /**
   * Checks if an agent is registered
   */
  isAgentRegistered(agentId: string): boolean {
    return this.registeredAgents.has(agentId);
  }

  /**
   * Gets an agent's priority
   */
  getAgentPriority(agentId: string): Priority | undefined {
    return this.agentPriorities.get(agentId);
  }

  /**
   * Error Handling and Recovery Methods
   */

  /**
   * Handles timeout recovery for unresponsive agents
   */
  private async handleAgentTimeout(agentId: string): Promise<void> {
    try {
      console.warn(`Agent ${agentId} timed out - initiating recovery`);
      
      // Update agent health status
      this.updateAgentHealth(agentId, false);
      
      // Increment retry attempts
      const currentRetries = this.retryAttempts.get(agentId) || 0;
      this.retryAttempts.set(agentId, currentRetries + 1);
      
      // Check if agent should be marked as unavailable
      if (currentRetries >= this.config.maxRetries) {
        await this.markAgentUnavailable(agentId, 'Maximum timeout retries exceeded');
        return;
      }
      
      // Revoke floor and process next in queue
      if (this.currentSpeaker === agentId) {
        await this.revokeFloor(agentId, `Timeout recovery (attempt ${currentRetries + 1})`);
      }
      
      // Trigger error callback if registered
      const errorCallback = this.errorCallbacks.get(agentId);
      if (errorCallback) {
        errorCallback(new Error(`Agent timeout (attempt ${currentRetries + 1})`), agentId);
      }
      
    } catch (error) {
      console.error(`Error during timeout recovery for agent ${agentId}:`, error);
      // Force mark as unavailable if recovery fails
      await this.markAgentUnavailable(agentId, 'Timeout recovery failed');
    }
  }

  /**
   * Detects and resolves deadlock situations
   */
  private async detectAndResolveDeadlock(): Promise<DeadlockDetectionResult | null> {
    const now = new Date();
    const deadlockThreshold = this.config.defaultTimeout * 2; // Double the normal timeout
    
    // Check for potential deadlock conditions
    const potentialDeadlock = this.currentSpeaker && 
      this.floorQueue.length > 0 &&
      this.floorHistory.length > 0;
    
    if (!potentialDeadlock) {
      return null;
    }
    
    // Check if current speaker has been holding floor too long
    const lastTransition = this.floorHistory[this.floorHistory.length - 1];
    const timeSinceLastTransition = now.getTime() - lastTransition.timestamp.getTime();
    
    if (timeSinceLastTransition < deadlockThreshold) {
      return null;
    }
    
    // Check for circular dependencies in queue
    const involvedAgents = [this.currentSpeaker!, ...this.floorQueue.map(req => req.agentId)];
    const uniqueAgents = new Set(involvedAgents);
    
    // Determine resolution strategy
    let resolutionStrategy: 'revoke_all' | 'prioritize_leader' | 'reset_queue' = 'reset_queue';
    
    if (involvedAgents.includes('leonardo')) {
      resolutionStrategy = 'prioritize_leader';
    } else if (this.floorQueue.length > this.config.maxQueueSize / 2) {
      resolutionStrategy = 'revoke_all';
    }
    
    const result: DeadlockDetectionResult = {
      isDeadlocked: true,
      involvedAgents: Array.from(uniqueAgents),
      detectionTime: now,
      resolutionStrategy
    };
    
    console.warn('Deadlock detected:', result);
    await this.resolveDeadlock(result);
    
    return result;
  }

  /**
   * Resolves detected deadlock using specified strategy
   */
  private async resolveDeadlock(deadlock: DeadlockDetectionResult): Promise<void> {
    try {
      switch (deadlock.resolutionStrategy) {
        case 'prioritize_leader':
          await this.prioritizeLeaderResolution(deadlock.involvedAgents);
          break;
        case 'revoke_all':
          await this.revokeAllAndReset();
          break;
        case 'reset_queue':
        default:
          await this.resetQueueResolution();
          break;
      }
      
      console.log(`Deadlock resolved using strategy: ${deadlock.resolutionStrategy}`);
      
    } catch (error) {
      console.error('Error resolving deadlock:', error);
      // Fallback to complete reset
      await this.emergencyReset();
    }
  }

  /**
   * Prioritizes Leonardo (leader) in deadlock resolution
   */
  private async prioritizeLeaderResolution(involvedAgents: string[]): Promise<void> {
    if (involvedAgents.includes('leonardo')) {
      // Clear current floor and grant to Leonardo
      if (this.currentSpeaker && this.currentSpeaker !== 'leonardo') {
        await this.revokeFloor(this.currentSpeaker, 'Deadlock resolution - prioritizing leader');
      }
      
      // Remove Leonardo from queue if present and grant floor
      this.floorQueue = this.floorQueue.filter(req => req.agentId !== 'leonardo');
      await this.grantFloor('leonardo');
    } else {
      // No leader involved, fall back to queue reset
      await this.resetQueueResolution();
    }
  }

  /**
   * Revokes all floors and resets the system
   */
  private async revokeAllAndReset(): Promise<void> {
    // Revoke current floor
    if (this.currentSpeaker) {
      await this.revokeFloor(this.currentSpeaker, 'Deadlock resolution - system reset');
    }
    
    // Clear queue
    this.floorQueue = [];
    
    // Reset all timeouts
    for (const [agentId, timeout] of this.timeouts.entries()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
  }

  /**
   * Resets queue while preserving current speaker
   */
  private async resetQueueResolution(): Promise<void> {
    // Clear queue but keep current speaker
    const queuedAgents = this.floorQueue.map(req => req.agentId);
    this.floorQueue = [];
    
    // Notify queued agents that they need to re-request
    for (const agentId of queuedAgents) {
      try {
        const envelope = await this.envelopeHandler.createFloorRevokeEnvelope(
          'floor_manager',
          agentId,
          'Deadlock resolution - please re-request floor'
        );
        await this.envelopeHandler.routeEnvelope(envelope);
      } catch (error) {
        console.error(`Error notifying agent ${agentId} of queue reset:`, error);
      }
    }
  }

  /**
   * Emergency reset of entire floor management system
   */
  private async emergencyReset(): Promise<void> {
    console.warn('Performing emergency reset of floor management system');
    
    // Clear all state
    this.currentSpeaker = null;
    this.floorQueue = [];
    
    // Clear all timeouts
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    
    // Reset retry attempts
    this.retryAttempts.clear();
    
    // Mark all agents as needing health check
    for (const agentId of this.registeredAgents) {
      this.updateAgentHealth(agentId, false);
    }
  }

  /**
   * Marks an agent as unavailable and handles graceful degradation
   */
  private async markAgentUnavailable(agentId: string, reason: string): Promise<void> {
    if (this.unavailableAgents.has(agentId)) {
      return; // Already marked as unavailable
    }
    
    console.warn(`Marking agent ${agentId} as unavailable: ${reason}`);
    
    this.unavailableAgents.add(agentId);
    this.updateAgentHealth(agentId, false, false);
    
    // Remove from queue
    this.floorQueue = this.floorQueue.filter(req => req.agentId !== agentId);
    
    // Revoke floor if currently held
    if (this.currentSpeaker === agentId) {
      this.currentSpeaker = null;
      await this.processNextInQueue();
    }
    
    // Clear any timeouts
    this.clearTimeout(agentId);
    
    // Reset retry attempts
    this.retryAttempts.delete(agentId);
    
    // Trigger error callback
    const errorCallback = this.errorCallbacks.get(agentId);
    if (errorCallback) {
      errorCallback(new Error(`Agent marked unavailable: ${reason}`), agentId);
    }
  }

  /**
   * Attempts to restore an unavailable agent
   */
  async restoreAgent(agentId: string): Promise<boolean> {
    if (!this.unavailableAgents.has(agentId)) {
      return true; // Agent is already available
    }
    
    try {
      // Reset agent state
      this.unavailableAgents.delete(agentId);
      this.retryAttempts.delete(agentId);
      this.updateAgentHealth(agentId, true, true);
      
      console.log(`Agent ${agentId} restored to available status`);
      return true;
      
    } catch (error) {
      console.error(`Error restoring agent ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Updates agent health status
   */
  private updateAgentHealth(agentId: string, isResponsive: boolean, isAvailable: boolean = true): void {
    const currentStatus = this.agentHealthStatus.get(agentId);
    const consecutiveFailures = isResponsive ? 0 : (currentStatus?.consecutiveFailures || 0) + 1;
    
    const healthStatus: AgentHealthStatus = {
      agentId,
      isResponsive,
      lastActivity: new Date(),
      consecutiveFailures,
      isAvailable
    };
    
    this.agentHealthStatus.set(agentId, healthStatus);
  }

  /**
   * Starts deadlock detection timer
   */
  private startDeadlockDetection(): void {
    if (this.deadlockDetectionTimer) {
      clearInterval(this.deadlockDetectionTimer);
    }
    
    this.deadlockDetectionTimer = setInterval(async () => {
      try {
        await this.detectAndResolveDeadlock();
      } catch (error) {
        console.error('Error in deadlock detection:', error);
      }
    }, this.config.deadlockDetectionInterval);
  }

  /**
   * Stops deadlock detection timer
   */
  private stopDeadlockDetection(): void {
    if (this.deadlockDetectionTimer) {
      clearInterval(this.deadlockDetectionTimer);
      this.deadlockDetectionTimer = null;
    }
  }

  /**
   * Registers error callback for an agent
   */
  registerErrorCallback(agentId: string, callback: (error: Error, agentId: string) => void): void {
    this.errorCallbacks.set(agentId, callback);
  }

  /**
   * Unregisters error callback for an agent
   */
  unregisterErrorCallback(agentId: string): void {
    this.errorCallbacks.delete(agentId);
  }

  /**
   * Gets health status for all agents
   */
  getAgentHealthStatus(): Map<string, AgentHealthStatus> {
    return new Map(this.agentHealthStatus);
  }

  /**
   * Gets health status for a specific agent
   */
  getAgentHealth(agentId: string): AgentHealthStatus | undefined {
    return this.agentHealthStatus.get(agentId);
  }

  /**
   * Gets list of unavailable agents
   */
  getUnavailableAgents(): string[] {
    return Array.from(this.unavailableAgents);
  }

  /**
   * Checks if an agent is available
   */
  isAgentAvailable(agentId: string): boolean {
    return !this.unavailableAgents.has(agentId);
  }

  /**
   * Forces a health check for all registered agents
   */
  async performHealthCheck(): Promise<Map<string, AgentHealthStatus>> {
    const healthResults = new Map<string, AgentHealthStatus>();
    
    for (const agentId of this.registeredAgents) {
      try {
        // Update last activity time for responsive check
        this.updateAgentHealth(agentId, true);
        healthResults.set(agentId, this.agentHealthStatus.get(agentId)!);
      } catch (error) {
        console.error(`Health check failed for agent ${agentId}:`, error);
        this.updateAgentHealth(agentId, false);
        healthResults.set(agentId, this.agentHealthStatus.get(agentId)!);
      }
    }
    
    return healthResults;
  }

  /**
   * Enhanced timeout handling with recovery
   */
  private setFloorTimeout(agentId: string): void {
    const timeout = setTimeout(async () => {
      try {
        await this.handleAgentTimeout(agentId);
      } catch (error) {
        console.error(`Error handling timeout for agent ${agentId}:`, error);
        // Force mark as unavailable if timeout handling fails
        await this.markAgentUnavailable(agentId, 'Timeout handling failed');
      }
    }, this.config.defaultTimeout);

    this.timeouts.set(agentId, timeout);
  }

  /**
   * Enhanced request floor with availability checking
   */
  async requestFloor(agentId: string, priority: Priority = Priority.NORMAL, reason?: string): Promise<boolean> {
    // Validate request
    if (!agentId) {
      throw new Error('Agent ID is required for floor request');
    }

    // Check if agent is available
    if (!this.isAgentAvailable(agentId)) {
      throw new Error(`Agent ${agentId} is currently unavailable`);
    }

    // Update agent health - mark as responsive since they're making a request
    this.updateAgentHealth(agentId, true);

    // Check if agent is registered (allow unregistered agents but with warning)
    if (!this.registeredAgents.has(agentId)) {
      console.warn(`Agent ${agentId} is not registered but requesting floor - auto-registering with normal priority`);
      this.registerAgent(agentId, priority);
    }

    // Use agent's registered priority if not explicitly provided
    const effectivePriority = this.agentPriorities.get(agentId) || priority;

    // Check if agent already has floor
    if (this.currentSpeaker === agentId) {
      return true; // Already has floor
    }

    // Check if agent is already in queue
    const existingRequest = this.floorQueue.find(req => req.agentId === agentId);
    if (existingRequest) {
      // Update priority if higher
      if (priority > existingRequest.priority) {
        existingRequest.priority = priority;
        existingRequest.reason = reason || existingRequest.reason;
        this.sortQueue();
      }
      return false; // Still in queue
    }

    // Check queue capacity
    if (this.floorQueue.length >= this.config.maxQueueSize) {
      throw new Error('Floor request queue is full');
    }

    // Add to queue
    const request: FloorRequest = {
      agentId,
      priority: effectivePriority,
      timestamp: new Date(),
      reason: reason || 'Agent requesting floor control'
    };

    this.floorQueue.push(request);
    this.sortQueue();

    // If no current speaker, grant immediately to highest priority
    if (!this.currentSpeaker) {
      await this.processNextInQueue();
      return this.currentSpeaker === agentId;
    }

    // Create and send floor request envelope
    const envelope = await this.envelopeHandler.createFloorRequestEnvelope(agentId, effectivePriority, reason);
    await this.envelopeHandler.routeEnvelope(envelope);

    return false; // Request queued
  }

  /**
   * Clears all timeouts (for cleanup)
   */
  public cleanup(): void {
    // Stop deadlock detection
    this.stopDeadlockDetection();
    
    // Clear all timeouts
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    
    // Clear all state
    this.currentSpeaker = null;
    this.floorQueue = [];
    this.registeredAgents.clear();
    this.agentPriorities.clear();
    
    // Clear error handling state
    this.agentHealthStatus.clear();
    this.retryAttempts.clear();
    this.unavailableAgents.clear();
    this.errorCallbacks.clear();
  }
}