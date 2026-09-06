export class StartupTimeoutError extends Error {
	constructor(readonly timeoutMs: number) {
		super(`Startup did not complete within ${timeoutMs / 1000} seconds`);
		this.name = 'StartupTimeoutError';
	}
}

function asError(reason: unknown): Error {
	if (reason instanceof Error) return reason;
	if (typeof reason === 'string') return new Error(reason);
	return new Error('Startup was cancelled');
}

export class StartupDeadline {
	private readonly controller = new AbortController();
	private readonly startedAt = Date.now();
	private readonly timeout: NodeJS.Timeout;
	private readonly parentSignal?: AbortSignal;
	private readonly onParentAbort?: () => void;

	constructor(
		readonly timeoutMs: number,
		parentSignal?: AbortSignal,
	) {
		this.parentSignal = parentSignal;
		this.timeout = setTimeout(() => {
			this.controller.abort(new StartupTimeoutError(timeoutMs));
		}, timeoutMs);
		this.timeout.unref();

		if (parentSignal) {
			this.onParentAbort = () => this.controller.abort(parentSignal.reason);
			if (parentSignal.aborted) this.onParentAbort();
			else parentSignal.addEventListener('abort', this.onParentAbort, { once: true });
		}
	}

	get signal(): AbortSignal {
		return this.controller.signal;
	}

	get elapsedMs(): number {
		return Date.now() - this.startedAt;
	}

	get remainingMs(): number {
		return Math.max(0, this.timeoutMs - this.elapsedMs);
	}

	abort(reason: unknown = new Error('Startup was cancelled')): void {
		this.controller.abort(reason);
	}

	throwIfAborted(): void {
		if (!this.signal.aborted) return;
		throw this.signal.reason ?? new Error('Startup was cancelled');
	}

	async run<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
		this.throwIfAborted();
		const operationPromise = operation(this.signal);
		let removeAbortListener: (() => void) | undefined;
		const abortPromise = new Promise<T>((_, reject) => {
			const abort = () => reject(asError(this.signal.reason));
			if (this.signal.aborted) abort();
			else {
				this.signal.addEventListener('abort', abort, { once: true });
				removeAbortListener = () => this.signal.removeEventListener('abort', abort);
			}
		});

		try {
			return await Promise.race([operationPromise, abortPromise]);
		} finally {
			removeAbortListener?.();
		}
	}

	dispose(): void {
		clearTimeout(this.timeout);
		if (this.onParentAbort) {
			// The parent signal may outlive this startup attempt.
			// Removing the listener avoids retaining the deadline.
			// eslint-disable-next-line @typescript-eslint/unbound-method
			this.parentSignal?.removeEventListener('abort', this.onParentAbort);
		}
	}
}
