import { jsonParse } from '../src/utils';

describe('utils', () => {
	describe('jsonParse', () => {
		it('optionally throws `errorMessage', () => {
			expect(() => {
				jsonParse('', { errorMessage: 'Invalid JSON' });
			}).toThrow('Invalid JSON');
		});

		it('optionally returns a `fallbackValue`', () => {
			expect(jsonParse('', { fallbackValue: { foo: 'bar' } })).toEqual({ foo: 'bar' });
		});

		it('does not allow passing in both `errorMessage` as well as `fallbackValue`', () => {
			// jsonParse('[1, 2, 3]', { errorMessage: 'This is an error', fallbackValue: '123' });
		});
	});
});
