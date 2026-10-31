/**
 * DriftLens - Automated Documentation Drift Detection
 * "Catch the documentation a code change just made wrong."
 */

export const DRIFTLENS_VERSION = '0.1.0';

export function getStatus() {
  return {
    name: 'DriftLens',
    version: DRIFTLENS_VERSION,
    tagline: 'Catch the documentation a code change just made wrong.',
    status: 'ready'
  };
}
