import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { is, Scenario } from './scenario';

describe('Scenario', () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'test-rig-scenario-'));
	});

	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	it('fails the run on a failed check, after it stops the stack and attaches the record', async () => {
		const stop = vi.fn(async () => await Promise.resolve());
		const attached: string[] = [];
		const attach = async (_name: string, { body }: { body: string }) => {
			attached.push(body);
			await Promise.resolve();
		};
		const s = new Scenario('demo', { n8nContainers: () => [], stop }, dir);

		await expect(
			s.run({ attach }, async () => {
				s.verify({ always: [['exit code', 1, is(0)]] });
				await Promise.resolve();
			}),
		).rejects.toThrow('failed checks: exit code: 1 is 0');
		expect(stop).toHaveBeenCalledTimes(1);
		expect(attached.map((body) => JSON.parse(body) as unknown)).toMatchObject([
			{
				scenario: 'demo',
				failedChecks: ['exit code: 1 is 0'],
			},
		]);
	});
});
