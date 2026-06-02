import request from 'supertest';
import express from 'express';
import { registerMetricsEndpoint } from '../../../packages/cli/src/metrics/prometheus-metrics.service';

describe('Protected endpoints reject unauthenticated requests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    // Register the metrics endpoint without authentication middleware
    registerMetricsEndpoint(app);
  });

  const authPayloads = [
    { name: 'missing_token', headers: {} },
    { name: 'malformed_bearer', headers: { authorization: 'Bearer invalid' } },
    { name: 'expired_token', headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid' } },
    { name: 'empty_auth_header', headers: { authorization: '' } },
    { name: 'valid_request_no_auth', headers: { 'user-agent': 'curl' } },
  ];

  test.each(authPayloads)(
    'rejects unauthenticated request: $name',
    async ({ headers }) => {
      const response = await request(app)
        .get('/metrics')
        .set(headers);

      expect([401, 403]).toContain(response.status);
      expect(response.body).not.toHaveProperty('# HELP');
    },
  );
});