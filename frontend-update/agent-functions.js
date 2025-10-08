// Agent-specific functions for different insurance domains
import { sendChatMessage } from './api-config.js';

// Claims Chat Agent
export async function sendClaimsMessage(message, history = []) {
  return await sendChatMessage(message, history, 'CLAIMS');
}

// Underwriting Agent
export async function sendUnderwritingMessage(message, history = []) {
  return await sendChatMessage(message, history, 'UNDERWRITING');
}

// Research Agent
export async function sendResearchMessage(message, history = []) {
  return await sendChatMessage(message, history, 'RESEARCH');
}

// Marine Insurance Agent
export async function sendMarineMessage(message, history = []) {
  return await sendChatMessage(message, history, 'MARINE');
}

// Cyber Insurance Agent
export async function sendCyberMessage(message, history = []) {
  return await sendChatMessage(message, history, 'CYBER');
}

// FNOL Processor Agent
export async function sendFNOLMessage(message, history = []) {
  return await sendChatMessage(message, history, 'FNOL');
}

// Claims Lifecycle Agent
export async function sendLifecycleMessage(message, history = []) {
  return await sendChatMessage(message, history, 'LIFECYCLE');
}

// Policy Assistant Agent
export async function sendPolicyMessage(message, history = []) {
  return await sendChatMessage(message, history, 'POLICY');
}

// Agent configuration for UI
export const AGENT_CONFIG = {
  CLAIMS: {
    name: 'Claims Chat',
    icon: '💬',
    description: 'File and manage insurance claims',
    color: '#3B82F6'
  },
  UNDERWRITING: {
    name: 'Underwriting',
    icon: '📋',
    description: 'Risk assessment and policy underwriting',
    color: '#8B5CF6'
  },
  RESEARCH: {
    name: 'Research',
    icon: '🔍',
    description: 'Insurance research and analysis',
    color: '#10B981'
  },
  MARINE: {
    name: 'Marine Insurance',
    icon: '🚢',
    description: 'Marine and cargo insurance',
    color: '#06B6D4'
  },
  CYBER: {
    name: 'Cyber Insurance',
    icon: '🔒',
    description: 'Cybersecurity and data protection',
    color: '#F59E0B'
  },
  FNOL: {
    name: 'FNOL Processor',
    icon: '📝',
    description: 'First Notice of Loss processing',
    color: '#EF4444'
  },
  LIFECYCLE: {
    name: 'Claims Lifecycle',
    icon: '🔄',
    description: 'End-to-end claims management',
    color: '#84CC16'
  },
  POLICY: {
    name: 'Policy Assistant',
    icon: '📄',
    description: 'Policy information and assistance',
    color: '#F97316'
  }
};