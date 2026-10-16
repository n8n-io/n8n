import { describe, expect, test } from 'vitest';

import { getReadinessUrl } from './url-helper';

describe('getReadinessUrl', () => {
	test('uses the default health endpoint', () => {
		expect(getReadinessUrl('http://localhost:5678')).toBe(
			'http://localhost:5678/healthz/readiness',
		);
	});

	test('uses a custom health endpoint', () => {
		expect(getReadinessUrl('http://localhost:5678', '/health')).toBe(
			'http://localhost:5678/health/readiness',
		);
	});

	test('adds the leading slash a custom health endpoint may omit', () => {
		expect(getReadinessUrl('http://localhost:5678', 'health')).toBe(
			'http://localhost:5678/health/readiness',
		);
	});

	test('drops a trailing slash of the base URL', () => {
		expect(getReadinessUrl('http://localhost:5678/')).toBe(
			'http://localhost:5678/healthz/readiness',
		);
	});
});
