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

	it('selects the engine profile with no workers and a shorter settle time', () => {
		const inProcess = parseChaosArgs(['--engine', 'in-process']);
		expect(inProcess).toMatchObject({ engine: 'in-process', workers: 0, settleMs: 60_000 });
		expect(parseChaosArgs(['--engine', 'remote']).engine).toBe('container');
		expect(parseChaosArgs([])).toMatchObject({ engine: undefined, workers: 2, settleMs: 120_000 });
	});

	it('rejects an unknown engine mode or workers with an engine', () => {
		expect(() => parseChaosArgs(['--engine', 'container'])).toThrow('in-process or remote');
		expect(() => parseChaosArgs(['--engine', 'toString'])).toThrow('in-process or remote');
		expect(() => parseChaosArgs(['--engine', 'remote', '--workers', '1'])).toThrow('no workers');
	});
});
