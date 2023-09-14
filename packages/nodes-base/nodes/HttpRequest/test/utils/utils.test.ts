import { prepareRequestBody } from '../../GenericFunctions';
import type { BodyParameter, BodyParametersReducer } from '../../GenericFunctions';

describe('HTTP Node Utils, prepareRequestBody', () => {
	it('should call default reducer', () => {
		const bodyParameters: BodyParameter[] = [
			{
				name: 'foo.bar',
				value: 'baz',
			},
		];
		const defaultReducer: BodyParametersReducer = jest.fn();

		prepareRequestBody(bodyParameters, 'json', 3, defaultReducer);

		expect(defaultReducer).toBeCalledTimes(1);
		expect(defaultReducer).toBeCalledWith({}, { name: 'foo.bar', value: 'baz' }, 0, [
			{ name: 'foo.bar', value: 'baz' },
		]);
	});

	it('should call process dot notations', () => {
		const bodyParameters: BodyParameter[] = [
			{
				name: 'foo.bar.spam',
				value: 'baz',
			},
		];
		const defaultReducer: BodyParametersReducer = jest.fn();

		const result = prepareRequestBody(bodyParameters, 'json', 4, defaultReducer);

		expect(defaultReducer).toBeCalledTimes(0);
		expect(result).toBeDefined();
		expect(result).toEqual({ foo: { bar: { spam: 'baz' } } });
	});
});
