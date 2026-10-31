import path from 'node:path';

// Common subword splits (e.g. timeout -> time, out)
const COMPOUND_SUBWORDS = {
  timeout: ['time', 'out'],
  deadline: ['dead', 'line'],
  username: ['user', 'name'],
  filename: ['file', 'name'],
  filepath: ['file', 'path'],
  endpoint: ['end', 'point'],
  retry: ['re', 'try']
};

/**
 * Normalizes a word by stripping common English inflectional suffixes (ing, ed, s, es).
 * @param {string} word 
 * @returns {string}
 */
export function stemWord(word) {
  if (!word || word.length <= 3) return word;
  return word
    .toLowerCase()
    .replace(/(?:ing|edly|ed|es|s)$/, '');
}

/**
 * Tokenizes an identifier like DEFAULT_TIMEOUT or createUser into lowercase terms and stems.
 * @param {string} identifier 
 * @returns {Array<string>}
 */
export function tokenizeIdentifier(identifier) {
  if (!identifier) return [];
  // Strip leading dashes from flags like --timeout
  const clean = identifier.replace(/^--?/, '');
  // Split on underscores, dashes, or camelCase boundaries
  const rawTokens = clean
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 1);

  const finalTokens = new Set();
  for (const t of rawTokens) {
    finalTokens.add(t);
    finalTokens.add(stemWord(t));
    if (COMPOUND_SUBWORDS[t]) {
      for (const sub of COMPOUND_SUBWORDS[t]) {
        finalTokens.add(sub);
      }
    }
  }

  return Array.from(finalTokens);
}

/**
 * Calculates candidate match score and signals between a changed code entity and a documentation chunk.
 * @param {object} entity 
 * @param {object} docChunk 
 * @returns {{score: number, signals: Array<string>}}
 */
export function scoreCandidate(entity, docChunk) {
  const docTextLower = docChunk.text.toLowerCase();
  const sectionLower = (docChunk.section || '').toLowerCase();
  const signals = [];
  let score = 0;

  const entityNameLower = (entity.name || '').toLowerCase();
  const oldNameLower = (entity.oldName || '').toLowerCase();
  const oldValueLower = entity.oldValue ? String(entity.oldValue).toLowerCase().trim() : null;

  // Signal A: Exact Identifier or Flag Match
  if (entityNameLower && docTextLower.includes(entityNameLower)) {
    score += 0.45;
    signals.push(`contains exact entity identifier '${entity.name}'`);
  } else if (oldNameLower && docTextLower.includes(oldNameLower)) {
    score += 0.45;
    signals.push(`contains old entity identifier '${entity.oldName}'`);
  } else {
    // Check tokenized concept and stem overlap
    const tokens = [
      ...tokenizeIdentifier(entity.name),
      ...tokenizeIdentifier(entity.oldName)
    ];
    const docWords = docTextLower.split(/[\s,.'";:()\-_\/]+/).filter(w => w.length > 1);
    const docStems = docWords.map(stemWord);

    const matchingTokens = tokens.filter(t => 
      docWords.includes(t) || docStems.includes(t) || docTextLower.includes(t)
    );

    if (matchingTokens.length > 0) {
      const tokenRatio = Math.min(1.0, matchingTokens.length / Math.max(tokens.length / 2, 1));
      score += 0.35 * tokenRatio;
      signals.push(`contains concept keywords: ${Array.from(new Set(matchingTokens)).join(', ')}`);
    }
  }

  // Signal B: Old Value Match (e.g. doc still states "30 seconds" or "/api/v1/export")
  if (oldValueLower && oldValueLower.length > 0) {
    const escaped = oldValueLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startBoundary = /^\w/.test(oldValueLower) ? '\\b' : '(?:^|[^\\w])';
    const endBoundary = /\w$/.test(oldValueLower) ? '\\b' : '(?:$|[^\\w])';
    const valueRegex = new RegExp(`${startBoundary}${escaped}${endBoundary}`, 'i');
    if (valueRegex.test(docTextLower)) {
      score += 0.30;
      signals.push(`explicitly mentions old value '${entity.oldValue}'`);
    }
  }

  // Signal C: Section Context Match
  const configKeywords = ['configuration', 'config', 'option', 'flag', 'cli', 'param', 'setting', 'api', 'default'];
  if (configKeywords.some(k => sectionLower.includes(k))) {
    score += 0.15;
    signals.push(`located in relevant section '${docChunk.section}'`);
  }

  // Signal D: File Path Relationship
  if (entity.file && docChunk.file) {
    const srcBase = path.basename(entity.file, path.extname(entity.file)).toLowerCase();
    const docBase = path.basename(docChunk.file, path.extname(docChunk.file)).toLowerCase();
    if (srcBase === docBase && srcBase !== 'index') {
      score += 0.15;
      signals.push(`source file '${entity.file}' matches doc file '${docChunk.file}'`);
    } else if (docChunk.file.toLowerCase().includes('readme')) {
      score += 0.05;
      signals.push('located in primary README documentation');
    }
  } else if (docChunk.file && docChunk.file.toLowerCase().includes('readme')) {
    score += 0.05;
    signals.push('located in primary README documentation');
  }

  // Cap score between 0 and 1.0
  score = Math.min(1.0, Math.round(score * 100) / 100);

  return { score, signals };
}

/**
 * Matches changed code entities against all documentation chunks and ranks the top candidates.
 * @param {Array<object>} changedEntities 
 * @param {Array<object>} docChunks 
 * @param {object} options 
 * @returns {Array<object>}
 */
export function matchCandidates(changedEntities, docChunks, options = {}) {
  const minThreshold = options.minRelevanceThreshold ?? 0.30;
  const maxPerEntity = options.maxCandidatesPerEntity ?? 5;

  const matchedPairs = [];

  for (const entity of changedEntities) {
    const candidatesForEntity = [];

    for (const docChunk of docChunks) {
      const { score, signals } = scoreCandidate(entity, docChunk);

      if (score >= minThreshold) {
        candidatesForEntity.push({
          entity,
          docChunk,
          score,
          signals
        });
      }
    }

    // Sort descending by relevance score
    candidatesForEntity.sort((a, b) => b.score - a.score);

    // Take top N
    const topCandidates = candidatesForEntity.slice(0, maxPerEntity);
    matchedPairs.push(...topCandidates);
  }

  return matchedPairs;
}
