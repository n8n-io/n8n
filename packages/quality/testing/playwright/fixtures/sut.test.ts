import { describe, expect, test } from 'vitest';

import { attach } from './sut';

describe('attach', () => {
	test('reads the endpoints from the environment', () => {
		const sut = attach({
			N8N_BASE_URL: 'http://localhost:5678',
			N8N_EDITOR_URL: 'http://localhost:8080',
		});

		expect(sut).toMatchObject({
			url: 'http://localhost:5678',
			editorUrl: 'http://localhost:8080',
			internalUrl: 'http://localhost:5678',
			mainUrls: [],
			processUrls: [{ role: 'main', name: 'main', url: 'http://localhost:5678' }],
		});
		expect(sut.stack).toBeUndefined();
	});

	test('requires a backend URL', () => {
		expect(() => attach({})).toThrow('N8N_BASE_URL is required');
	});

	test('denies a reset without a grant', async () => {
		const sut = attach({ N8N_BASE_URL: 'http://localhost:5678' });

		await expect(sut.reset()).rejects.toThrow('Reset is not permitted on this SUT');
	});

	test('names a missing service', () => {
		const sut = attach({ N8N_BASE_URL: 'http://localhost:5678' });

		expect(() => sut.services.mailpit).toThrow(
			'Service "mailpit" is not available on an attached SUT',
		);
	});

	test('never stops the instance', async () => {
		const sut = attach({ N8N_BASE_URL: 'http://localhost:5678' });

		await expect(sut.stop()).resolves.toBeUndefined();
	});
});
