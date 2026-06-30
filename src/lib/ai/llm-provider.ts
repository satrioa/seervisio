export type AiProvider = "openai" | "openrouter";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
}

export interface LlmResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LlmProvider {
  name: AiProvider;
  defaultModel: string;
  complete(req: LlmRequest): Promise<LlmResponse>;
  validateApiKey(apiKey: string): Promise<boolean>;
}

/* ── OpenAI Provider ── */

class OpenAIProvider implements LlmProvider {
  name: AiProvider = "openai";
  defaultModel = "gpt-4o-mini";

  private apiKey: string;
  private baseUrl = "https://api.openai.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const body: Record<string, any> = {
      model: req.model || this.defaultModel,
      messages: req.messages,
      temperature: req.temperature ?? 0.3,
      max_tokens: req.maxTokens ?? 2048,
    };

    if (req.responseFormat === "json_object") {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${err}`);
    }

    const json = await res.json();
    return {
      content: json.choices[0].message.content,
      model: json.model,
      usage: {
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
        totalTokens: json.usage?.total_tokens ?? 0,
      },
    };
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const savedKey = this.apiKey;
      this.apiKey = apiKey;
      await this.complete({
        model: this.defaultModel,
        messages: [{ role: "user", content: "Say 'ok'" }],
        maxTokens: 10,
      });
      this.apiKey = savedKey;
      return true;
    } catch {
      return false;
    }
  }
}

/* ── OpenRouter Provider ── */

class OpenRouterProvider implements LlmProvider {
  name: AiProvider = "openrouter";
  defaultModel = "openai/gpt-4o-mini";

  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const body: Record<string, any> = {
      model: req.model || this.defaultModel,
      messages: req.messages,
      temperature: req.temperature ?? 0.3,
      max_tokens: req.maxTokens ?? 2048,
    };

    if (req.responseFormat === "json_object") {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://seervisio.app",
        "X-Title": "Seervisio AI",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error (${res.status}): ${err}`);
    }

    const json = await res.json();
    return {
      content: json.choices[0].message.content,
      model: json.model,
      usage: {
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
        totalTokens: json.usage?.total_tokens ?? 0,
      },
    };
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const savedKey = this.apiKey;
      this.apiKey = apiKey;
      await this.complete({
        model: this.defaultModel,
        messages: [{ role: "user", content: "Say 'ok'" }],
        maxTokens: 10,
      });
      this.apiKey = savedKey;
      return true;
    } catch {
      return false;
    }
  }
}

/* ── Factory ── */

export function createLlmProvider(
  provider: AiProvider,
  apiKey: string,
): LlmProvider {
  switch (provider) {
    case "openai":
      return new OpenAIProvider(apiKey);
    case "openrouter":
      return new OpenRouterProvider(apiKey);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
