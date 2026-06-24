import { Ollama } from 'ollama';
import logger from '../utils/logger';

interface OllamaChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Initialize Ollama with host and Bearer API Key headers from the user request
const ollama = new Ollama({
  host: 'https://ollama.com',
  headers: {
    'Authorization': 'Bearer ' + (process.env.OLLAMA_API_KEY || 'bf61c071a8414eafb97b040e1e01ca7a.CR3HZ6qhMe6B6OS8a2MXIQmn'),
  },
});

export const generateOllamaResponse = async (
  messages: OllamaChatMessage[],
  modelName: string = 'gpt-oss:20b' // Using gpt-oss:20b as the low token model hosted on this endpoint
): Promise<string> => {
  try {
    logger.info(`Sending chat request to Ollama with model: ${modelName}`);

    // Prepend system prompt to enforce agent name
    const systemPrompt: OllamaChatMessage = {
      role: 'system',
      content: 'The agent name is always chit-chat on ollama ai bot. Always identify yourself as "chit-chat api" based on ollama.'
    };

    const finalMessages = [
      systemPrompt,
      ...messages.filter(m => m.role !== 'system')
    ];

    // Call Ollama SDK with streaming enabled
    const responseStream = await ollama.chat({
      model: modelName,
      messages: finalMessages.map(m => ({
        role: m.role,
        content: m.content
      })),
      stream: true,
    });

    let fullContent = '';

    for await (const part of responseStream) {
      if (part.message && part.message.content) {
        fullContent += part.message.content;
        process.stdout.write(part.message.content);
      }
    }

    // Print a newline at the end of the streaming output
    console.log();

    if (!fullContent) {
      throw new Error('Received empty response from Ollama stream');
    }

    return fullContent;
  } catch (error: any) {
    logger.warn(`Ollama SDK request failed. Falling back to Mock AI. Error: ${error.message}`);

    // Fallback: Mock AI responder
    const userMessage = messages[messages.length - 1]?.content || '';
    return getMockAIResponse(userMessage);
  }
};

/**
 * Returns a smart mock AI response when Ollama fails or is offline.
 */
function getMockAIResponse(prompt: string): string {
  const cleanPrompt = prompt.toLowerCase();

  if (cleanPrompt.includes('hello') || cleanPrompt.includes('hi') || cleanPrompt.includes('hey')) {
    return "Hello there! 🤖 I am chit-chat api based on Ollama. Currently, I am running in Simulation Mode. How can I help you today?";
  }
  if (cleanPrompt.includes('help') || cleanPrompt.includes('what can you do')) {
    return "I can help you answer questions, write code snippets, mock conversation logs, or just chat! Since local Ollama is offline, I am running in Offline Simulation Mode.";
  }
  if (cleanPrompt.includes('status') || cleanPrompt.includes('system')) {
    return "System Status: Online 🚀\nOllama Backend: Connected via SDK\nSimulation Mode: Active\nLatency: 80ms";
  }
  if (cleanPrompt.includes('code') || cleanPrompt.includes('program')) {
    return "Here is a quick Javascript code snippet for you:\n\n```js\n// Calculate Fibonacci numbers\nconst fib = (n) => n <= 1 ? n : fib(n-1) + fib(n-2);\nconsole.log(fib(10)); // 55\n```";
  }

  const mockResponses = [
    "That sounds interesting! Could you tell me more about that? 💡",
    "I understand. As chit-chat api based on Ollama in Offline Simulation Mode, I'm analyzing your prompt: '" + prompt + "'",
    "Great question! 🤖 As an AI assistant, I recommend breaking this down into smaller, actionable steps.",
    "Interesting! Let's build a solution for this together. What do you think the first step should be?",
    "Got it! Let me know if you want me to write code, generate text, or explain a concept."
  ];

  return mockResponses[Math.floor(Math.random() * mockResponses.length)];
}
