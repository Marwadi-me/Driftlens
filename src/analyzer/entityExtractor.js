/**
 * Code Entity Extractor
 * Identifies variables, constants, defaults, CLI flags, functions, and routes from changed code.
 */

// Patterns to detect entities
const CONSTANT_VAR_PATTERN = /(?:const|let|var|readonly)?\s*([A-Z0-9_]{3,})\s*[:=]\s*([^;,]+)/;
const CAMEL_CONFIG_PATTERN = /(?:const|let|var)?\s*([a-zA-Z0-9_]+Timeout|[a-zA-Z0-9_]+Interval|[a-zA-Z0-9_]+Limit|[a-zA-Z0-9_]+Port|[a-zA-Z0-9_]+Host|[a-zA-Z0-9_]+Url|[a-zA-Z0-9_]+Default)\s*[:=]\s*([^;,]+)/i;
const OBJECT_PROPERTY_PATTERN = /^\s*['"]?([a-zA-Z0-9_]+)['"]?\s*:\s*([^,;]+)/;

const CLI_FLAG_PATTERN = /add_argument\s*\(\s*['"](--[a-zA-Z0-9_-]+)['"]|\.option\s*\(\s*['"](?:-[a-zA-Z0-9],\s*)?(--[a-zA-Z0-9_-]+)/;
const BARE_FLAG_PATTERN = /(--[a-zA-Z0-9_-]{2,})/;

const FUNCTION_PATTERN = /(?:function\s+([a-zA-Z0-9_]+)|def\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/;
const ROUTE_PATTERN = /\.(?:get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/;

function cleanValue(val) {
  if (!val) return '';
  return val.trim().replace(/^['"`]|['"`]$/g, '').replace(/;$/, '');
}

/**
 * Extracts candidate entities from a single line of code.
 * @param {string} line 
 * @returns {Array<object>}
 */
export function extractEntitiesFromLine(line) {
  if (!line || typeof line !== 'string') return [];
  const entities = [];
  const trimmed = line.trim();

  // 1. CLI flag
  const cliMatch = trimmed.match(CLI_FLAG_PATTERN);
  if (cliMatch) {
    const flagName = cliMatch[1] || cliMatch[2];
    entities.push({
      name: flagName,
      type: 'CLI_FLAG',
      value: flagName
    });
  } else {
    const bareFlagMatch = trimmed.match(BARE_FLAG_PATTERN);
    if (bareFlagMatch && (trimmed.includes('option') || trimmed.includes('arg') || trimmed.includes('flag') || trimmed.includes('command'))) {
      entities.push({
        name: bareFlagMatch[1],
        type: 'CLI_FLAG',
        value: bareFlagMatch[1]
      });
    }
  }

  // 2. Constants / Configurations
  const constMatch = trimmed.match(CONSTANT_VAR_PATTERN);
  if (constMatch) {
    entities.push({
      name: constMatch[1],
      type: 'CONSTANT',
      value: cleanValue(constMatch[2])
    });
  }

  // 3. Config/timeout variables
  const configMatch = trimmed.match(CAMEL_CONFIG_PATTERN);
  if (configMatch && (!constMatch || constMatch[1] !== configMatch[1])) {
    entities.push({
      name: configMatch[1],
      type: 'CONFIG',
      value: cleanValue(configMatch[2])
    });
  }

  // 4. Object properties (e.g. timeout: 30)
  const propMatch = trimmed.match(OBJECT_PROPERTY_PATTERN);
  if (propMatch && !constMatch && !configMatch) {
    const propName = propMatch[1];
    if (/^[a-zA-Z0-9_]+$/.test(propName) && propName.length > 2) {
      entities.push({
        name: propName,
        type: 'CONFIG',
        value: cleanValue(propMatch[2])
      });
    }
  }

  // 5. Function declaration
  const funcMatch = trimmed.match(FUNCTION_PATTERN);
  if (funcMatch) {
    const fnName = funcMatch[1] || funcMatch[2] || funcMatch[3];
    if (fnName) {
      entities.push({
        name: fnName,
        type: 'FUNCTION',
        value: fnName
      });
    }
  }

  // 6. Route definitions
  const routeMatch = trimmed.match(ROUTE_PATTERN);
  if (routeMatch) {
    entities.push({
      name: routeMatch[1],
      type: 'ROUTE',
      value: routeMatch[1]
    });
  }

  return entities;
}

/**
 * Extracts changed entities from parsed file diffs.
 * Correlates old lines and new lines within hunks.
 * @param {Array<object>} parsedDiffs 
 * @returns {Array<object>}
 */
export function extractChangedEntities(parsedDiffs) {
  const changedEntities = [];

  for (const fileDiff of parsedDiffs) {
    // Only analyze source or configuration code for entities
    if (fileDiff.type !== 'source' && fileDiff.type !== 'configuration') {
      continue;
    }

    const filePath = fileDiff.file;

    for (const hunk of fileDiff.hunks) {
      const removedEntities = [];
      const addedEntities = [];

      // Extract from removed lines
      for (const removedLine of hunk.removed) {
        const ents = extractEntitiesFromLine(removedLine);
        for (const e of ents) {
          removedEntities.push({ ...e, rawLine: removedLine });
        }
      }

      // Extract from added lines
      for (const addedLine of hunk.added) {
        const ents = extractEntitiesFromLine(addedLine);
        for (const e of ents) {
          addedEntities.push({ ...e, rawLine: addedLine });
        }
      }

      // Pair removed with added entities
      const pairedAddedIndices = new Set();

      for (const removed of removedEntities) {
        // Look for matching or renamed entity
        let pairedIndex = -1;

        // Try exact name match first (e.g. DEFAULT_TIMEOUT 30 -> 60)
        for (let i = 0; i < addedEntities.length; i++) {
          if (!pairedAddedIndices.has(i) && addedEntities[i].name === removed.name) {
            pairedIndex = i;
            break;
          }
        }

        // If no exact name match, try same type (e.g. CLI_FLAG --timeout -> --deadline)
        if (pairedIndex === -1) {
          for (let i = 0; i < addedEntities.length; i++) {
            if (!pairedAddedIndices.has(i) && addedEntities[i].type === removed.type) {
              pairedIndex = i;
              break;
            }
          }
        }

        if (pairedIndex !== -1) {
          const added = addedEntities[pairedIndex];
          pairedAddedIndices.add(pairedIndex);

          // Only report as changed entity if value or name actually changed
          if (removed.name !== added.name || removed.value !== added.value) {
            changedEntities.push({
              name: added.name,
              oldName: removed.name !== added.name ? removed.name : null,
              type: added.type,
              oldValue: removed.value,
              newValue: added.value,
              file: filePath,
              line: hunk.newStart,
              snippetBefore: removed.rawLine.trim(),
              snippetAfter: added.rawLine.trim()
            });
          }
        } else {
          // Entity was removed entirely
          changedEntities.push({
            name: removed.name,
            oldName: null,
            type: removed.type,
            oldValue: removed.value,
            newValue: null,
            status: 'removed',
            file: filePath,
            line: hunk.oldStart,
            snippetBefore: removed.rawLine.trim(),
            snippetAfter: null
          });
        }
      }

      // Remaining added entities without pairs
      for (let i = 0; i < addedEntities.length; i++) {
        if (!pairedAddedIndices.has(i)) {
          const added = addedEntities[i];
          changedEntities.push({
            name: added.name,
            oldName: null,
            type: added.type,
            oldValue: null,
            newValue: added.value,
            status: 'added',
            file: filePath,
            line: hunk.newStart,
            snippetBefore: null,
            snippetAfter: added.rawLine.trim()
          });
        }
      }
    }
  }

  return changedEntities;
}
