import type { StartedTestContainer } from 'testcontainers';
import { describe, expect, test, vi } from 'vitest';

import { PostgresHelper } from '../services/postgres';

function helperWith(result: { exitCode: number; output: string }) {
	const exec = vi.fn().mockResolvedValue(result);
	const container = { exec } as unknown as StartedTestContainer;
	const helper = new PostgresHelper(container, {
		database: 'n8n_db',
		username: 'n8n_user',
		password: 'test_password',
	});

	return { helper, exec };
}

describe('PostgresHelper.truncateEngineDatabase', () => {
	test('empties the engine database', async () => {
		const { helper, exec } = helperWith({ exitCode: 0, output: '' });

		await helper.truncateEngineDatabase();

		const [args] = exec.mock.calls[0] as [string[]];
		expect(args).toContain('n8n_engine');
		expect(args.at(-1)).toContain('TRUNCATE TABLE');
	});

	test('reports a psql failure instead of leaving the worker on stale rows', async () => {
		const { helper } = helperWith({
			exitCode: 1,
			output: 'FATAL: database "n8n_engine" does not exist',
		});

		await expect(helper.truncateEngineDatabase()).rejects.toThrow(/does not exist/);
	});
});
