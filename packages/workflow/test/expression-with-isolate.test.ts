import { Expression } from '../src/expression';

describe('Expression.withIsolate', () => {
	const expression = new Expression('Europe/Berlin');

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns the result of fn', async () => {
		vi.spyOn(expression, 'acquireIsolate').mockResolvedValue(true);
		const release = vi.spyOn(expression, 'releaseIsolate').mockResolvedValue();

		await expect(expression.withIsolate(async () => await Promise.resolve('result'))).resolves.toBe(
			'result',
		);
		expect(release).toHaveBeenCalledTimes(1);
	});

	it('releases when fn throws, propagating the error', async () => {
		vi.spyOn(expression, 'acquireIsolate').mockResolvedValue(true);
		const release = vi.spyOn(expression, 'releaseIsolate').mockResolvedValue();

		await expect(
			expression.withIsolate(async () => {
				return await Promise.reject(new Error('boom from fn'));
			}),
		).rejects.toThrow('boom from fn');
		expect(release).toHaveBeenCalledTimes(1);
	});

	it('does not release an isolate it did not acquire', async () => {
		vi.spyOn(expression, 'acquireIsolate').mockResolvedValue(false);
		const release = vi.spyOn(expression, 'releaseIsolate').mockResolvedValue();

		await expect(expression.withIsolate(async () => await Promise.resolve('result'))).resolves.toBe(
			'result',
		);
		expect(release).not.toHaveBeenCalled();
	});

	it('never masks the outcome of fn with a release failure', async () => {
		vi.spyOn(expression, 'acquireIsolate').mockResolvedValue(true);
		vi.spyOn(expression, 'releaseIsolate').mockRejectedValue(new Error('release boom'));

		await expect(expression.withIsolate(async () => await Promise.resolve('result'))).resolves.toBe(
			'result',
		);
		await expect(
			expression.withIsolate(async () => {
				return await Promise.reject(new Error('boom from fn'));
			}),
		).rejects.toThrow('boom from fn');
	});
});
