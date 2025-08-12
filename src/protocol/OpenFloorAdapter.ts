import { PersonalityConfig, ExpertiseArea } from '../utils/types';

export interface OFPAgentManifest {
  identification: {
    speakerUri: string;
    serviceUrl: string;
    organization: string;
    conversationalName: string;
    synopsis: string;
    department?: string;
    role?: string;
  };
  capabilities: Array<{
    keyphrases: string[];
    descriptions: string[];
    languages: string[];
    supportedLayers: {
      input: string[];
      output: string[];
    };
  }>;
}

export interface OFPMessage {
  openFloor: {
    schema: {
      version: string;
      url?: string;
    };
    conversation: {
      id: string;
      conversants?: string[];
    };
    sender: {
      speakerUri: string;
    };
    events: Array<{
      to?: {
        serviceUrl?: string;
        speakerUri?: string;
        private?: boolean;
      };
      eventType: string;
      reason?: string;
      parameters?: any;
    }>;
  };
}

export enum OFPEventType {
  UTTERANCE = 'utterance',
  INVITE = 'invite',
  UNINVITE = 'uninvite',
  DECLINE_INVITE = 'declineInvite',
  CONTEXT = 'context',
  GET_MANIFESTS = 'getManifests',
  PUBLISH_MANIFESTS = 'publishManifests',
  REQUEST_FLOOR = 'requestFloor',
  GRANT_FLOOR = 'grantFloor',
  REVOKE_FLOOR = 'revokeFloor',
  YIELD_FLOOR = 'yieldFloor',
  BYE = 'bye'
}

export class OpenFloorAdapter {
  private static instance: OpenFloorAdapter;
  
  private constructor() {}
  
  static getInstance(): OpenFloorAdapter {
    if (!OpenFloorAdapter.instance) {
      OpenFloorAdapter.instance = new OpenFloorAdapter();
    }
    return OpenFloorAdapter.instance;
  }

  /**
   * Create a proper OFP Assistant Manifest from squad agent personality
   */
  createAgentManifest(
    agentId: string, 
    personality: PersonalityConfig,
    serviceUrl: string = 'http://localhost:3000'
  ): OFPAgentManifest {
    return {
      identification: {
        speakerUri: `tag:cowabunga-crisis-squad.com,2025:${agentId}`,
        serviceUrl: `${serviceUrl}/agents/${agentId}`,
        organization: 'Cowabunga Crisis Squad',
        conversationalName: personality.name,
        synopsis: this.generateSynopsis(personality),
        department: 'Crisis Response Team',
        role: this.getRoleFromExpertise(personality.expertise_area)
      },
      capabilities: [
        {
          keyphrases: this.generateKeyphrases(personality),
          descriptions: [
            `${personality.expertise_area} expertise`,
            `${personality.name} style`
          ],
          languages: ['en-us'],
          supportedLayers: {
            input: ['text'],
            output: ['text']
          }
        }
      ]
    };
  }

  /**
   * Create OFP text utterance message
   */
  createTextUtterance(
    speakerUri: string,
    text: string,
    conversationId: string,
    recipientUri?: string
  ): OFPMessage {
    return {
      openFloor: {
        schema: {
          version: '1.0.0'
        },
        conversation: {
          id: conversationId
        },
        sender: {
          speakerUri
        },
        events: [
          {
            to: recipientUri ? { speakerUri: recipientUri } : undefined,
            eventType: OFPEventType.UTTERANCE,
            parameters: {
              text,
              timestamp: new Date().toISOString()
            }
          }
        ]
      }
    };
  }


  /**
   * Create floor management message
   */
  createFloorMessage(
    speakerUri: string,
    eventType: OFPEventType,
    conversationId: string,
    reason?: string,
    priority?: number
  ): OFPMessage {
    return {
      openFloor: {
        schema: {
          version: '1.0.0'
        },
        conversation: {
          id: conversationId
        },
        sender: {
          speakerUri
        },
        events: [
          {
            eventType,
            reason,
            parameters: {
              priority,
              timestamp: new Date().toISOString()
            }
          }
        ]
      }
    };
  }

  /**
   * Create manifest publication message
   */
  createManifestMessage(
    speakerUri: string,
    manifest: OFPAgentManifest,
    conversationId: string
  ): OFPMessage {
    return {
      openFloor: {
        schema: {
          version: '1.0.0'
        },
        conversation: {
          id: conversationId
        },
        sender: {
          speakerUri
        },
        events: [
          {
            eventType: OFPEventType.PUBLISH_MANIFESTS,
            parameters: {
              manifest,
              timestamp: new Date().toISOString()
            }
          }
        ]
      }
    };
  }

  /**
   * Generate synopsis from personality
   */
  private generateSynopsis(personality: PersonalityConfig): string {
    const expertiseDescriptions = {
      [ExpertiseArea.LEADERSHIP]: 'Coordinates team responses and provides strategic leadership',
      [ExpertiseArea.TECHNICAL]: 'Provides technical analysis, research, and implementation guidance',
      [ExpertiseArea.ATTITUDE]: 'Offers reality checks, direct advice, and tough-love perspectives',
      [ExpertiseArea.ENGAGEMENT]: 'Makes solutions engaging, actionable, and fun with creative analogies'
    };

    return `${personality.name} - ${expertiseDescriptions[personality.expertise_area]} with authentic 90s personality and shell-powered attitude.`;
  }

  /**
   * Generate keyphrases from personality and expertise
   */
  private generateKeyphrases(personality: PersonalityConfig): string[] {
    const baseKeyphrases = [
      'cowabunga', 'crisis', 'squad', 'teamwork', '90s', 'nostalgia'
    ];

    const expertiseKeyphrases = {
      [ExpertiseArea.LEADERSHIP]: ['leadership', 'coordination', 'strategy', 'team', 'planning'],
      [ExpertiseArea.TECHNICAL]: ['technical', 'analysis', 'research', 'implementation', 'technology'],
      [ExpertiseArea.ATTITUDE]: ['reality check', 'advice', 'direct', 'honest', 'tough love'],
      [ExpertiseArea.ENGAGEMENT]: ['fun', 'engaging', 'creative', 'analogies', 'motivation']
    };

    return [
      ...baseKeyphrases,
      ...expertiseKeyphrases[personality.expertise_area],
      ...personality.nineties_references.slice(0, 3), // Add some 90s refs
      personality.name.toLowerCase()
    ];
  }

  /**
   * Get role description from expertise area
   */
  private getRoleFromExpertise(expertise: ExpertiseArea): string {
    const roles = {
      [ExpertiseArea.LEADERSHIP]: 'Team Leader & Strategic Coordinator',
      [ExpertiseArea.TECHNICAL]: 'Technical Specialist & Research Analyst', 
      [ExpertiseArea.ATTITUDE]: 'Reality Check Specialist & Direct Advisor',
      [ExpertiseArea.ENGAGEMENT]: 'Engagement Specialist & Creative Problem Solver'
    };

    return roles[expertise];
  }

  /**
   * Validate OFP message structure
   */
  validateMessage(message: OFPMessage): boolean {
    try {
      // Check required fields
      if (!message.openFloor) return false;
      if (!message.openFloor.schema?.version) return false;
      if (!message.openFloor.conversation?.id) return false;
      if (!message.openFloor.sender?.speakerUri) return false;
      if (!Array.isArray(message.openFloor.events)) return false;
      
      // Check each event
      for (const event of message.openFloor.events) {
        if (!event.eventType) return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate OFP manifest structure
   */
  validateManifest(manifest: OFPAgentManifest): boolean {
    try {
      // Check identification section
      const id = manifest.identification;
      if (!id?.speakerUri || !id?.serviceUrl || !id?.organization || 
          !id?.conversationalName || !id?.synopsis) {
        return false;
      }

      // Check capabilities section
      if (!Array.isArray(manifest.capabilities)) return false;
      
      for (const capability of manifest.capabilities) {
        if (!Array.isArray(capability.keyphrases) ||
            !Array.isArray(capability.languages) ||
            !capability.supportedLayers?.input ||
            !capability.supportedLayers?.output) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
}