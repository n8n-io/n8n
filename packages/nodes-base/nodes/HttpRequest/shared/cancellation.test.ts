import type { IExecuteFunctions } from 'n8n-workflow';

import { sleepUnlessCancelled, throwIfExecutionCancelled } from './cancellation';

describe('HttpRequest cancellation helpers', () => {
	const createContext = (signal?: AbortSignal) =>
		({
			getExecutionCancelSignal: () => signal,
			getNode: () => ({ name: 'HTTP Request' }),
		}) as unknown as IExecuteFunctions;

	describe('throwIfExecutionCancelled', () => {
		it('should not throw without a signal', () => {
			expect(() => throwIfExecutionCancelled(createContext())).not.toThrow();
		});

		it('should throw a cancellation error when the signal is aborted', () => {
			const controller = new AbortController();
			controller.abort();

			expect(() => throwIfExecutionCancelled(createContext(controller.signal))).toThrow(
				'The execution was canceled',
			);
		});
	});

	describe('sleepUnlessCancelled', () => {
		it('should resolve after the wait time', async () => {
			await expect(sleepUnlessCancelled(createContext(), 1)).resolves.toBeUndefined();
		});

		it('should throw a cancellation error when the signal is already aborted', async () => {
			const controller = new AbortController();
			controller.abort();

			await expect(sleepUnlessCancelled(createContext(controller.signal), 60_000)).rejects.toThrow(
				'The execution was canceled',
			);
		});

		it('should stop waiting and throw a cancellation error when the signal aborts', async () => {
			const controller = new AbortController();
			const wait = sleepUnlessCancelled(createContext(controller.signal), 60_000);
			controller.abort();

			await expect(wait).rejects.toThrow('The execution was canceled');
		});
	});
});
