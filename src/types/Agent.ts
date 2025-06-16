export interface AgentCharacteristics {
  name: string;
  personality: {
    friendliness: number; // 0-100
    aggression: number; // 0-100
    trustworthiness: number; // 0-100
    intelligence: number; // 0-100
  };
  relationships: Map<string, number>; // Map of agent names to relationship scores
  isAlive: boolean;
  position: {
    x: number;
    y: number;
  };
  velocity: {
    x: number;
    y: number;
  };
}

export interface Interaction {
  type: 'positive' | 'negative' | 'neutral';
  message: string;
  effect: {
    target: string;
    relationshipChange: number;
  };
  timestamp: number;
  position: {
    x: number;
    y: number;
  };
  agentName: string;
}

export interface AgentState {
  agents: Map<string, AgentCharacteristics>;
  interactions: Interaction[];
  selectedVictim: string | null;
  updateAgentPosition: (name: string, position: { x: number; y: number }) => void;
  addInteraction: (interaction: Interaction) => void;
  updateRelationship: (agent1: string, agent2: string, change: number) => void;
  selectVictim: (name: string) => void;
  startVoting: () => void;
  voteForVictim: (voter: string, target: string) => void;
} 