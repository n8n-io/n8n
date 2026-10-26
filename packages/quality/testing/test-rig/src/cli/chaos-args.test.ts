import { parseChaosArgs } from './chaos-args';

describe('parseChaosArgs', () => {
	it('rejects a fractional count', () => {
		expect(() => parseChaosArgs(['--faults', '1.5'])).toThrow('Usage:');
	});

	it('accepts seed 0', () => {
		expect(parseChaosArgs(['--seed', '0']).seed).toBe(0);
	});
});
