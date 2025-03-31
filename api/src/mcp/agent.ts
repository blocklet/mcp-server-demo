import { AIAgent, ExecutionEngine } from '@aigne/core';
import { ClaudeChatModel } from '@aigne/core/models/claude-chat-model.js';

const model = new ClaudeChatModel({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-latest',
});
const engine = new ExecutionEngine({ model });

const storyTeller = AIAgent.from({
  instructions: `\
You are a storyteller. You will be given a topic and you will need to tell a story within 300 words about it.

Topic: {{topic}}
Language: {{language}}`,
  outputKey: 'story',
});

export async function tellStory(topic: string, language: string = 'zh-CN') {
  const result = await engine.call(storyTeller, {
    topic,
    language,
  });
  return result.story as string;
}
