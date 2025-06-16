import { create } from 'zustand';
import type { AgentState, AgentCharacteristics, Interaction } from '../types/Agent';

const generateRandomPersonality = () => ({
  friendliness: Math.floor(Math.random() * 100),
  aggression: Math.floor(Math.random() * 100),
  trustworthiness: Math.floor(Math.random() * 100),
  intelligence: Math.floor(Math.random() * 100),
});

const generateInitialAgents = (count: number): Map<string, AgentCharacteristics> => {
  const agents = new Map();
  const names = ['Geeny', 'Kaya', 'Cinax', 'Vovo', 'P1A', 'Ege'];
  
  for (let i = 0; i < count; i++) {
    const name = names[i];
    const agent: AgentCharacteristics = {
      name,
      personality: generateRandomPersonality(),
      relationships: new Map(),
      isAlive: true,
      position: {
        x: Math.random() * 800,
        y: Math.random() * 600,
      },
      velocity: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
      },
    };

    // Initialize relationships with other agents
    names.forEach(otherName => {
      if (otherName !== name) {
        agent.relationships.set(otherName, 0);
      }
    });

    agents.set(name, agent);
  }
  
  return agents;
};

const generateInteractionMessage = (
  agent1: AgentCharacteristics,
  agent2: AgentCharacteristics,
  type: 'positive' | 'negative' | 'neutral'
): string => {
  const { friendliness: f1, aggression: a1, intelligence: i1 } = agent1.personality;

  const messages = {
    positive: [
      "I really enjoy our conversations!",
      "You're such a great person to be around!",
      "I trust you completely!",
      "Your intelligence is inspiring!",
    ],
    negative: [
      "I don't trust you at all...",
      "Stay away from me!",
      "Your behavior is concerning...",
      "I don't like your attitude!",
    ],
    neutral: [
      "Hello there.",
      "Nice weather we're having.",
      "How are you doing?",
      "Interesting day, isn't it?",
    ],
  };

  // Add personality-based variations
  if (a1 > 70) {
    messages.negative.push("Don't mess with me!");
  }
  if (f1 > 70) {
    messages.positive.push("You're my favorite person here!");
  }
  if (i1 > 70) {
    messages.neutral.push("Have you considered the implications of our situation?");
  }

  return messages[type][Math.floor(Math.random() * messages[type].length)];
};

const calculateRelationshipChange = (
  agent1: AgentCharacteristics,
  agent2: AgentCharacteristics,
  interactionType: 'positive' | 'negative' | 'neutral'
): number => {
  const { friendliness: f1, aggression: a1, trustworthiness: t1, intelligence: i1 } = agent1.personality;
  const { friendliness: f2, aggression: a2, trustworthiness: t2, intelligence: i2 } = agent2.personality;

  let baseChange = 0;
  
  // Base change based on interaction type
  switch (interactionType) {
    case 'positive':
      baseChange = 10;
      break;
    case 'negative':
      baseChange = -10;
      break;
    case 'neutral':
      baseChange = 0;
      break;
  }

  // Personality compatibility factors
  const friendlinessMatch = Math.abs(f1 - f2) < 30 ? 5 : -5;
  const aggressionMatch = Math.abs(a1 - a2) < 30 ? 5 : -5;
  const trustMatch = Math.abs(t1 - t2) < 30 ? 5 : -5;
  const intelligenceMatch = Math.abs(i1 - i2) < 30 ? 5 : -5;

  // Calculate final change
  let finalChange = baseChange;
  finalChange += friendlinessMatch;
  finalChange += aggressionMatch;
  finalChange += trustMatch;
  finalChange += intelligenceMatch;

  // Add some randomness
  finalChange += Math.floor(Math.random() * 7) - 3;

  return finalChange;
};

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: generateInitialAgents(6),
  interactions: [],
  selectedVictim: null,
  
  updateAgentPosition: (name: string, position: { x: number; y: number }) =>
    set((state) => {
      const agents = new Map(state.agents);
      const agent = agents.get(name);
      if (agent) {
        agents.set(name, { ...agent, position });
      }
      return { agents };
    }),
    
  addInteraction: (interaction: Interaction) =>
    set((state) => {
      // Remove old interactions that are more than 8 seconds old
      const now = Date.now();
      const recentInteractions = state.interactions.filter(
        i => now - i.timestamp < 8000
      );
      
      // Keep only the last 3 interactions to make conversations more readable
      return {
        interactions: [...recentInteractions, interaction].slice(-3),
      };
    }),
    
  updateRelationship: (agent1: string, agent2: string, change: number) =>
    set((state) => {
      const agents = new Map(state.agents);
      const agent1Data = agents.get(agent1);
      const agent2Data = agents.get(agent2);
      
      if (agent1Data && agent2Data) {
        // Cap relationship changes to prevent extreme swings
        const maxChange = 15;
        const cappedChange = Math.max(-maxChange, Math.min(maxChange, change));
        
        const newRelationship1 = Math.max(-100, Math.min(100, (agent1Data.relationships.get(agent2) || 0) + cappedChange));
        const newRelationship2 = Math.max(-100, Math.min(100, (agent2Data.relationships.get(agent1) || 0) + cappedChange));
        
        agent1Data.relationships.set(agent2, newRelationship1);
        agent2Data.relationships.set(agent1, newRelationship2);
        
        agents.set(agent1, agent1Data);
        agents.set(agent2, agent2Data);
      }
      
      return { agents };
    }),
    
  selectVictim: (name: string) =>
    set((state) => {
      const agents = new Map(state.agents);
      const agent = agents.get(name);
      if (agent) {
        agents.set(name, { ...agent, isAlive: false });
        
        // Add a dramatic interaction about the death
        const interaction: Interaction = {
          type: 'negative',
          message: `${name} has been eliminated!`,
          effect: {
            target: name,
            relationshipChange: 0,
          },
          timestamp: Date.now(),
          position: {
            x: agent.position.x,
            y: agent.position.y,
          },
          agentName: name,
        };
        
        state.addInteraction(interaction);
      }
      return { agents, selectedVictim: name };
    }),

  startVoting: () => {
    const state = get();
    const aliveAgents = Array.from(state.agents.entries())
      .filter(([_, agent]) => agent.isAlive);

    if (aliveAgents.length <= 1) return;

    // Count votes for each agent
    const voteCounts = new Map<string, number>();
    aliveAgents.forEach(([name]) => voteCounts.set(name, 0));

    // Each agent votes based on their relationships and personality
    aliveAgents.forEach(([voterName, voter]) => {
      const votes = new Map<string, number>();
      
      aliveAgents.forEach(([targetName, target]) => {
        if (voterName === targetName) return;
        
        const relationship = voter.relationships.get(targetName) || 0;
        const { aggression, friendliness, trustworthiness } = voter.personality;
        
        // Calculate vote weight based on personality and relationship
        let voteWeight = -relationship; // Negative relationship means more likely to vote against
        voteWeight += (aggression - 50) * 0.5; // Aggressive agents are more likely to vote against others
        voteWeight -= (friendliness - 50) * 0.3; // Friendly agents are less likely to vote against others
        voteWeight += (trustworthiness - 50) * 0.2; // Trustworthy agents are more likely to vote based on relationships
        
        votes.set(targetName, voteWeight);
      });
      
      // Find the target with the highest vote weight
      const [targetName] = Array.from(votes.entries())
        .sort((a, b) => b[1] - a[1])[0];
      
      voteCounts.set(targetName, (voteCounts.get(targetName) || 0) + 1);
      state.voteForVictim(voterName, targetName);
    });

    // Find the agent with the most votes
    const [victimName] = Array.from(voteCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    // Eliminate the victim
    state.selectVictim(victimName);
  },

  voteForVictim: (voter: string, target: string) => {
    set((state) => {
      const agents = new Map(state.agents);
      const voterAgent = agents.get(voter);
      const targetAgent = agents.get(target);
      
      if (voterAgent && targetAgent) {
        // Update relationships based on the vote
        const voteEffect = -20; // Voting against someone decreases relationship
        state.updateRelationship(voter, target, voteEffect);
        
        // Add an interaction about the vote
        const interaction: Interaction = {
          type: 'negative',
          message: `${voter} has voted against ${target}!`,
          effect: {
            target,
            relationshipChange: voteEffect,
          },
          timestamp: Date.now(),
          position: {
            x: voterAgent.position.x,
            y: voterAgent.position.y,
          },
          agentName: voter,
        };
        
        state.addInteraction(interaction);
      }
      
      return { agents };
    });
  },
})); 