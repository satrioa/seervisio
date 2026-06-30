// Smoke test for LLM provider integration
// Usage: npx ts-node -r dotenv/config src/lib/ai/test-provider.ts
// Or just: node --loader ts-node/esm src/lib/ai/test-provider.ts

import { createLlmProvider } from "./llm-provider";

const API_KEY = process.env.TEST_AI_API_KEY;
const PROVIDER = (process.env.TEST_AI_PROVIDER || "openai") as "openai" | "openrouter";

async function main() {
  if (!API_KEY) {
    console.error("❌ Set TEST_AI_API_KEY env var");
    console.error("  TEST_AI_API_KEY=sk-... TEST_AI_PROVIDER=openai npx ts-node ...");
    process.exit(1);
  }

  console.log(`\n🔧 Testing ${PROVIDER} provider...`);
  const provider = createLlmProvider(PROVIDER, API_KEY);

  // 1. Validate
  console.log(`\n1️⃣  Validating API key...`);
  const valid = await provider.validateApiKey(API_KEY);
  if (!valid) {
    console.error(`❌ API key validation failed`);
    process.exit(1);
  }
  console.log(`✅ API key valid! Default model: ${provider.defaultModel}`);

  // 2. Simple completion
  console.log(`\n2️⃣  Testing completion...`);
  const result = await provider.complete({
    model: provider.defaultModel,
    messages: [
      { role: "system", content: "You are a helpful assistant. Reply in Indonesian." },
      { role: "user", content: "Sebutkan 3 hal yang perlu diperiksa di toko reparasi HP hari ini." },
    ],
    temperature: 0.3,
    maxTokens: 500,
  });

  console.log(`✅ Response received:`);
  console.log(`   Model: ${result.model}`);
  console.log(`   Tokens: ${result.usage.promptTokens} prompt + ${result.usage.completionTokens} completion`);
  console.log(`   Content:\n${result.content}\n`);

  // 3. JSON mode
  console.log(`3️⃣  Testing JSON mode...`);
  const jsonResult = await provider.complete({
    model: provider.defaultModel,
    messages: [
      { role: "system", content: "You are a data analyst. Return JSON only." },
      { role: "user", content: 'Generate a business health score (0-100) and return as JSON: { "score": number, "status": string }' },
    ],
    temperature: 0.3,
    responseFormat: "json_object",
    maxTokens: 200,
  });

  const parsed = JSON.parse(jsonResult.content);
  console.log(`✅ JSON response valid:`, JSON.stringify(parsed, null, 2));

  console.log(`\n🎉 All tests passed!`);
}

main().catch((err) => {
  console.error(`\n❌ Test failed:`, err.message);
  process.exit(1);
});
