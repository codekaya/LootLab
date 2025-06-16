import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../store/agentStore';
import type { AgentCharacteristics } from '../types/Agent';

const RoomContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background: #1a1a1a;
  position: relative;
  overflow: hidden;
`;

const Agent = styled(motion.div)<{ $color: string }>`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: ${props => props.$color};
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  font-size: 16px;
  padding: 0 8px;
  text-align: center;
  word-break: break-word;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  }
`;

const InteractionBubble = styled(motion.div)<{ $type: 'positive' | 'negative' | 'neutral' }>`
  position: absolute;
  background: ${props => 
    props.$type === 'positive' ? 'rgba(0, 255, 0, 0.2)' :
    props.$type === 'negative' ? 'rgba(255, 0, 0, 0.2)' :
    'rgba(255, 255, 255, 0.2)'
  };
  border: 1px solid ${props => 
    props.$type === 'positive' ? 'rgba(0, 255, 0, 0.5)' :
    props.$type === 'negative' ? 'rgba(255, 0, 0, 0.5)' :
    'rgba(255, 255, 255, 0.5)'
  };
  padding: 8px 12px;
  border-radius: 12px;
  color: white;
  font-size: 14px;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transform-origin: bottom center;
  pointer-events: none;
  z-index: 1000;
  will-change: transform;
`;

const StatsPanel = styled(motion.div)`
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 10px;
  color: white;
  max-width: 300px;
  z-index: 1000;
`;

const AgentStats = styled.div`
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.1);

  h3 {
    margin: 0 0 5px 0;
    font-size: 16px;
  }

  .stat {
    display: flex;
    justify-content: space-between;
    margin: 3px 0;
    font-size: 12px;
  }
`;

const getAgentColor = (agent: AgentCharacteristics) => {
  const { friendliness, aggression } = agent.personality;
  const r = Math.floor((aggression / 100) * 255);
  const g = Math.floor((friendliness / 100) * 255);
  const b = 100;
  return `rgb(${r}, ${g}, ${b})`;
};

export const Room = () => {
  const { 
    agents, 
    interactions, 
    updateAgentPosition, 
    addInteraction, 
    updateRelationship,
    startVoting 
  } = useAgentStore();
  
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const lastVoteTime = useRef<number>(Date.now());
  const lastInteractionTime = useRef<Map<string, number>>(new Map());
  const interactionCooldown = 3000; // 3 seconds cooldown between interactions

  const handleAgentInteraction = (
    agent1: AgentCharacteristics,
    agent2: AgentCharacteristics,
    now: number
  ) => {
    const pairKey = [agent1.name, agent2.name].sort().join('-');
    const lastInteraction = lastInteractionTime.current.get(pairKey) || 0;

    if (now - lastInteraction >= interactionCooldown) {
      lastInteractionTime.current.set(pairKey, now);

      // Generate interaction for both agents
      const relationship1 = agent1.relationships.get(agent2.name) || 0;
      const relationship2 = agent2.relationships.get(agent1.name) || 0;
      
      const type1 = relationship1 > 50 ? 'positive' : relationship1 < -50 ? 'negative' : 'neutral';
      const type2 = relationship2 > 50 ? 'positive' : relationship2 < -50 ? 'negative' : 'neutral';

      // First agent speaks
      const interaction1 = {
        type: type1 as 'positive' | 'negative' | 'neutral',
        message: `${agent1.name}: "${getInteractionMessage(agent1, agent2, type1)}"`,
        effect: {
          target: agent2.name,
          relationshipChange: type1 === 'positive' ? 10 : type1 === 'negative' ? -10 : 0,
        },
        timestamp: now,
        position: {
          x: agent1.position.x,
          y: agent1.position.y,
        },
        agentName: agent1.name,
      };

      // Second agent responds after a short delay
      setTimeout(() => {
        const interaction2 = {
          type: type2 as 'positive' | 'negative' | 'neutral',
          message: `${agent2.name}: "${getInteractionMessage(agent2, agent1, type2)}"`,
          effect: {
            target: agent1.name,
            relationshipChange: type2 === 'positive' ? 10 : type2 === 'negative' ? -10 : 0,
          },
          timestamp: Date.now(),
          position: {
            x: agent2.position.x,
            y: agent2.position.y,
          },
          agentName: agent2.name,
        };

        addInteraction(interaction2);
        updateRelationship(agent2.name, agent1.name, interaction2.effect.relationshipChange);
      }, 1000); // 1 second delay for response

      addInteraction(interaction1);
      updateRelationship(agent1.name, agent2.name, interaction1.effect.relationshipChange);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      agents.forEach((agent, name) => {
        if (!agent.isAlive) return;

        const newX = agent.position.x + agent.velocity.x;
        const newY = agent.position.y + agent.velocity.y;

        // Bounce off walls with some randomness
        if (newX <= 0 || newX >= window.innerWidth - 100) {
          agent.velocity.x *= -1;
          agent.velocity.y += (Math.random() - 0.5) * 0.5;
        }
        if (newY <= 0 || newY >= window.innerHeight - 100) {
          agent.velocity.y *= -1;
          agent.velocity.x += (Math.random() - 0.5) * 0.5;
        }

        // Add some random movement
        agent.velocity.x += (Math.random() - 0.5) * 0.1;
        agent.velocity.y += (Math.random() - 0.5) * 0.1;

        // Limit velocity
        const maxSpeed = 3;
        const speed = Math.sqrt(agent.velocity.x ** 2 + agent.velocity.y ** 2);
        if (speed > maxSpeed) {
          agent.velocity.x = (agent.velocity.x / speed) * maxSpeed;
          agent.velocity.y = (agent.velocity.y / speed) * maxSpeed;
        }

        updateAgentPosition(name, {
          x: Math.max(0, Math.min(window.innerWidth - 100, newX)),
          y: Math.max(0, Math.min(window.innerHeight - 100, newY)),
        });

        // Check for collisions with other agents
        agents.forEach((otherAgent, otherName) => {
          if (name === otherName || !otherAgent.isAlive) return;

          const dx = agent.position.x - otherAgent.position.x;
          const dy = agent.position.y - otherAgent.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            handleAgentInteraction(agent, otherAgent, now);
          }
        });
      });

      // Start voting every 30 seconds
      if (now - lastVoteTime.current > 30000) {
        startVoting();
        lastVoteTime.current = now;
      }
    }, 16);

    return () => clearInterval(interval);
  }, [agents, updateAgentPosition, addInteraction, updateRelationship, startVoting]);

  const getInteractionMessage = (agent1: AgentCharacteristics, agent2: AgentCharacteristics, type: 'positive' | 'negative' | 'neutral'): string => {
    const messages = {
      positive: [
        "I'm glad we're friends!",
        "You're such a great person!",
        "I trust you completely!",
      ],
      negative: [
        "I don't trust you...",
        "Stay away from me!",
        "Your behavior is concerning...",
      ],
      neutral: [
        "Hello there.",
        "Nice weather we're having.",
        "How are you doing?",
      ],
    };

    // Add personality-based variations
    if (agent1.personality.aggression > 70) {
      messages.negative.push("Don't mess with me!");
    }
    if (agent1.personality.friendliness > 70) {
      messages.positive.push("You're my favorite person here!");
    }
    if (agent1.personality.intelligence > 70) {
      messages.neutral.push("Have you considered the implications of our situation?");
    }

    return messages[type][Math.floor(Math.random() * messages[type].length)];
  };

  return (
    <RoomContainer ref={roomRef}>
      <AnimatePresence>
        {Array.from(agents.entries()).map(([name, agent]) => (
          agent.isAlive && (
            <Agent
              key={name}
              $color={getAgentColor(agent)}
              animate={{
                x: agent.position.x,
                y: agent.position.y,
                scale: selectedAgent === name ? 1.1 : 1,
              }}
              transition={{ type: "spring", stiffness: 100 }}
              onClick={() => setSelectedAgent(name === selectedAgent ? null : name)}
            >
              {name}
            </Agent>
          )
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {interactions.map((interaction, index) => {
          const agent = Array.from(agents.entries()).find(([name]) => name === interaction.agentName)?.[1];
          if (!agent) return null;

          return (
            <InteractionBubble
              key={index}
              $type={interaction.type}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: agent.position.x,
                y: agent.position.y - 50, // Reduced offset to bring bubbles closer to characters
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                duration: 0.3,
                x: { type: "spring", stiffness: 200, damping: 20 },
                y: { type: "spring", stiffness: 200, damping: 20 },
              }}
            >
              {interaction.message}
            </InteractionBubble>
          );
        })}
      </AnimatePresence>

      {selectedAgent && (
        <StatsPanel
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
        >
          <AgentStats>
            <h3>{selectedAgent}</h3>
            {agents.get(selectedAgent) && (
              <>
                <div className="stat">
                  <span>Friendliness:</span>
                  <span>{agents.get(selectedAgent)!.personality.friendliness}</span>
                </div>
                <div className="stat">
                  <span>Aggression:</span>
                  <span>{agents.get(selectedAgent)!.personality.aggression}</span>
                </div>
                <div className="stat">
                  <span>Trustworthiness:</span>
                  <span>{agents.get(selectedAgent)!.personality.trustworthiness}</span>
                </div>
                <div className="stat">
                  <span>Intelligence:</span>
                  <span>{agents.get(selectedAgent)!.personality.intelligence}</span>
                </div>
              </>
            )}
          </AgentStats>
        </StatsPanel>
      )}
    </RoomContainer>
  );
}; 