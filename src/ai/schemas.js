/**
 * Validates the structured output returned by the LLM.
 * @param {any} data 
 * @returns {{valid: boolean, errors: Array<string>}}
 */
export function validateLLMResult(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response is not an object'] };
  }

  if (typeof data.drift !== 'boolean') {
    errors.push("'drift' must be a boolean (true or false)");
  }

  if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
    errors.push("'confidence' must be a float between 0.0 and 1.0");
  }

  if (typeof data.severity !== 'string' || !['high', 'medium', 'low', 'none'].includes(data.severity.toLowerCase())) {
    errors.push("'severity' must be one of: 'high', 'medium', 'low', 'none'");
  }

  if (typeof data.reason !== 'string' || data.reason.trim().length === 0) {
    errors.push("'reason' must be a non-empty string explaining the conclusion");
  }

  if (!Array.isArray(data.evidence)) {
    errors.push("'evidence' must be an array of evidence items");
  }

  if (typeof data.suggestion !== 'string') {
    errors.push("'suggestion' must be a string with the recommended documentation fix");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extracts and cleans a JSON object from potential markdown code fences (```json ... ```).
 * @param {string} rawText 
 * @returns {object|null}
 */
export function parseJSONFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // Try parsing directly
  try {
    return JSON.parse(rawText.trim());
  } catch {
    // Look for ```json ... ``` blocks
    const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch && fenceMatch[1]) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch {
        // Continue to brace search
      }
    }

    // Look for first { to last }
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }

    return null;
  }
}
