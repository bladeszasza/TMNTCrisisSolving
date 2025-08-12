# 🐢 Cowabunga Crisis Squad v1.0
## *Multi-Agent AI Conversation System*

> Multi-agent conversation system using the Teenage Mutant Ninja Turtles theme, built with the OpenFloor Protocol.

[![OpenFloor Protocol](https://img.shields.io/badge/OpenFloor-Protocol%20v1.0-00ff00)](https://openfloor.dev/)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/bladeszasza/TMNTCrisisSolving/)
[![AI Powered](https://img.shields.io/badge/AI-Gemini%20%2B%20Claude-purple)](https://github.com/bladeszasza/TMNTCrisisSolving/)

---

## 🚀 **Overview**

A demonstration of how AI agents can collaborate using the OpenFloor Protocol.

### ⚡ **Quick Start**

```bash
npm install
npm run demo:natural
```

Watch as Leonardo, Donatello, Raphael, and Michelangelo solve "Operation Retro Doom" in real-time, generating a comic-book style HTML showcase that opens in your browser.

---

## 🎭 **Meet Your AI-Powered Squad**

| Agent | Personality | Expertise | Catchphrases |
|-------|------------|-----------|--------------|
| **🔵 Leonardo** | Fearless Leader | Strategy & Coordination | *"Cowabunga! Let's coordinate our shell power!"* |
| **🟣 Donatello** | Tech Genius | Research & Analysis | *"This data is totally tubular!"* |
| **🔴 Raphael** | Tough Attitude | Reality Checks & Combat | *"Time for some tough shell love!"* |
| **🟠 Michelangelo** | Fun-Loving | Engagement & Morale | *"Dude, this solution is totally gnarly!"* |

---

## 🌟 **How It Works**

### 🎪 **Demo Experience**
Run the natural conversation test:

1. **🔥 Crisis Scenario**: A multi-threat situation unfolds
2. **🧠 AI Analysis**: Each agent decides if they should participate using AI
3. **💬 Natural Flow**: Agents coordinate using OpenFloor Protocol floor management
4. **🎨 Visual Showcase**: Generates comic-book style HTML

### 📱 **Live Web Demo**
```bash
npm run demo
# Opens http://localhost:3000 - Real-time WebSocket conversations
```

---

## 🛠 **Quick Start Guide**

### 🔧 **Setup (2 minutes)**
```bash
# Clone and install
git clone <your-repo>
cd TMNTCrisisSolving
npm install

# Set up AI (optional but recommended)
cp .env.example .env
# Add your API keys for full AI experience
```

### 🎮 **Choose Your Adventure**

#### 🚀 **AI-Powered Experience**
```bash
# Add to .env file:
GEMINI_API_KEY=your_key_here
CLAUDE_API_KEY=your_key_here  # Optional failover

npm run demo:natural
```
**Result**: AI-powered conversation with authentic personalities

### 🔧 **Architecture**
```
src/
├── agents/           # 🐢 The four turtle agents
├── protocol/         # 🌐 OpenFloor Protocol implementation
├── services/         # 🤖 AI service integrations
├── demo/            # 🎪 Web demo and showcases
└── utils/           # 🛠 Shared utilities and types
```

---

## 🔍 **Under the Hood**

### 🌟 **OpenFloor Protocol Implementation**
This system demonstrates standardized multi-agent communication:

- **Natural Turn-Taking**: Agents coordinate without rigid scripts
- **Context Preservation**: Agents maintain conversation context
- **Priority Management**: Agents can request floor control when needed

### 🧪 **Technical Implementation**
```typescript
// Agents analyze input using AI to determine relevance
const interestDecisions = await this.gatherAgentInterest(conversationId, newMessage);

// Natural floor management - no scripts needed!
for (const decision of interestedAgents) {
  await this.facilitateAgentContribution(conversationId, decision.agentId);
}
```

---

## 🎪 **Available Scenarios**

### 🚨 **"Operation Retro Doom"** *(Built-in Default)*
A multi-threat scenario involving dimensional portals, mind control VHS tapes, and arcade sabotage.

### 🌃 **Custom Crisis** *(Your Imagination)*
```bash
# Edit the userMessage in src/test-natural-conversation.ts
# Create your own crisis scenario and watch the agents respond!
```

---

## 🤝 **Special Thanks**

This project is built on the amazing **OpenFloor Protocol** created by the [Open Voice Interoperability Initiative](https://openfloor.dev/). 

> *"The OpenFloor Protocol represents the future of agent-to-agent communication, enabling seamless interoperability across different AI systems and platforms."*

**Thank you** to the OpenFloor Protocol authors for creating the foundation that makes this natural, engaging multi-agent experience possible! 🙏

---


### 🤖 **For Developers**
This codebase serves as an implementation example for:
- OpenFloor Protocol compliance
- Multi-agent AI systems
- Natural conversation flows
- Real-time web interfaces
- TypeScript

---

## 📚 **Deep Dive Documentation**

| Document | What You'll Learn |
|----------|-------------------|
| 📖 [**Conversational Flow Guide**](docs/conversational-flow-diagram.md) | Visual diagrams and technical deep-dive |
| 🏆 [**OpenFloor Compliance Report**](docs/openfloor-compliance-report.md) | Complete protocol adherence analysis |
| 🎪 [**Demo Guide**](src/demo/README.md) | How to run and customize demos |

---

### Cowabunga! 🎉

---

*Built with ❤️ using TypeScript, OpenFloor Protocol, and maximum turtle power!*

[![Powered by OpenFloor](https://img.shields.io/badge/Powered%20by-OpenFloor%20Protocol-brightgreen)](https://openfloor.dev/)
