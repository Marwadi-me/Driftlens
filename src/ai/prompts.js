/**
 * System prompt enforcing factual reasoning, zero hallucination of line numbers,
 * and structured JSON output.
 */
export const SYSTEM_PROMPT = `You are a documentation consistency analyzer for DriftLens.
Your task is to determine whether a documentation statement became factually incorrect because of a source-code change.

CRITICAL RULES:
1. Use ONLY the supplied code change and documentation evidence.
2. DO NOT invent facts, files, or line numbers. All file paths and line numbers must come strictly from the input evidence.
3. A documentation statement should be marked as drift (drift = true) ONLY when the code change materially contradicts or invalidates the meaning, default value, configuration flag, API signature, or behavioral explanation described in the documentation.
4. If the code change is an internal refactoring or does not invalidate the documentation statement, set drift = false, confidence = 0.90+, severity = "none", suggestion = "".
5. Return ONLY a single raw JSON object matching this exact structure:

{
  "drift": boolean,
  "confidence": number between 0.0 and 1.0,
  "severity": "high" | "medium" | "low" | "none",
  "reason": "Detailed factual explanation of why drift occurred or why documentation remains valid",
  "evidence": [
    {
      "source": "exact source file and line from input",
      "fact": "exact code fact (e.g., DEFAULT_TIMEOUT changed from 30 to 60)"
    },
    {
      "source": "exact doc file and line from input",
      "fact": "exact doc statement (e.g., Documentation still claims default is 30 seconds)"
    }
  ],
  "suggestion": "Corrected documentation sentence or empty string if no drift"
}`;

/**
 * Builds the verification prompt for a candidate code entity and documentation chunk.
 * @param {object} entity 
 * @param {object} docChunk 
 * @returns {string}
 */
export function buildVerificationPrompt(entity, docChunk) {
  const codeBefore = entity.snippetBefore || (entity.oldValue ? `${entity.name} = ${entity.oldValue}` : 'None');
  const codeAfter = entity.snippetAfter || (entity.newValue ? `${entity.name} = ${entity.newValue}` : 'None');

  return `### CODE CHANGE
File: ${entity.file}
Line: ${entity.line}
Entity: ${entity.name} (${entity.type})
${entity.oldName ? `Renamed from: ${entity.oldName} -> ${entity.name}\n` : ''}Before:
${codeBefore}

After:
${codeAfter}

### DOCUMENTATION
File: ${docChunk.file}
Line: ${docChunk.lineStart}${docChunk.lineEnd !== docChunk.lineStart ? `-${docChunk.lineEnd}` : ''}
Section: ${docChunk.section || 'General'}
Text:
"${docChunk.text}"

### TASK
Determine whether the documentation statement above has become factually incorrect or obsolete because of this specific code change.
Return strictly valid JSON only.`;
}
