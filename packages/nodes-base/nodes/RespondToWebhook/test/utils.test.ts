import { configuredOutputs } from '../utils';

describe('configuredOutputs', () => {
	it('returns array of objects when version >= 1.3', () => {
		const result = configuredOutputs(1.3);
		expect(result).toEqual([
			{ type: 'main', displayName: 'Input Data' },
			{ type: 'main', displayName: 'Response' },
		]);
	});

	it('returns array of objects when version > 1.3', () => {
		const result = configuredOutputs(2);
		expect(result).toEqual([
			{ type: 'main', displayName: 'Input Data' },
			{ type: 'main', displayName: 'Response' },
		]);
	});

	it('returns ["main"] when version < 1.3', () => {
		const result = configuredOutputs(1.2);
		expect(result).toEqual(['main']);
	});
});
