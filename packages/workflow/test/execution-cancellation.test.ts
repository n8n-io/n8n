import {
	sleepUnlessExecutionCancelled,
	throwIfExecutionCancelled,
} from '../src/execution-cancellation';
import type { IExecuteFunctions } from '../src/interfaces';

describe('execution cancellation helpers', () => {
	const createContext = (signal?: AbortSignal) =>
		({
			getExecutionCancelSignal: () => signal,
			getNode: () => ({ name: 'Test Node' }),
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

	describe('sleepUnlessExecutionCancelled', () => {
		it('should resolve after the wait time', async () => {
			await expect(sleepUnlessExecutionCancelled(createContext(), 1)).resolves.toBeUndefined();
		});

		it('should throw a cancellation error when the signal is already aborted', async () => {
			const controller = new AbortController();
			controller.abort();

			await expect(
				sleepUnlessExecutionCancelled(createContext(controller.signal), 60_000),
			).rejects.toThrow('The execution was canceled');
		});

		it('should stop waiting and throw a cancellation error when the signal aborts', async () => {
			const controller = new AbortController();
			const wait = sleepUnlessExecutionCancelled(createContext(controller.signal), 60_000);
			controller.abort();

			await expect(wait).rejects.toThrow('The execution was canceled');
		});
	});

	describe('does not fail when the context does not have cancellation implemented', () => {
		it('throwIfExecutionCancelled should not throw', () => {
			expect(() => throwIfExecutionCancelled({} as unknown as IExecuteFunctions)).not.toThrow();
		});

		it('sleepUnlessExecutionCancelled should resolve', async () => {
			await expect(
				sleepUnlessExecutionCancelled({} as unknown as IExecuteFunctions, 1),
			).resolves.toBeUndefined();
		});
	});
});
