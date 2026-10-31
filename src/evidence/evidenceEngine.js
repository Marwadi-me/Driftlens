/**
 * Evidence Engine
 * Combines deterministic signals, candidate match scores, and LLM semantic reasoning
 * into calibrated, evidence-backed drift findings.
 */

/**
 * Calculates calibrated composite confidence.
 * @param {number} deterministicScore 
 * @param {number} candidateScore 
 * @param {number} llmConfidence 
 * @returns {number}
 */
export function calculateConfidence(deterministicScore, candidateScore, llmConfidence) {
  const composite = (0.35 * deterministicScore) + (0.25 * candidateScore) + (0.40 * llmConfidence);
  return Math.min(1.0, Math.max(0.0, Math.round(composite * 100) / 100));
}

/**
 * Classifies confidence into HIGH, MEDIUM, or LOW tier.
 * @param {number} confidence 
 * @returns {'HIGH' | 'MEDIUM' | 'LOW'}
 */
export function classifyConfidenceTier(confidence) {
  if (confidence >= 0.85) return 'HIGH';
  if (confidence >= 0.70) return 'MEDIUM';
  return 'LOW';
}

/**
 * Checks whether the documentation sentence was already updated in the same PR.
 * If the doc change added the new entity/value or removed the old sentence, drift is suppressed.
 * @param {object} docChunk 
 * @param {object} entity 
 * @param {Array<object>} docFileDiffs 
 * @returns {boolean}
 */
export function isDocumentationUpdatedInSamePR(docChunk, entity, docFileDiffs) {
  if (!docFileDiffs || docFileDiffs.length === 0) return false;

  const relevantDocDiff = docFileDiffs.find(d => d.file === docChunk.file);
  if (!relevantDocDiff) return false;

  for (const hunk of relevantDocDiff.hunks) {
    const isWithinHunkLines = docChunk.lineStart >= hunk.newStart && docChunk.lineStart <= (hunk.newStart + hunk.newLines);

    // If new lines in docs already mention the new value or new flag name
    const addedText = hunk.added.join(' ').toLowerCase();
    const newValueStr = entity.newValue ? String(entity.newValue).toLowerCase() : null;
    const newNameStr = entity.name ? entity.name.toLowerCase() : null;

    if (newValueStr && addedText.includes(newValueStr)) {
      return true;
    }
    if (newNameStr && addedText.includes(newNameStr)) {
      return true;
    }

    // If the old sentence was explicitly removed in this PR
    const removedText = hunk.removed.join(' ').toLowerCase();
    if (removedText.includes(docChunk.text.toLowerCase().trim())) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates candidate matches with an LLM and builds structured drift findings.
 * @param {Array<object>} candidatePairs 
 * @param {object} llmClient 
 * @param {Array<object>} allParsedDiffs 
 * @param {object} options 
 * @returns {Promise<Array<object>>}
 */
export async function buildDriftFindings(candidatePairs, llmClient, allParsedDiffs = [], options = {}) {
  const minConfidenceThreshold = options.minConfidence ?? 0.60;
  const docFileDiffs = allParsedDiffs.filter(d => d.type === 'documentation');
  const findings = [];
  let findingCounter = 1;

  for (const pair of candidatePairs) {
    const { entity, docChunk, score: candidateScore } = pair;

    // Check edge case: Documentation updated in the same PR
    if (isDocumentationUpdatedInSamePR(docChunk, entity, docFileDiffs)) {
      continue;
    }

    // Call LLM for semantic verification
    const llmResult = await llmClient.verifyDrift(entity, docChunk);

    if (!llmResult || !llmResult.drift) {
      // False-positive control: LLM determined no drift
      continue;
    }

    // Deterministic signal score (1.0 for hard changes like renamed flag or constant value change)
    let deterministicScore = 0.80;
    if (entity.type === 'CLI_FLAG' && entity.oldName) deterministicScore = 1.0;
    if (entity.type === 'CONSTANT' && entity.oldValue && entity.newValue) deterministicScore = 0.95;

    // Calibrated confidence
    const finalConfidence = calculateConfidence(
      deterministicScore,
      candidateScore,
      llmResult.confidence ?? 0.90
    );

    if (finalConfidence < minConfidenceThreshold) {
      continue;
    }

    const confidenceTier = classifyConfidenceTier(finalConfidence);
    const severity = (llmResult.severity || 'high').toLowerCase();

    findings.push({
      id: `DRIFT-${String(findingCounter++).padStart(3, '0')}`,
      severity,
      confidence: finalConfidence,
      confidenceTier,

      source: {
        file: entity.file,
        lineStart: entity.line,
        lineEnd: entity.line,
        entityName: entity.name,
        entityType: entity.type,
        oldValue: entity.oldValue,
        newValue: entity.newValue,
        before: entity.snippetBefore,
        after: entity.snippetAfter
      },

      documentation: {
        file: docChunk.file,
        lineStart: docChunk.lineStart,
        lineEnd: docChunk.lineEnd,
        section: docChunk.section,
        text: docChunk.text
      },

      reason: llmResult.reason,
      evidence: llmResult.evidence || [
        {
          source: `${entity.file}:${entity.line}`,
          fact: `${entity.name} changed from ${entity.oldValue || 'initial'} to ${entity.newValue || 'updated'}`
        },
        {
          source: `${docChunk.file}:${docChunk.lineStart}`,
          fact: `Documentation still states: "${docChunk.text}"`
        }
      ],
      suggestion: llmResult.suggestion
    });
  }

  // Deduplicate findings for same docChunk and entity
  const seenKeys = new Set();
  const deduplicated = [];

  for (const f of findings) {
    const key = `${f.source.file}:${f.source.lineStart}->${f.documentation.file}:${f.documentation.lineStart}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicated.push(f);
    }
  }

  return deduplicated;
}

