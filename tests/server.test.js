import { describe, it, expect } from 'vitest';
import app from '../src/server.js';

describe('Express Server API', () => {
  it('GET /api/health returns ready status and version', async () => {
    const req = {};
    let responseData = null;

    const res = {
      json: (data) => { responseData = data; },
      status: () => res
    };

    const healthRoute = app._router.stack.find(s => s.route && s.route.path === '/api/health');
    expect(healthRoute).toBeDefined();

    await healthRoute.route.stack[0].handle(req, res, () => {});
    expect(responseData).toBeDefined();
    expect(responseData.status).toBe('ready');
    expect(responseData.name).toBe('DriftLens');
  });

  it('GET /api/examples/renamed-flag returns stored example', async () => {
    let responseData = null;
    const req = { params: { id: 'renamed-flag' } };
    const res = {
      json: (data) => { responseData = data; },
      status: () => res
    };

    const exampleRoute = app._router.stack.find(s => s.route && s.route.path === '/api/examples/:id');
    expect(exampleRoute).toBeDefined();

    await exampleRoute.route.stack[0].handle(req, res, () => {});
    expect(responseData).toBeDefined();
    expect(responseData.status).toBe('FAIL');
    expect(responseData.findings[0].source.entityName).toBe('--deadline');
  });
});
