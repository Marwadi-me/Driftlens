import { SYSTEM_PROMPT, buildVerificationPrompt } from './prompts.js';
import { parseJSONFromText, validateLLMResult } from './schemas.js';

/**
 * Base abstract LLM client.
 */
export class BaseLLMClient {
  async verifyDrift(entity, docChunk) {
    throw new Error('verifyDrift must be implemented by subclass');
  }
}

/**
 * Mock LLM Client for unit testing and offline deterministic verification.
 */
export class MockLLMClient extends BaseLLMClient {
  constructor(customHandler = null) {
    super();
    this.customHandler = customHandler;
    this.callHistory = [];
  }

  async verifyDrift(entity, docChunk) {
    this.callHistory.push({ entity, docChunk });

    if (this.customHandler) {
      return this.customHandler(entity, docChunk);
    }

    const docText = docChunk.text.toLowerCase();
    const entityName = (entity.name || '').toLowerCase();
    const oldName = (entity.oldName || '').toLowerCase();
    const oldValue = entity.oldValue ? String(entity.oldValue).toLowerCase() : null;
    const newValue = entity.newValue ? String(entity.newValue) : null;

    // Renamed CLI flag scenario
    if (entity.type === 'CLI_FLAG' && oldName && docText.includes(oldName)) {
      const suggested = docChunk.text.replace(new RegExp(entity.oldName, 'g'), entity.name);
      return {
        drift: true,
        confidence: 0.97,
        severity: 'high',
        reason: `The CLI flag '${entity.oldName}' was renamed to '${entity.name}' in ${entity.file}:${entity.line}, but documentation still references the obsolete flag.`,
        evidence: [
          {
            source: `${entity.file}:${entity.line}`,
            fact: `Flag renamed from '${entity.oldName}' to '${entity.name}'`
          },
          {
            source: `${docChunk.file}:${docChunk.lineStart}`,
            fact: `Documentation states: "${docChunk.text}"`
          }
        ],
        suggestion: suggested
      };
    }

    // Removed feature or route scenario
    if (entity.status === 'removed' && entityName && docText.includes(entityName)) {
      return {
        drift: true,
        confidence: 0.95,
        severity: 'high',
        reason: `Feature or route '${entity.name}' was removed in code, but documentation continues to describe it.`,
        evidence: [
          {
            source: `${entity.file}:${entity.line}`,
            fact: `'${entity.name}' was removed from codebase`
          },
          {
            source: `${docChunk.file}:${docChunk.lineStart}`,
            fact: `Documentation states: "${docChunk.text}"`
          }
        ],
        suggestion: `Remove references to obsolete '${entity.name}'.`
      };
    }

    // Changed default value / constant / signature scenario
    if (oldValue && docText.includes(oldValue)) {
      const suggested = newValue ? docChunk.text.replace(entity.oldValue, entity.newValue) : docChunk.text;
      return {
        drift: true,
        confidence: 0.96,
        severity: 'high',
        reason: `The documented value '${oldValue}' for '${entity.name}' no longer matches the current implementation value '${newValue}'.`,
        evidence: [
          {
            source: `${entity.file}:${entity.line}`,
            fact: `${entity.name} changed from ${entity.oldValue} to ${entity.newValue}`
          },
          {
            source: `${docChunk.file}:${docChunk.lineStart}`,
            fact: `Documentation states: "${docChunk.text}"`
          }
        ],
        suggestion: suggested
      };
    }

    // No drift / consistent documentation scenario
    return {
      drift: false,
      confidence: 0.92,
      severity: 'none',
      reason: `The code change for '${entity.name}' does not contradict the documentation statement.`,
      evidence: [
        {
          source: `${entity.file}:${entity.line}`,
          fact: `Internal code modification without conflicting documentation statement`
        }
      ],
      suggestion: ''
    };
  }
}

/**
 * Open-Weight OpenAI-Compatible LLM Client (vLLM, Ollama, Together, Hackathon server).
 */
export class OpenAICompatibleLLMClient extends BaseLLMClient {
  constructor(config = {}) {
    super();
    this.baseUrl = config.baseUrl || process.env.LLM_BASE_URL || 'http://localhost:11434/v1';
    this.model = config.model || process.env.LLM_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
    this.apiKey = config.apiKey || process.env.LLM_API_KEY || 'dummy-key';
    this.timeout = config.timeout || 30000;
  }

  async verifyDrift(entity, docChunk) {
    const userPrompt = buildVerificationPrompt(entity, docChunk);

    let parsedResult = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts && !parsedResult) {
      attempts++;
      try {
        const payload = {
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`LLM server error (${response.status}): ${errText}`);
        }

        const json = await response.json();
        const content = json.choices?.[0]?.message?.content || '';
        const parsed = parseJSONFromText(content);

        if (parsed) {
          const validation = validateLLMResult(parsed);
          if (validation.valid) {
            parsedResult = parsed;
            break;
          }
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          throw err;
        }
      }
    }

    if (!parsedResult) {
      throw new Error(`Failed to obtain valid JSON drift response from model ${this.model}`);
    }

    return parsedResult;
  }
}

/**
 * Factory function creating appropriate LLM client instance.
 * @param {object} options 
 * @returns {BaseLLMClient}
 */
export function createLLMClient(options = {}) {
  const provider = (options.provider || process.env.LLM_PROVIDER || 'mock').toLowerCase();

  if (provider === 'mock' || process.env.NODE_ENV === 'test') {
    return new MockLLMClient(options.customHandler);
  }

  return new OpenAICompatibleLLMClient({
    baseUrl: options.baseUrl || process.env.LLM_BASE_URL,
    model: options.model || process.env.LLM_MODEL,
    apiKey: options.apiKey || process.env.LLM_API_KEY
  });
}

