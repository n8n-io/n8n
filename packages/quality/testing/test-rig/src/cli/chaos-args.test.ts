import { parseChaosArgs } from './chaos-args';

describe('parseChaosArgs', () => {
	it('rejects a fractional count', () => {
		expect(() => parseChaosArgs(['--faults', '1.5'])).toThrow('Usage:');
	});

	it('rejects a duration or rate that needs a delay over the Node timer limit', () => {
		expect(() => parseChaosArgs(['--duration', '2147484'])).toThrow('Node cannot wait');
		expect(() => parseChaosArgs(['--rate', '0.0000001'])).toThrow('Node cannot wait');
		expect(parseChaosArgs(['--duration', '2147483']).durationMs).toBe(2_147_483_000);
	});

	it('accepts seed 0', () => {
		expect(parseChaosArgs(['--seed', '0']).seed).toBe(0);
	});
});
