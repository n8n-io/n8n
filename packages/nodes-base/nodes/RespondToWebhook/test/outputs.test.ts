import { configuredOutputs } from '../utils/outputs';

describe('configuredOutputs', () => {
	it('returns array of objects when version >= 1.3', () => {
		const result = configuredOutputs(1.3, {});
		expect(result).toEqual([
			{ type: 'main', displayName: 'Input Data' },
			{ type: 'main', displayName: 'Response' },
		]);
	});

	it('returns array of objects when version > 1.4 and enableResponseOutput', () => {
		const result = configuredOutputs(2, { enableResponseOutput: true });
		expect(result).toEqual([
			{ type: 'main', displayName: 'Input Data' },
			{ type: 'main', displayName: 'Response' },
		]);
	});

	it('returns ["main"] when version < 1.3', () => {
		const result = configuredOutputs(1.2, {});
		expect(result).toEqual(['main']);
	});

	it('returns array of objects when version  1.4 and enableResponseOutput', () => {
		const result = configuredOutputs(1.4, { enableResponseOutput: true });
		expect(result).toEqual([
			{ type: 'main', displayName: 'Input Data' },
			{ type: 'main', displayName: 'Response' },
		]);
	});

	it('returns ["main"] when version  1.4 and !enableResponseOutput', () => {
		const result = configuredOutputs(1.4, { enableResponseOutput: false });
		expect(result).toEqual(['main']);
	});
});
