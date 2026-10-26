import { runFailed } from './run';

describe('runFailed', () => {
	it('fails when a variant did not pass every run', () => {
		expect(
			runFailed([
				{ name: 'a', variant: 'before', image: 'n8nio/n8n:1', passed: 2, total: 2 },
				{ name: 'a', variant: 'after', image: 'n8nio/n8n:2', passed: 1, total: 2 },
			]),
		).toBe(true);
	});
});
