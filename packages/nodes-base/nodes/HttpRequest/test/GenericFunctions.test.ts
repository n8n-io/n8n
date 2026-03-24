import { updadeQueryParameterConfig, prepareRequestBody } from '../GenericFunctions';

describe('updadeQueryParameterConfig', () => {
	describe('version < 4.3 (legacy behavior)', () => {
		const updateQueryParam = updadeQueryParameterConfig(4.2);

		it('should set simple key-value pairs', () => {
			const qs = {};
			updateQueryParam(qs, 'key1', 'value1');
			expect(qs).toEqual({ key1: 'value1' });
		});

		it('should overwrite existing values', () => {
			const qs = { key1: 'oldValue' };
			updateQueryParam(qs, 'key1', 'newValue');
			expect(qs).toEqual({ key1: 'newValue' });
		});
	});

	describe('version >= 4.3 (array behavior)', () => {
		const updateQueryParam = updadeQueryParameterConfig(4.3);

		it('should set initial value when key does not exist', () => {
			const qs = {};
			updateQueryParam(qs, 'key1', 'value1');
			expect(qs).toEqual({ key1: 'value1' });
		});

		it('should create array when adding second value', () => {
			const qs = { key1: 'value1' };
			updateQueryParam(qs, 'key1', 'value2');
			expect(qs).toEqual({ key1: ['value1', 'value2'] });
		});

		it('should append to existing array', () => {
			const qs = { key1: ['value1', 'value2'] };
			updateQueryParam(qs, 'key1', 'value3');
			expect(qs).toEqual({ key1: ['value1', 'value2', 'value3'] });
		});

		it('should handle undefined values correctly', () => {
			const qs = {};
			updateQueryParam(qs, 'newKey', 'value');
			expect(qs).toEqual({ newKey: 'value' });
		});
	});

	describe('version boundary', () => {
		it('should use legacy behavior for version 4.2', () => {
			const updateQueryParam = updadeQueryParameterConfig(4.2);
			const qs = { key: 'first' };
			updateQueryParam(qs, 'key', 'second');
			expect(qs.key).toBe('second');
		});

		it('should use array behavior for version 4.3', () => {
			const updateQueryParam = updadeQueryParameterConfig(4.3);
			const qs = { key: 'first' };
			updateQueryParam(qs, 'key', 'second');
			expect(qs.key).toEqual(['first', 'second']);
		});
	});
});

describe('Prepare Request Body', () => {
	// Regression test for https://github.com/n8n-io/n8n/issues/25567

	it('Should Ignore Null Or Undefined Parameters', async () => {
		const parameters = [
			{ name: 'Key1', value: 'value1' },
			null,
			undefined,
			{ name: 'Key2', value: 'value2' },
		];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
		const body = await prepareRequestBody(parameters as any, 'json', 4, async (acc, curr) => {
			// Mock reducer for testing
			acc[curr.name] = curr.value;
			await Promise.resolve();
			return acc;
		});
		// eslint-disable-next-line @typescript-eslint/naming-convention
		expect(body).toEqual({ Key1: 'value1', Key2: 'value2' });
	});
});
