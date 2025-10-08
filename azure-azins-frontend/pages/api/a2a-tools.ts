import { NextApiRequest, NextApiResponse } from "next";

// A2A (Agent-to-Agent) Tools Integration
interface A2AToolRequest {
  tool: string;
  parameters: Record<string, any>;
  requestingAgent: string;
  targetAgent?: string;
  sessionId: string;
}

interface A2AToolResponse {
  success: boolean;
  result?: any;
  error?: string;
  tool: string;
  executedBy: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Available A2A tools
const availableTools = {
  time: {
    description: "Get current date and time",
    parameters: ["timezone?"],
    agents: ["*"] // Available to all agents
  },
  calculator: {
    description: "Perform mathematical calculations",
    parameters: ["expression"],
    agents: ["*"]
  },
  weather: {
    description: "Get weather information",
    parameters: ["city?"],
    agents: ["MARINE_SPECIALIST", "CLAIMS_MANAGER"]
  },
  file_operations: {
    description: "Read/write files and documents",
    parameters: ["operation", "path", "content?"],
    agents: ["POLICY_ASSISTANT", "FNOL_PROCESSOR", "CLAIMS_MANAGER"]
  },
  memory: {
    description: "Store and retrieve agent memory",
    parameters: ["operation", "key", "value?", "category?"],
    agents: ["*"]
  },
  http_request: {
    description: "Make HTTP requests to external APIs",
    parameters: ["url", "method", "headers?", "body?"],
    agents: ["RESEARCH_ASSISTANT", "MARKETING_AGENT", "INVESTMENT_RESEARCH"]
  },
  browser: {
    description: "Browse web pages and extract content",
    parameters: ["url"],
    agents: ["RESEARCH_ASSISTANT", "MARKETING_AGENT"]
  },
  code_interpreter: {
    description: "Execute code snippets",
    parameters: ["code", "language"],
    agents: ["INVESTMENT_RESEARCH", "RESEARCH_ASSISTANT"]
  },
  agent_communication: {
    description: "Communicate with other agents",
    parameters: ["targetAgent", "message", "context?"],
    agents: ["*"]
  }
};

// Tool implementations
async function executeTool(toolName: string, parameters: any, requestingAgent: string): Promise<any> {
  switch (toolName) {
    case "time":
      const timezone = parameters.timezone || "UTC";
      const now = new Date();
      return {
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        timezone,
        iso: now.toISOString(),
        formatted: now.toLocaleString('en-US', { 
          timeZone: timezone,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

    case "calculator":
      try {
        const expression = parameters.expression;
        if (!expression) throw new Error("Expression required");
        
        // Simple safe evaluation (in production, use a proper math parser)
        const result = Function(`"use strict"; return (${expression})`)();
        return {
          expression,
          result,
          formatted: `${expression} = ${result}`
        };
      } catch (error) {
        throw new Error(`Calculation error: ${error instanceof Error ? error.message : 'Invalid expression'}`);
      }

    case "weather":
      const city = parameters.city || "Dubai";
      return {
        city,
        temperature: "28°C",
        condition: "Partly cloudy",
        humidity: "65%",
        forecast: "Sunny with occasional clouds",
        note: "Mock weather data for development"
      };

    case "memory":
      const { operation, key, value, category } = parameters;
      const memoryStore = global.agentMemory || (global.agentMemory = new Map());
      
      switch (operation) {
        case "store":
          if (!key || !value) throw new Error("Key and value required for store operation");
          const memoryKey = `${requestingAgent}:${category || 'default'}:${key}`;
          memoryStore.set(memoryKey, { value, timestamp: new Date().toISOString(), agent: requestingAgent });
          return { stored: true, key: memoryKey };
          
        case "retrieve":
          if (key) {
            const memoryKey = `${requestingAgent}:${category || 'default'}:${key}`;
            const stored = memoryStore.get(memoryKey);
            return stored || { error: "Key not found" };
          } else {
            // Retrieve all for agent/category
            const prefix = `${requestingAgent}:${category || 'default'}:`;
            const results = Array.from(memoryStore.entries())
              .filter(([k]) => k.startsWith(prefix))
              .map(([k, v]) => ({ key: k.replace(prefix, ''), ...v }));
            return { count: results.length, items: results };
          }
          
        default:
          throw new Error("Invalid memory operation. Use 'store' or 'retrieve'");
      }

    case "agent_communication":
      const { targetAgent, message, context } = parameters;
      if (!targetAgent || !message) throw new Error("Target agent and message required");
      
      return {
        sent: true,
        from: requestingAgent,
        to: targetAgent,
        message,
        context,
        timestamp: new Date().toISOString(),
        note: "Mock A2A communication for development"
      };

    case "file_operations":
      const { operation: fileOp, path, content } = parameters;
      return {
        operation: fileOp,
        path,
        success: true,
        note: "Mock file operation for development",
        timestamp: new Date().toISOString()
      };

    case "http_request":
      const { url, method = "GET" } = parameters;
      return {
        url,
        method,
        status: 200,
        response: "Mock HTTP response for development",
        timestamp: new Date().toISOString()
      };

    case "browser":
      const { url: browseUrl } = parameters;
      return {
        url: browseUrl,
        title: "Mock Web Page",
        content: "Mock web content for development",
        timestamp: new Date().toISOString()
      };

    case "code_interpreter":
      const { code, language = "python" } = parameters;
      return {
        code,
        language,
        output: "Mock code execution result",
        timestamp: new Date().toISOString()
      };

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tool, parameters = {}, requestingAgent, targetAgent, sessionId }: A2AToolRequest = req.body;

    console.log(`🔧 A2A Tool Request:`, {
      tool,
      requestingAgent,
      targetAgent,
      sessionId,
      parameters: Object.keys(parameters)
    });

    if (!tool) {
      return res.status(400).json({ 
        error: "Tool name required",
        available_tools: Object.keys(availableTools)
      });
    }

    if (!requestingAgent) {
      return res.status(400).json({ error: "Requesting agent required" });
    }

    const toolConfig = availableTools[tool as keyof typeof availableTools];
    if (!toolConfig) {
      return res.status(400).json({ 
        error: `Unknown tool: ${tool}`,
        available_tools: Object.keys(availableTools)
      });
    }

    // Check if agent has access to this tool
    if (!toolConfig.agents.includes("*") && !toolConfig.agents.includes(requestingAgent)) {
      return res.status(403).json({ 
        error: `Agent ${requestingAgent} does not have access to tool ${tool}`,
        allowed_agents: toolConfig.agents
      });
    }

    // Execute the tool
    const result = await executeTool(tool, parameters, requestingAgent);

    const response: A2AToolResponse = {
      success: true,
      result,
      tool,
      executedBy: requestingAgent,
      timestamp: new Date().toISOString(),
      metadata: {
        sessionId,
        targetAgent,
        toolConfig: toolConfig.description
      }
    };

    console.log(`✅ A2A Tool executed successfully:`, { tool, requestingAgent });
    return res.status(200).json(response);

  } catch (error) {
    console.error(`❌ A2A Tool error:`, error);
    
    const errorResponse: A2AToolResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      tool: req.body.tool || "unknown",
      executedBy: req.body.requestingAgent || "unknown",
      timestamp: new Date().toISOString()
    };

    return res.status(500).json(errorResponse);
  }
}

// Export tool definitions for other modules
export { availableTools };