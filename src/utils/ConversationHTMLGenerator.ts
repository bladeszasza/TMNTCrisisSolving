/**
 * HTML Generator for OFP Conversations
 * 
 * Generates comic-book style HTML showcases of multi-agent conversations
 * using the TMNT theme template from sample.html
 */

import { DemoMessage } from '../demo/DemoSquadManager';
import * as fs from 'fs';
import * as path from 'path';

export interface ConversationSession {
  id: string;
  title: string;
  userMessage: string;
  timestamp: Date;
  messages: DemoMessage[];
  aiEnabled: boolean;
  duration?: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  color: string;
  description: string;
  avatar: string;
}

export class ConversationHTMLGenerator {
  private static readonly AGENTS: AgentConfig[] = [
    {
      id: 'leonardo',
      name: 'LEONARDO',
      color: '#0066cc',
      description: 'Leadership & Coordination',
      avatar: 'https://e7.pngegg.com/pngimages/361/589/png-clipart-tmnt-leonardo-head-illustration-leonardo-michaelangelo-donatello-teenage-mutant-ninja-turtles-teenage-mutant-ninja-turtles-masks-face-smiley.png'
    },
    {
      id: 'donatello',
      name: 'DONATELLO',
      color: '#9933cc',
      description: 'Technical Research',
      avatar: 'https://pngimg.com/d/ninja_turtles_PNG31.png'
    },
    {
      id: 'raphael',
      name: 'RAPHAEL',
      color: '#cc3333',
      description: 'Reality Checks & Attitude',
      avatar: 'https://e7.pngegg.com/pngimages/257/600/png-clipart-raphael-leonardo-donatello-michelangelo-teenage-mutant-ninja-turtles-tmnt-vertebrate-raphael.png'
    },
    {
      id: 'michelangelo',
      name: 'MICHELANGELO',
      color: '#ff9900',
      description: 'Engagement & Fun Solutions',
      avatar: 'https://e7.pngegg.com/pngimages/586/1007/png-clipart-ninja-turtle-michelangelo-leonardo-raphael-teenage-mutant-ninja-turtles-tmnt-food-raphael-thumbnail.png'
    }
  ];

  static generateHTML(session: ConversationSession): string {
    const agentStats = this.calculateAgentStats(session.messages);
    const sessionInfo = this.formatSessionInfo(session);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${session.title}</title>
    ${this.getStylesheet()}
</head>
<body>
    <div class="comic-container">
        ${this.generateExplosions()}
        
        ${this.generateTitle(session.title)}
        
        ${this.generateTurtleTeam()}
        
        ${this.generateCrisisAlert(session.userMessage)}
        
        ${this.generateSessionInfo(sessionInfo, agentStats)}
        
        <div class="comic-flow">
            ${this.generateComicCards(session.messages)}
        </div>
        
        ${this.generateFinalPanel(session)}
    </div>
</body>
</html>`;
  }

  private static calculateAgentStats(messages: DemoMessage[]): Record<string, number> {
    return messages.reduce((stats, msg) => {
      const agentId = msg.sender.toLowerCase();
      stats[agentId] = (stats[agentId] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);
  }

  private static formatSessionInfo(session: ConversationSession) {
    return {
      id: session.id,
      timestamp: session.timestamp.toLocaleString(),
      messageCount: session.messages.length,
      duration: session.duration ? `${session.duration}ms` : 'Unknown',
      aiMode: session.aiEnabled ? 'AI POWERED ✅' : 'FALLBACK MODE ⚠️'
    };
  }

  private static getStylesheet(): string {
    return `<style>
        @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@700&display=swap');
        
        body {
            background: #2c2c2c;
            padding: 20px;
            font-family: 'Comic Neue', cursive;
            margin: 0;
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(255, 0, 0, 0.1) 0%, transparent 20%),
                radial-gradient(circle at 90% 80%, rgba(0, 100, 255, 0.1) 0%, transparent 20%),
                radial-gradient(circle at 50% 50%, rgba(255, 255, 0, 0.05) 0%, transparent 30%);
        }
        
        .comic-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border: 6px solid #222;
            box-shadow: 
                0 0 0 3px #ffcc00,
                0 0 30px rgba(255, 0, 0, 0.7),
                inset 0 0 50px rgba(0, 0, 0, 0.1);
            position: relative;
            overflow: hidden;
        }
        
        .comic-container::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                linear-gradient(transparent 50%, rgba(0,0,0,0.05) 50%),
                linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.05) 50%);
            background-size: 4px 4px;
            pointer-events: none;
            z-index: 10;
        }
        
        .comic-title {
            font-family: 'Bangers', cursive;
            font-size: 48px;
            text-align: center;
            color: #ff0000;
            text-shadow: 
                4px 4px 0 #000,
                6px 6px 0 rgba(0,0,0,0.2);
            margin-bottom: 20px;
            letter-spacing: 3px;
            position: relative;
            transform: rotate(-2deg);
            padding: 10px;
            background: linear-gradient(to bottom, #ff9900, #ff3300);
            border: 4px solid #000;
            border-radius: 15px;
            box-shadow: 
                0 0 0 4px #ffcc00,
                8px 8px 0 rgba(0,0,0,0.3);
        }
        
        .session-info {
            background: #e6f3ff;
            border: 3px solid #0066cc;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 10px;
            box-shadow: 3px 3px 0 rgba(0,0,0,0.2);
        }
        
        .session-info h3 {
            font-family: 'Bangers', cursive;
            color: #0066cc;
            margin: 0 0 10px 0;
            font-size: 24px;
        }
        
        .session-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            font-size: 14px;
        }
        
        .crisis-alert {
            background: #ffcc00;
            border: 4px solid #ff0000;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 15px;
            box-shadow: 
                8px 8px 0 rgba(0,0,0,0.3),
                inset 0 0 20px rgba(255, 0, 0, 0.3);
            position: relative;
            transform: rotate(1deg);
        }
        
        .crisis-alert h2 {
            font-family: 'Bangers', cursive;
            color: #ff0000;
            font-size: 36px;
            margin: 0;
            text-align: center;
            text-shadow: 3px 3px 0 #000;
        }
        
        .crisis-text {
            font-size: 20px;
            font-weight: bold;
            color: #000;
            text-align: center;
            margin-top: 15px;
            line-height: 1.4;
        }
        
        .comic-flow {
            display: flex;
            flex-direction: column;
            gap: 25px;
        }
        
        .comic-card {
            display: flex;
            gap: 20px;
            padding: 20px;
            border: 4px solid #222;
            border-radius: 15px;
            background: white;
            box-shadow: 
                6px 6px 0 rgba(0,0,0,0.2),
                inset 0 0 30px rgba(0, 0, 0, 0.05);
            position: relative;
            transition: transform 0.3s ease;
        }
        
        .comic-card:hover {
            transform: scale(1.02);
            z-index: 5;
        }
        
        .leonardo-card {
            background: linear-gradient(135deg, #e6f3ff 0%, #b3d9ff 100%);
            border-color: #0066cc;
        }
        
        .donatello-card {
            background: linear-gradient(135deg, #f0e6ff 0%, #d9c2ff 100%);
            border-color: #9933cc;
        }
        
        .raphael-card {
            background: linear-gradient(135deg, #ffe6e6 0%, #ffb3b3 100%);
            border-color: #cc3333;
        }
        
        .michelangelo-card {
            background: linear-gradient(135deg, #fff0e6 0%, #ffd9b3 100%);
            border-color: #ff9900;
        }
        
        .turtle-avatar {
            width: 120px;
            height: 120px;
            border: 3px solid #222;
            border-radius: 10px;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 3px 3px 0 rgba(0,0,0,0.2);
            flex-shrink: 0;
        }
        
        .turtle-avatar img {
            max-width: 100px;
            max-height: 100px;
            object-fit: contain;
        }
        
        .speech-content {
            flex: 1;
        }
        
        .turtle-name {
            font-family: 'Bangers', cursive;
            font-size: 32px;
            margin-bottom: 15px;
            text-shadow: 2px 2px 0 rgba(0,0,0,0.2);
        }
        
        .leonardo-name { color: #0066cc; }
        .donatello-name { color: #9933cc; }
        .raphael-name { color: #cc3333; }
        .michelangelo-name { color: #ff9900; }
        
        .speech-bubble {
            background: white;
            border: 3px solid #222;
            border-radius: 25px;
            padding: 20px 25px;
            position: relative;
            font-size: 18px;
            line-height: 1.5;
            box-shadow: 
                3px 3px 0 rgba(0,0,0,0.2),
                inset 0 0 10px rgba(0, 0, 0, 0.05);
        }
        
        .speech-bubble::before {
            content: '';
            position: absolute;
            top: 30px;
            left: -15px;
            width: 0;
            height: 0;
            border-top: 15px solid transparent;
            border-bottom: 15px solid transparent;
            border-right: 15px solid #222;
        }
        
        .speech-bubble::after {
            content: '';
            position: absolute;
            top: 32px;
            left: -11px;
            width: 0;
            height: 0;
            border-top: 13px solid transparent;
            border-bottom: 13px solid transparent;
            border-right: 13px solid white;
        }
        
        .action-text {
            font-style: italic;
            color: #555;
            margin: 15px 0;
            font-size: 18px;
        }
        
        .emphasis {
            font-weight: bold;
            text-transform: uppercase;
            color: #ff0000;
            text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
        }
        
        .cowabunga {
            font-family: 'Bangers', cursive;
            font-size: 24px;
            color: #ff0000;
            text-shadow: 2px 2px 0 #000;
            display: inline-block;
            transform: rotate(-5deg);
        }
        
        .shell-shocked {
            font-weight: bold;
            color: #ff3300;
            text-transform: uppercase;
            text-shadow: 2px 2px 0 rgba(0,0,0,0.3);
            font-size: 1.1em;
        }
        
        .turtle-power {
            font-family: 'Bangers', cursive;
            color: #00cc66;
            text-shadow: 2px 2px 0 #000;
            font-size: 1.2em;
            display: inline-block;
            transform: rotate(2deg);
        }
        
        .radical {
            color: #ff6600;
            font-weight: bold;
            text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
            font-style: italic;
        }
        
        .tubular {
            color: #6600cc;
            font-weight: bold;
            text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
        }
        
        .gnarly {
            color: #cc3300;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .totally {
            color: #ff9900;
            font-weight: bold;
            font-style: italic;
            text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
        }
        
        .dude {
            color: #33cc99;
            font-weight: bold;
            text-transform: lowercase;
        }
        
        .shell-power {
            font-family: 'Bangers', cursive;
            color: #00aa00;
            text-shadow: 2px 2px 0 #000;
            font-size: 1.1em;
            display: inline-block;
            transform: rotate(1deg);
        }
        
        .wipeout {
            color: #ff0066;
            font-weight: bold;
            text-transform: uppercase;
            text-shadow: 2px 2px 0 rgba(0,0,0,0.3);
            letter-spacing: 2px;
        }
        
        .righteous {
            color: #6633ff;
            font-weight: bold;
            font-style: italic;
            text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
        }
        
        .bodacious {
            color: #ff3399;
            font-weight: bold;
            text-transform: capitalize;
            text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
        }
        
        .awesome {
            color: #ffaa00;
            font-weight: bold;
            text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
        }
        
        .panel-number {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #ffcc00;
            border: 3px solid #222;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 20px;
            font-family: 'Bangers', cursive;
            box-shadow: 3px 3px 0 rgba(0,0,0,0.2);
            z-index: 3;
        }
        
        .turtle-team {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .turtle-icon {
            width: 80px;
            height: 80px;
            border: 3px solid #222;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            font-weight: bold;
            box-shadow: 5px 5px 0 rgba(0,0,0,0.2);
            background: white;
        }
        
        .leonardo-icon { color: #0066cc; border-color: #0066cc; }
        .donatello-icon { color: #9933cc; border-color: #9933cc; }
        .raphael-icon { color: #cc3333; border-color: #cc3333; }
        .michelangelo-icon { color: #ff9900; border-color: #ff9900; }
        
        .final-panel {
            background: linear-gradient(to right, #0066cc 25%, #9933cc 25% 50%, #cc3333 50% 75%, #ff9900 75%);
            text-align: center;
            padding: 40px;
            border-radius: 15px;
            border: 4px solid #222;
            box-shadow: 
                0 0 0 4px #ffcc00,
                10px 10px 0 rgba(0,0,0,0.3);
            transform: rotate(-1deg);
        }
        
        .final-panel h2 {
            font-family: 'Bangers', cursive;
            font-size: 48px;
            color: white;
            text-shadow: 3px 3px 0 black;
            margin: 0;
            line-height: 1.2;
        }
        
        .final-panel span {
            font-size: 32px;
            display: block;
            margin-top: 15px;
            color: #ffcc00;
            text-shadow: 2px 2px 0 black;
        }
        
        .explosion {
            position: absolute;
            width: 30px;
            height: 30px;
            background: #ff9900;
            border-radius: 50%;
            box-shadow: 0 0 0 5px #ff3300, 0 0 0 10px #ffcc00;
            animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }
        
        .explosion:nth-child(1) { top: 20%; left: 10%; animation-delay: 0s; }
        .explosion:nth-child(2) { top: 70%; left: 90%; animation-delay: 0.5s; }
        .explosion:nth-child(3) { top: 40%; left: 80%; animation-delay: 1s; }
        .explosion:nth-child(4) { top: 80%; left: 20%; animation-delay: 1.5s; }
        .explosion:nth-child(5) { top: 10%; right: 15%; animation-delay: 2s; }
        .explosion:nth-child(6) { bottom: 10%; left: 30%; animation-delay: 2.5s; }
        .explosion:nth-child(7) { top: 60%; left: 5%; animation-delay: 3s; }
        .explosion:nth-child(8) { bottom: 30%; right: 10%; animation-delay: 3.5s; }
        
        .turtle-name {
            transition: all 0.3s ease;
        }
        
        .turtle-name:hover {
            transform: scale(1.1) rotate(5deg);
            text-shadow: 4px 4px 0 rgba(0,0,0,0.3);
        }
        
        .comic-card {
            animation: fadeInUp 0.6s ease-out forwards;
            opacity: 0;
            transform: translateY(30px);
        }
        
        @keyframes fadeInUp {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .comic-card:nth-child(1) { animation-delay: 0.1s; }
        .comic-card:nth-child(2) { animation-delay: 0.2s; }
        .comic-card:nth-child(3) { animation-delay: 0.3s; }
        .comic-card:nth-child(4) { animation-delay: 0.4s; }
        .comic-card:nth-child(5) { animation-delay: 0.5s; }
        .comic-card:nth-child(6) { animation-delay: 0.6s; }
        .comic-card:nth-child(7) { animation-delay: 0.7s; }
        .comic-card:nth-child(8) { animation-delay: 0.8s; }
        .comic-card:nth-child(9) { animation-delay: 0.9s; }
        .comic-card:nth-child(n+10) { animation-delay: 1s; }
        
        @media (max-width: 768px) {
            .comic-card {
                flex-direction: column;
                align-items: center;
            }
            
            .turtle-avatar {
                width: 100px;
                height: 100px;
            }
            
            .speech-bubble::before,
            .speech-bubble::after {
                top: -15px;
                left: 40px;
                border-right: 15px solid transparent;
                border-left: 15px solid transparent;
                border-top: 0;
                border-bottom: 15px solid #222;
            }
            
            .speech-bubble::after {
                top: -11px;
                left: 42px;
                border-bottom: 12px solid white;
            }
            
            .comic-title {
                font-size: 36px;
            }
            
            .speech-bubble {
                font-size: 16px;
            }
        }
    </style>`;
  }

  private static generateExplosions(): string {
    return `
        <div class="explosion"></div>
        <div class="explosion"></div>
        <div class="explosion"></div>
        <div class="explosion"></div>
        <div class="explosion"></div>
        <div class="explosion"></div>
        <div class="explosion"></div>
        <div class="explosion"></div>
    `;
  }

  private static generateTitle(title: string): string {
    return `<h1 class="comic-title">${title.toUpperCase()}</h1>`;
  }

  private static generateTurtleTeam(): string {
    return `
        <div class="turtle-team">
            <div class="turtle-icon leonardo-icon">L</div>
            <div class="turtle-icon donatello-icon">D</div>
            <div class="turtle-icon raphael-icon">R</div>
            <div class="turtle-icon michelangelo-icon">M</div>
        </div>
    `;
  }

  private static generateCrisisAlert(userMessage: string): string {
    return `
        <div class="crisis-alert">
            <h2>🚨 CRISIS ALERT 🚨</h2>
            <p class="crisis-text">${userMessage}</p>
        </div>
    `;
  }

  private static generateSessionInfo(sessionInfo: any, agentStats: Record<string, number>): string {
    return `
        <div class="session-info">
            <h3>Session Details</h3>
            <div class="session-stats">
                <div><strong>Session ID:</strong> ${sessionInfo.id}</div>
                <div><strong>Generated:</strong> ${sessionInfo.timestamp}</div>
                <div><strong>Messages:</strong> ${sessionInfo.messageCount}</div>
                <div><strong>Duration:</strong> ${sessionInfo.duration}</div>
                <div><strong>AI Mode:</strong> ${sessionInfo.aiMode}</div>
                <div><strong>Agent Participation:</strong> ${Object.entries(agentStats).map(([agent, count]) => `${agent.charAt(0).toUpperCase() + agent.slice(1)}: ${count}`).join(', ')}</div>
            </div>
        </div>
    `;
  }

  private static parseMessageContent(content: string): { segments: Array<{type: 'action' | 'speech', content: string}> } {
    // Handle content that may contain both action text and speech in different patterns
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const segments: Array<{type: 'action' | 'speech', content: string}> = [];
    let currentSpeechLines: string[] = [];
    
    // If no lines contain asterisks, treat entire content as speech
    const hasActionText = lines.some(line => line.startsWith('*') && line.endsWith('*'));
    
    if (!hasActionText) {
      segments.push({
        type: 'speech',
        content: content.trim()
      });
      return { segments };
    }
    
    // Process lines with action text
    for (const line of lines) {
      if (line.startsWith('*') && line.endsWith('*')) {
        // If we have accumulated speech lines, add them first
        if (currentSpeechLines.length > 0) {
          segments.push({
            type: 'speech',
            content: currentSpeechLines.join(' ')
          });
          currentSpeechLines = [];
        }
        // Add action text
        segments.push({
          type: 'action',
          content: line
        });
      } else {
        // Accumulate speech text
        currentSpeechLines.push(line);
      }
    }
    
    // Add any remaining speech lines
    if (currentSpeechLines.length > 0) {
      segments.push({
        type: 'speech',
        content: currentSpeechLines.join(' ')
      });
    }
    
    return { segments };
  }

  private static applyComicStyling(text: string): string {
    // Apply CSS classes to matching text patterns
    let styledText = text;
    
    // Define patterns and their corresponding CSS classes
    const stylePatterns = [
      { pattern: /\bCOWABUNGA\b/gi, className: 'cowabunga' },
      { pattern: /\bTURTLE POWER\b/gi, className: 'turtle-power' },
      { pattern: /\bSHELL-SHOCKED\b/gi, className: 'shell-shocked' },
      { pattern: /\bRADICAL\b/gi, className: 'radical' },
      { pattern: /\bTUBULAR\b/gi, className: 'tubular' },
      { pattern: /\bGNARLY\b/gi, className: 'gnarly' },
      { pattern: /\bTOTALLY\b/gi, className: 'totally' },
      { pattern: /\bDUDE(S)?\b/gi, className: 'dude' },
      { pattern: /\bSHELL POWER\b/gi, className: 'shell-power' },
      { pattern: /\bWIPEOUT\b/gi, className: 'wipeout' },
      { pattern: /\bRIGHTEOUS\b/gi, className: 'righteous' },
      { pattern: /\bBODACIOUS\b/gi, className: 'bodacious' },
      { pattern: /\bAWESOME\b/gi, className: 'awesome' },
      { pattern: /\b(TOUGH SHELL LOVE|MAXIMUM|DEAL WITH IT)\b/gi, className: 'emphasis' }
    ];
    
    // Apply each pattern
    for (const { pattern, className } of stylePatterns) {
      styledText = styledText.replace(pattern, (match) => 
        `<span class="${className}">${match}</span>`
      );
    }
    
    return styledText;
  }

  private static generateComicCards(messages: DemoMessage[]): string {
    return messages.map((message, index) => {
      const agent = this.AGENTS.find(a => a.id === message.sender.toLowerCase());
      if (!agent) return '';

      const { segments } = this.parseMessageContent(message.content);
      
      // Generate alternating content segments with comic styling
      const contentHtml = segments.map(segment => {
        if (segment.type === 'action') {
          return `<div class="action-text">${this.applyComicStyling(segment.content)}</div>`;
        } else {
          return `<div class="speech-bubble">${this.applyComicStyling(segment.content)}</div>`;
        }
      }).join('');

      return `
            <div class="comic-card ${agent.id}-card">
                <div class="panel-number">${index + 1}</div>
                <div class="turtle-avatar">
                    <img src="${agent.avatar}" alt="${agent.name}">
                </div>
                <div class="speech-content">
                    <div class="turtle-name ${agent.id}-name">${agent.name}</div>
                    ${contentHtml}
                </div>
            </div>
        `;
    }).join('');
  }

  private static generateFinalPanel(session: ConversationSession): string {
    const missionComplete = session.messages.length > 0 ? 'MISSION COMPLETE!' : 'TURTLE POWER!';
    return `
        <div class="final-panel">
            <h2>
                TURTLE POWER UNITED!<br>
                <span>${missionComplete}</span>
            </h2>
        </div>
    `;
  }

  static async saveToFile(session: ConversationSession, outputDir: string = './conversations'): Promise<string> {
    const html = this.generateHTML(session);
    const filename = `conversation_${session.id}_${Date.now()}.html`;
    const filepath = path.join(outputDir, filename);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(filepath, html, 'utf-8');
    return filepath;
  }
}