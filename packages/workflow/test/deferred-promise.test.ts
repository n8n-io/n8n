import { createDeferredPromise } from '../src/deferred-promise';

describe('DeferredPromise', () => {
	it('should resolve the promise with the correct value', async () => {
		let done = false;
		const deferred = createDeferredPromise<string>();
		void deferred.promise.finally(() => {
			done = true;
		});
		expect(done).toBe(false);
		deferred.resolve('test');
		await expect(deferred.promise).resolves.toBe('test');
		expect(done).toBe(true);
	});

	it('should reject the promise with the correct error', async () => {
		const deferred = createDeferredPromise();
		const error = new Error('test error');
		deferred.reject(error);
		await expect(deferred.promise).rejects.toThrow(error);
	});
});
