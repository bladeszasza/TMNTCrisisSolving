/**
 * Simple Conversation Test
 * 
 * Test basic conversation flow without the complex coordination
 */

import { DemoSquadManager } from './demo/DemoSquadManager';
import dotenv from 'dotenv';

dotenv.config();

async function testSimpleConversation() {
  console.log('\n🎯 Simple Conversation Flow Test');
  console.log('=================================');

  try {
    // Initialize the squad
    const squadManager = new DemoSquadManager();
    await squadManager.initialize();
    
    console.log(`✅ Squad initialized with AI: ${squadManager.getAIStatus().isEnabled}`);

    // Test the Budapest message
    const userMessage = "Dudes! We just got intel that Shredder and his Foot Clan are planning to destroy Budapest! We need to get there incognito and stop their evil plan. How do we approach this mission?";
    
    console.log('\n💬 User Message:');
    console.log(`"${userMessage}"`);
    
    console.log('\n🐢 Processing message...');
    const response = await squadManager.processUserMessage(userMessage);
    
    console.log('\n📤 Squad Response:');
    console.log('==================');
    console.log(`🎭 ${response.agentName}: ${response.content}`);
    
    // Check conversation history
    const history = squadManager.getConversationHistory();
    console.log(`\n📊 Conversation has ${history.length} messages`);
    
    // Get squad status
    const squadStatus = squadManager.getSquadStatus();
    console.log(`\n👥 Squad Status: ${squadStatus.totalAgents} agents, ${squadStatus.activeConversations} active conversations`);
    
    console.log('\n🎊 Simple conversation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

if (require.main === module) {
  testSimpleConversation().catch(console.error);
}