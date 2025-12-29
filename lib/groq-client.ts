import Groq from 'groq-sdk';


const DEFAULT_MODEL = 'openai/gpt-oss-120b';


export function createGroqClient(apiKey: string): Groq {
  return new Groq({ apiKey });
}


export async function generateGroqResponse(
  prompt: string,
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  const client = createGroqClient(apiKey);
  
  const completion = await client.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model,
    temperature: 0.7,
    max_completion_tokens: 8192,
    reasoning_effort: 'medium',
  });

  return completion.choices[0]?.message?.content || '';
}


export async function analyzeWithGroq(
  systemPrompt: string,
  userMessage: string,
  context: string | undefined,
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  const client = createGroqClient(apiKey);

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (context) {
    messages.push({ role: 'user', content: `Context:\n${context}` });
  }

  messages.push({ role: 'user', content: userMessage });

  const completion = await client.chat.completions.create({
    messages,
    model,
    temperature: 0.7,
    max_completion_tokens: 8192,
    reasoning_effort: 'medium',
  });

  return completion.choices[0]?.message?.content || '';
}
