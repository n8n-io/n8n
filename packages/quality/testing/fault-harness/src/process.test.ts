import { sleep } from '@n8n/utils/sleep';

import { until } from './process';

describe('until', () => {
	it('returns when the check holds after the deadline has passed', async () => {
		const check = async () => {
			await sleep(30);
			return true;
		};
		await expect(until('slow', check, 5)).resolves.toEqual(expect.any(Number));
	});

	it('throws when the check never holds', async () => {
		await expect(until('never', async () => false, 20, 5)).rejects.toThrow(
			'never not reached in 20ms',
		);
	});
});
