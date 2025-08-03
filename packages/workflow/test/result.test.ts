import {
	createResultOk,
	createResultError,
	toResult,
	type Result,
	type ResultOk,
	type ResultError,
} from '../src/result';

describe('result', () => {
	describe('createResultOk', () => {
		it('should create a successful result with data', () => {
			const data = 'test data';
			const result = createResultOk(data);

			expect(result.ok).toBe(true);
			expect(result.result).toBe(data);
		});

		it('should work with different data types', () => {
			const stringResult = createResultOk('string');
			expect(stringResult.ok).toBe(true);
			expect(stringResult.result).toBe('string');

			const numberResult = createResultOk(42);
			expect(numberResult.ok).toBe(true);
			expect(numberResult.result).toBe(42);

			const objectResult = createResultOk({ key: 'value' });
			expect(objectResult.ok).toBe(true);
			expect(objectResult.result).toEqual({ key: 'value' });

			const arrayResult = createResultOk([1, 2, 3]);
			expect(arrayResult.ok).toBe(true);
			expect(arrayResult.result).toEqual([1, 2, 3]);
		});

		it('should work with null and undefined', () => {
			const nullResult = createResultOk(null);
			expect(nullResult.ok).toBe(true);
			expect(nullResult.result).toBe(null);

			const undefinedResult = createResultOk(undefined);
			expect(undefinedResult.ok).toBe(true);
			expect(undefinedResult.result).toBe(undefined);
		});

		it('should have correct type structure', () => {
			const result = createResultOk('test');

			// TypeScript type check
			expect('ok' in result).toBe(true);
			expect('result' in result).toBe(true);
			expect('error' in result).toBe(false);
		});
	});

	describe('createResultError', () => {
		it('should create an error result with error data', () => {
			const error = new Error('test error');
			const result = createResultError(error);

			expect(result.ok).toBe(false);
			expect(result.error).toBe(error);
		});

		it('should work with different error types', () => {
			const stringError = createResultError('string error');
			expect(stringError.ok).toBe(false);
			expect(stringError.error).toBe('string error');

			const objectError = createResultError({ message: 'error object' });
			expect(objectError.ok).toBe(false);
			expect(objectError.error).toEqual({ message: 'error object' });

			const numberError = createResultError(404);
			expect(numberError.ok).toBe(false);
			expect(numberError.error).toBe(404);
		});

		it('should work with Error instances', () => {
			const error = new Error('test error');
			error.stack = 'test stack';

			const result = createResultError(error);
			expect(result.ok).toBe(false);
			expect(result.error).toBe(error);
			expect(result.error.message).toBe('test error');
			expect(result.error.stack).toBe('test stack');
		});

		it('should have correct type structure', () => {
			const result = createResultError('test error');

			// TypeScript type check
			expect('ok' in result).toBe(true);
			expect('error' in result).toBe(true);
			expect('result' in result).toBe(false);
		});
	});

	describe('toResult', () => {
		it('should return success result for function that completes successfully', () => {
			const successFn = () => 'success value';
			const result = toResult(successFn);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.result).toBe('success value');
			}
		});

		it('should return error result for function that throws', () => {
			const errorFn = () => {
				throw new Error('test error');
			};
			const result = toResult(errorFn);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBeInstanceOf(Error);
				expect(result.error.message).toBe('test error');
			}
		});

		it('should handle functions returning different types', () => {
			const numberFn = () => 42;
			const numberResult = toResult(numberFn);
			expect(numberResult.ok).toBe(true);
			if (numberResult.ok) {
				expect(numberResult.result).toBe(42);
			}

			const objectFn = () => ({ key: 'value' });
			const objectResult = toResult(objectFn);
			expect(objectResult.ok).toBe(true);
			if (objectResult.ok) {
				expect(objectResult.result).toEqual({ key: 'value' });
			}

			const arrayFn = () => [1, 2, 3];
			const arrayResult = toResult(arrayFn);
			expect(arrayResult.ok).toBe(true);
			if (arrayResult.ok) {
				expect(arrayResult.result).toEqual([1, 2, 3]);
			}
		});

		it('should handle functions throwing non-Error objects', () => {
			const stringThrowFn = () => {
				throw 'string error';
			};
			const stringResult = toResult(stringThrowFn);
			expect(stringResult.ok).toBe(false);
			if (!stringResult.ok) {
				expect(stringResult.error).toBeInstanceOf(Error);
				// ensureError wraps non-Error objects in Error with different message
				expect(stringResult.error.message).toContain(
					'Error that was not an instance of Error was thrown',
				);
			}

			const objectThrowFn = () => {
				throw { message: 'object error' };
			};
			const objectResult = toResult(objectThrowFn);
			expect(objectResult.ok).toBe(false);
			if (!objectResult.ok) {
				expect(objectResult.error).toBeInstanceOf(Error);
				expect(objectResult.error.message).toContain(
					'Error that was not an instance of Error was thrown',
				);
			}
		});

		it('should handle functions throwing null or undefined', () => {
			const nullThrowFn = () => {
				throw null;
			};
			const nullResult = toResult(nullThrowFn);
			expect(nullResult.ok).toBe(false);
			if (!nullResult.ok) {
				expect(nullResult.error).toBeInstanceOf(Error);
			}

			const undefinedThrowFn = () => {
				throw undefined;
			};
			const undefinedResult = toResult(undefinedThrowFn);
			expect(undefinedResult.ok).toBe(false);
			if (!undefinedResult.ok) {
				expect(undefinedResult.error).toBeInstanceOf(Error);
			}
		});

		it('should preserve Error properties when rethrowing', () => {
			const customError = new Error('custom error');
			customError.name = 'CustomError';
			(customError as any).code = 'CUSTOM_CODE';

			const errorFn = () => {
				throw customError;
			};
			const result = toResult(errorFn);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBe(customError);
				expect(result.error.name).toBe('CustomError');
				expect((result.error as any).code).toBe('CUSTOM_CODE');
			}
		});

		it('should work with async-like functions (though they must be sync)', () => {
			// Note: toResult expects synchronous functions
			const syncFn = () => {
				// Simulate some synchronous work
				let result = 0;
				for (let i = 0; i < 10; i++) {
					result += i;
				}
				return result;
			};

			const result = toResult(syncFn);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.result).toBe(45); // Sum of 0-9
			}
		});
	});

	describe('Result type system', () => {
		it('should work with type guards', () => {
			const successResult: Result<string, Error> = createResultOk('success');
			const errorResult: Result<string, Error> = createResultError(new Error('error'));

			if (successResult.ok) {
				// TypeScript should know this is ResultOk<string>
				expect(successResult.result).toBe('success');
			}

			if (!errorResult.ok) {
				// TypeScript should know this is ResultError<Error>
				expect(errorResult.error).toBeInstanceOf(Error);
			}
		});

		it('should support different generic types', () => {
			const stringResult: Result<string, Error> = createResultOk('test');
			const numberResult: Result<number, string> = createResultOk(42);
			const objectResult: Result<{ key: string }, { code: number }> = createResultOk({
				key: 'value',
			});

			expect(stringResult.ok).toBe(true);
			expect(numberResult.ok).toBe(true);
			expect(objectResult.ok).toBe(true);
		});

		it('should work in practical scenarios', () => {
			// Simulate a function that might fail
			const parseJsonString = (jsonStr: string): Result<any, Error> => {
				return toResult(() => JSON.parse(jsonStr));
			};

			const validJson = parseJsonString('{"key": "value"}');
			expect(validJson.ok).toBe(true);
			if (validJson.ok) {
				expect(validJson.result).toEqual({ key: 'value' });
			}

			const invalidJson = parseJsonString('invalid json');
			expect(invalidJson.ok).toBe(false);
			if (!invalidJson.ok) {
				expect(invalidJson.error).toBeInstanceOf(Error);
			}
		});

		it('should support chaining patterns', () => {
			const processResult = <T, E>(
				result: Result<T, E>,
				processor: (value: T) => T,
			): Result<T, E> => {
				if (result.ok) {
					return createResultOk(processor(result.result));
				}
				return result;
			};

			const initialResult = createResultOk(10);
			const processedResult = processResult(initialResult, (x) => x * 2);

			expect(processedResult.ok).toBe(true);
			if (processedResult.ok) {
				expect(processedResult.result).toBe(20);
			}

			const errorResult = createResultError('error');
			const processedError = processResult(errorResult, (x) => x * 2);

			expect(processedError.ok).toBe(false);
			if (!processedError.ok) {
				expect(processedError.error).toBe('error');
			}
		});
	});
});
