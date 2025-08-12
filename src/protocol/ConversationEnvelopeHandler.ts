/**
 * ConversationEnvelopeHandler - Manages Open Floor Protocol envelope operations
 * Handles creation, validation, and routing of conversation envelopes for all event types
 */

import { Envelope as ConversationEnvelope } from '@openfloor/protocol';
import { OFPEventType as EventType, OpenFloorAdapter } from './OpenFloorAdapter';
import { DialogEvent } from '@openfloor/protocol';
// Mock UUID implementation for development
const uuidv4 = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export class ConversationEnvelopeHandler {
  private eventHandlers: Map<EventType, (envelope: ConversationEnvelope) => Promise<void>>;
  private validationRules: Map<EventType, (envelope: ConversationEnvelope) => boolean>;

  constructor() {
    this.eventHandlers = new Map();
    this.validationRules = new Map();
    this.initializeValidationRules();
    this.initializeDefaultHandlers();
  }

  /**
   * Creates a new conversation envelope with proper structure and validation
   */
  async createEnvelope(
    eventType: EventType,
    content: any,
    sender: string,
    recipients: string[],
    metadata?: Record<string, any>
  ): Promise<ConversationEnvelope> {
    const adapter = OpenFloorAdapter.getInstance();
    const conversationId = metadata?.conversationId || 'default-conversation';
    
    // Use OFP adapter to create proper envelopes
    if (eventType === EventType.UTTERANCE) {
      const text = content?.content || content?.text || String(content);
      const payload = adapter.createTextUtterance(
        `tag:squad:${sender}`,
        text,
        conversationId,
        recipients[0] ? `tag:squad:${recipients[0]}` : undefined
      );
      // Extract envelope from payload
      const envelope = (payload as any).openFloor;
      // Add legacy fields for compatibility but don't override OFP structure
      (envelope as any).id = uuidv4();
      (envelope as any).eventType = eventType;
      (envelope as any).content = content;
      (envelope as any).recipients = recipients;
      (envelope as any).timestamp = new Date();
      
      // Don't override the OFP sender structure - it should remain as { speakerUri }
      return envelope as any;
    }
    
    // For floor management events, create properly structured envelope
    const payload = adapter.createFloorMessage(
      `tag:squad:${sender}`,
      eventType,
      conversationId,
      content?.reason,
      content?.priority
    );
    
    // Extract envelope from payload
    const envelope = (payload as any).openFloor;
    
    // Fix parameters for different event types to match validation rules
    if (envelope.events?.[0]) {
      const event = envelope.events[0];
      if (eventType === EventType.GRANT_FLOOR) {
        event.parameters = {
          grantee: content?.grantee,
          granted_at: content?.granted_at,
          ...event.parameters
        };
      } else if (eventType === EventType.REVOKE_FLOOR) {
        event.parameters = {
          target: content?.target,
          revoked_at: content?.revoked_at,
          ...event.parameters
        };
      } else if (eventType === EventType.YIELD_FLOOR) {
        event.parameters = {
          yielded_at: content?.yielded_at,
          ...event.parameters
        };
      }
    }
    // Add legacy fields for compatibility but don't override OFP structure
    (envelope as any).id = uuidv4();
    (envelope as any).eventType = eventType;
    (envelope as any).content = content;
    (envelope as any).recipients = recipients;
    (envelope as any).timestamp = new Date();
    
    // Don't override the OFP sender structure - it should remain as { speakerUri }
    
    return envelope as any;
  }

  /**
   * Validates envelope structure and content based on event type
   */
  async validateEnvelope(envelope: ConversationEnvelope): Promise<boolean> {
    // Validate OFP envelope structure
    if (!envelope.schema?.version || !envelope.conversation?.id || 
        !envelope.sender?.speakerUri || !Array.isArray(envelope.events)) {
      return false;
    }
    
    // Validate each event
    for (const event of envelope.events) {
      if (!event.eventType) return false;
      // Re-enable basic validation for event parameters
      const validator = this.validationRules.get(event.eventType as EventType);
      if (validator && !validator(envelope)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Routes envelope to appropriate handlers based on event type
   */
  async routeEnvelope(envelope: ConversationEnvelope): Promise<void> {
    if (!await this.validateEnvelope(envelope)) {
      const id = envelope.events?.[0]?.eventType || envelope.conversation?.id || 'unknown';
      throw new Error(`Cannot route invalid envelope: ${id}`);
    }

    // Handle OFP envelope
    if (envelope.events?.[0]) {
      const event = envelope.events[0];
      const handler = this.eventHandlers.get(event.eventType as EventType);
      if (!handler) {
        throw new Error(`No handler registered for event type: ${event.eventType}`);
      }
      try {
        await handler(envelope);
      } catch (error) {
        throw new Error(`Error routing envelope: ${error instanceof Error ? error.message : String(error)}`);
      }
      return;
    }
  }

  /**
   * Processes dialog events with proper envelope wrapping
   */
  async processDialogEvent(event: DialogEvent): Promise<ConversationEnvelope> {
    // DialogEvent from OFP has id, speakerUri, span, features
    const textFeature = event.features.get('text');
    const text = textFeature?.tokens?.[0]?.value || '';
    const envelope = await this.createEnvelope(
      EventType.UTTERANCE,
      text,
      event.speakerUri || 'unknown',
      [], // Recipients will be determined by the routing system
      {
        dialog_id: event.id,
        conversation_id: 'default-conversation'
      }
    );

    await this.routeEnvelope(envelope);
    return envelope;
  }

  /**
   * Registers an event handler for a specific event type
   */
  registerEventHandler(eventType: EventType, handler: (envelope: ConversationEnvelope) => Promise<void>): void {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Unregisters an event handler
   */
  unregisterEventHandler(eventType: EventType): void {
    this.eventHandlers.delete(eventType);
  }

  /**
   * Creates a floor request envelope
   */
  async createFloorRequestEnvelope(
    requesterId: string,
    priority: number = 2,
    reason?: string
  ): Promise<ConversationEnvelope> {
    return this.createEnvelope(
      EventType.REQUEST_FLOOR,
      {
        priority,
        reason: reason || 'Agent requesting floor control'
      },
      requesterId,
      ['floor_manager'], // Floor manager handles all floor requests
      { request_priority: priority }
    );
  }

  /**
   * Creates a floor grant envelope
   */
  async createFloorGrantEnvelope(
    granterId: string,
    granteeId: string
  ): Promise<ConversationEnvelope> {
    return this.createEnvelope(
      EventType.GRANT_FLOOR,
      {
        grantee: granteeId,
        granted_at: new Date()
      },
      granterId,
      [granteeId],
      { floor_transition: true }
    );
  }

  /**
   * Creates a floor revoke envelope
   */
  async createFloorRevokeEnvelope(
    revokerId: string,
    targetId: string,
    reason: string
  ): Promise<ConversationEnvelope> {
    return this.createEnvelope(
      EventType.REVOKE_FLOOR,
      {
        target: targetId,
        reason,
        revoked_at: new Date()
      },
      revokerId,
      [targetId],
      { floor_transition: true, revocation_reason: reason }
    );
  }

  /**
   * Creates a floor yield envelope
   */
  async createFloorYieldEnvelope(
    yielderId: string,
    reason?: string
  ): Promise<ConversationEnvelope> {
    return this.createEnvelope(
      EventType.YIELD_FLOOR,
      {
        reason: reason || 'Agent yielding floor control',
        yielded_at: new Date()
      },
      yielderId,
      ['floor_manager'],
      { floor_transition: true }
    );
  }

  /**
   * Creates a manifest request envelope
   */
  async createManifestRequestEnvelope(
    requesterId: string,
    filter?: Record<string, any>
  ): Promise<ConversationEnvelope> {
    return this.createEnvelope(
      EventType.GET_MANIFESTS,
      {
        filter: filter || {},
        requested_at: new Date()
      },
      requesterId,
      ['discovery_service'],
      { manifest_request: true }
    );
  }

  /**
   * Creates a manifest publish envelope
   */
  async createManifestPublishEnvelope(
    publisherId: string,
    manifest: any
  ): Promise<ConversationEnvelope> {
    return this.createEnvelope(
      EventType.PUBLISH_MANIFESTS,
      {
        manifest,
        published_at: new Date()
      },
      publisherId,
      ['discovery_service'],
      { manifest_publish: true }
    );
  }

  /**
   * Creates a bye envelope for session termination
   */
  async createByeEnvelope(
    senderId: string,
    reason?: string
  ): Promise<ConversationEnvelope> {
    return this.createEnvelope(
      EventType.BYE,
      {
        reason: reason || 'Agent leaving conversation',
        departure_time: new Date()
      },
      senderId,
      ['all'], // Notify all participants
      { session_termination: true }
    );
  }

  /**
   * Initialize validation rules for each event type
   */
  private initializeValidationRules(): void {
    this.validationRules.set(EventType.UTTERANCE, (envelope) => {
      const evt = envelope.events?.[0];
      return evt?.eventType === 'utterance' && !!evt.parameters;
    });

    this.validationRules.set(EventType.REQUEST_FLOOR, (envelope) => {
      const evt = envelope.events?.[0];
      const priority = evt?.parameters?.priority;
      return typeof priority === 'number' && priority >= 1 && priority <= 4;
    });

    this.validationRules.set(EventType.GRANT_FLOOR, (envelope) => {
      const evt = envelope.events?.[0];
      return !!evt?.parameters?.grantee && !!evt?.parameters?.granted_at;
    });

    this.validationRules.set(EventType.REVOKE_FLOOR, (envelope) => {
      const evt = envelope.events?.[0];
      return !!evt?.parameters?.target && !!evt?.reason && !!evt?.parameters?.revoked_at;
    });

    this.validationRules.set(EventType.YIELD_FLOOR, (envelope) => {
      const evt = envelope.events?.[0];
      return !!evt?.parameters?.yielded_at;
    });

    this.validationRules.set(EventType.GET_MANIFESTS, (envelope) => {
      const evt = envelope.events?.[0];
      return !!evt?.parameters?.requested_at;
    });

    this.validationRules.set(EventType.PUBLISH_MANIFESTS, (envelope) => {
      const evt = envelope.events?.[0];
      return !!evt?.parameters?.manifest && !!evt?.parameters?.published_at;
    });

    this.validationRules.set(EventType.BYE, (envelope) => {
      const evt = envelope.events?.[0];
      return !!evt?.parameters?.departure_time;
    });
  }

  /**
   * Initialize default event handlers to prevent "No handler registered" errors
   */
  private initializeDefaultHandlers(): void {
    // Default handler for grant floor events
    this.eventHandlers.set(EventType.GRANT_FLOOR, async (envelope) => {
      const evt = envelope.events?.[0];
      const sender = envelope.sender.speakerUri;
      const grantee = evt?.parameters?.grantee;
      console.log(`🎤 Floor granted to ${grantee} by ${sender}`);
    });

    // Default handler for revoke floor events
    this.eventHandlers.set(EventType.REVOKE_FLOOR, async (envelope) => {
      const evt = envelope.events?.[0];
      const sender = envelope.sender.speakerUri;
      const target = evt?.parameters?.target;
      const reason = evt?.reason;
      console.log(`❌ Floor revoked from ${target} by ${sender}: ${reason}`);
    });

    // Default handler for yield floor events
    this.eventHandlers.set(EventType.YIELD_FLOOR, async (envelope) => {
      const evt = envelope.events?.[0];
      const sender = envelope.sender.speakerUri;
      const reason = evt?.reason;
      console.log(`✋ Floor yielded by ${sender}: ${reason}`);
    });

    // Default handler for dialog events
    this.eventHandlers.set(EventType.UTTERANCE, async (envelope) => {
      const evt = envelope.events?.[0];
      const sender = envelope.sender.speakerUri;
      console.log(`💬 Dialog from ${sender}: ${JSON.stringify(evt?.parameters)}`);
    });

    // Default handler for request floor events
    this.eventHandlers.set(EventType.REQUEST_FLOOR, async (envelope) => {
      const evt = envelope.events?.[0];
      const sender = envelope.sender.speakerUri;
      const priority = evt?.parameters?.priority;
      console.log(`🙋 Floor request from ${sender} with priority ${priority}`);
    });

    // Default handler for manifest publishing
    this.eventHandlers.set(EventType.PUBLISH_MANIFESTS, async (envelope) => {
      const sender = envelope.sender.speakerUri;
      console.log(`📋 Manifest published by ${sender}`);
    });

    // Default handler for get manifests
    this.eventHandlers.set(EventType.GET_MANIFESTS, async (envelope) => {
      const sender = envelope.sender.speakerUri;
      console.log(`🔍 Manifest request from ${sender}`);
    });

    // Default handler for bye events
    this.eventHandlers.set(EventType.BYE, async (envelope) => {
      const evt = envelope.events?.[0];
      const sender = envelope.sender.speakerUri;
      const reason = evt?.parameters?.reason;
      console.log(`👋 ${sender} leaving: ${reason}`);
    });
  }
}