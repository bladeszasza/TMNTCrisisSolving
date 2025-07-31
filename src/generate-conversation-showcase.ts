#!/usr/bin/env npx ts-node

/**
 * Generate Conversation Showcase Script
 * 
 * Automatically generates HTML showcases of OFP multi-agent conversations
 * in comic book style format using the TMNT template.
 */

import { DemoSquadManager } from './demo/DemoSquadManager';
import path from 'path';

interface ShowcaseConfig {
  title?: string;
  outputDir?: string;
  openInBrowser?: boolean;
}

async function generateConversationShowcase(
  userMessage: string, 
  config: ShowcaseConfig = {}
) {
  console.log('🐢 Generating Conversation Showcase...');
  console.log('=====================================\n');

  const {
    title = 'TEENAGE MUTANT NINJA TURTLES: CRISIS RESPONSE',
    outputDir = './conversations',
    openInBrowser = true
  } = config;

  try {
    console.log('🚀 Initializing squad...');
    const squadManager = new DemoSquadManager();
    await squadManager.initialize();

    console.log(`✅ Squad initialized! AI Mode: ${squadManager.getAIStatus().isEnabled ? 'ENABLED' : 'FALLBACK'}`);
    console.log(`📝 Processing: "${userMessage}"\n`);

    const startTime = Date.now();
    const result = await squadManager.processNaturalConversationWithHTML(
      userMessage,
      title,
      outputDir
    );
    const totalTime = Date.now() - startTime;

    console.log('📊 SHOWCASE GENERATED:');
    console.log('======================');
    console.log(`💬 Agent responses: ${result.messages.length}`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(`📄 HTML file: ${result.htmlPath}`);
    console.log(`🎨 Template: Comic book style with TMNT theme`);

    // Show agent participation summary
    const agentStats = result.messages.reduce((stats, msg) => {
      const agent = msg.agentName;
      stats[agent] = (stats[agent] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    console.log('\n🎭 Agent Participation:');
    Object.entries(agentStats).forEach(([agent, count]) => {
      console.log(`  ${agent}: ${count} contribution${count !== 1 ? 's' : ''}`);
    });

    // Optionally open in browser
    if (openInBrowser) {
      console.log('\n🌐 Opening in browser...');
      const { exec } = require('child_process');
      const absolutePath = path.resolve(result.htmlPath);
      
      // Try to open with the default browser
      const command = process.platform === 'darwin' ? 'open' : 
                    process.platform === 'win32' ? 'start' : 'xdg-open';
      
      exec(`${command} "${absolutePath}"`, (error: any) => {
        if (error) {
          console.log('⚠️  Could not auto-open browser. Please open the file manually:');
          console.log(`   file://${absolutePath}`);
        } else {
          console.log('✅ Opened in browser!');
        }
      });
    }

    console.log('\n✅ Conversation showcase generated successfully!');
    return result.htmlPath;

  } catch (error) {
    console.error('❌ Failed to generate showcase:', error);
    process.exit(1);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npx ts-node src/generate-conversation-showcase.ts "Your crisis message"');
    console.log('');
    console.log('Examples:');
    console.log('  npx ts-node src/generate-conversation-showcase.ts "Emergency! Shredder is attacking Budapest!"');
    console.log('  npx ts-node src/generate-conversation-showcase.ts "Help! The Foot Clan has infiltrated our systems!"');
    process.exit(1);
  }

  const userMessage = args[0];
  const title = args[1]; // Optional custom title
  
  await generateConversationShowcase(userMessage, {
    title,
    outputDir: './conversations',
    openInBrowser: true
  });
}

// Predefined crisis scenarios for testing
export const CRISIS_SCENARIOS = {
  budapest: "Emergency! Shredder is planning something big in Budapest. He's got Rocksteady destroying Chain Bridge, Bebop causing chaos at Citadella, and Hun is protecting him while he hacks into EU systems. We need to stop this fast!",
  
  cybersecurity: "Alert! The Foot Clan has infiltrated our network systems and are stealing classified turtle training protocols. They've breached our firewall and are downloading our pizza recipes too!",
  
  multipleTargets: "Crisis! Shredder has split his forces - Bebop is causing mayhem at the power plant, Rocksteady is destroying the subway tunnels, and Karai is leading an assault on April's news station. We need to coordinate fast!",
  
  timeLimit: "URGENT! Shredder has activated a 10-minute countdown device that will shut down all communication networks in the city. We need to locate and disable it before total chaos erupts!",
  
  technicalChallenge: "Emergency! An unknown virus is spreading through all connected devices in the city, causing traffic lights to malfunction and emergency services to go offline. This has Shredder's digital signature all over it!"
};

// Quick test function for predefined scenarios
export async function testScenario(scenarioName: keyof typeof CRISIS_SCENARIOS) {
  const scenario = CRISIS_SCENARIOS[scenarioName];
  if (!scenario) {
    console.error(`Unknown scenario: ${scenarioName}`);
    console.log('Available scenarios:', Object.keys(CRISIS_SCENARIOS).join(', '));
    return;
  }

  console.log(`\n🧪 Testing scenario: ${scenarioName}`);
  return await generateConversationShowcase(scenario, {
    title: `TMNT: ${scenarioName.toUpperCase()} CRISIS`,
    outputDir: `./conversations/${scenarioName}`,
    openInBrowser: true
  });
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { generateConversationShowcase };