import { ExpressionError } from '../../src/errors';

describe('ExecutionBaseError', () => {
	it('should set name to the concrete class name', () => {
		const error = new ExpressionError('message');

		expect(error.name).toBe('ExpressionError');
	});

	describe('with a frozen Error.prototype', () => {
		const nameDescriptor = Object.getOwnPropertyDescriptor(Error.prototype, 'name')!;

		beforeAll(() => {
			Object.defineProperty(Error.prototype, 'name', { ...nameDescriptor, writable: false });
		});

		afterAll(() => {
			Object.defineProperty(Error.prototype, 'name', nameDescriptor);
		});

		it('should construct and set name without writing through the prototype', () => {
			const error = new ExpressionError('Paired item data is unavailable');

			expect(error.name).toBe('ExpressionError');
			expect(Object.getOwnPropertyDescriptor(error, 'name')?.writable).toBe(true);
		});
	});
});
