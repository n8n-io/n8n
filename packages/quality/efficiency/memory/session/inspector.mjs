import { openSync, closeSync, writeSync } from 'node:fs';

export class InspectorClient {
	#socket;
	#nextId = 0;
	#pending = new Map();
	#snapshotSink;
	#requestSink;
	#binding = `n8nMemoryRequests${Math.random().toString(36).slice(2)}`;
	closed = false;

	static async connect(endpoint, timeoutMs = 5000) {
		let url = new URL(endpoint);
		if (url.protocol === 'http:' || url.protocol === 'https:') {
			const response = await fetch(new URL('/json/list', url), {
				signal: AbortSignal.timeout(timeoutMs),
			});
			if (!response.ok) throw new Error(`Inspector discovery returned ${response.status}`);
			const targets = await response.json();
			if (targets.length !== 1 || !targets[0].webSocketDebuggerUrl) {
				throw new Error('Specify one Node Inspector WebSocket endpoint');
			}
			url = new URL(targets[0].webSocketDebuggerUrl);
		}
		if (!['ws:', 'wss:'].includes(url.protocol)) throw new Error('Invalid Inspector protocol');
		const socket = new WebSocket(url);
		const client = new InspectorClient(socket);
		await new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				socket.close();
				reject(new Error('Inspector connection timed out'));
			}, timeoutMs);
			socket.addEventListener(
				'open',
				() => {
					clearTimeout(timer);
					resolve();
				},
				{ once: true },
			);
			socket.addEventListener(
				'error',
				() => {
					clearTimeout(timer);
					reject(new Error('Inspector connection failed'));
				},
				{ once: true },
			);
		});
		return client;
	}

	constructor(socket) {
		this.#socket = socket;
		socket.addEventListener('message', ({ data }) => {
			try {
				const message = JSON.parse(data);
				if (message.method === 'HeapProfiler.addHeapSnapshotChunk') {
					this.#snapshotSink?.(message.params.chunk);
				}
				if (message.method === 'Runtime.bindingCalled' && message.params.name === this.#binding)
					this.#requestSink?.(JSON.parse(message.params.payload));
				const pending = this.#pending.get(message.id);
				if (!pending) return;
				this.#pending.delete(message.id);
				clearTimeout(pending.timer);
				if (message.error) pending.reject(new Error(message.error.message));
				else pending.resolve(message.result);
			} catch (error) {
				this.close(error);
			}
		});
		socket.addEventListener('close', () => this.close(new Error('Inspector disconnected')));
		socket.addEventListener('error', () => this.close(new Error('Inspector connection failed')));
	}

	async request(method, params = {}, timeoutMs = 5000) {
		if (this.closed) throw new Error('Inspector disconnected');
		return await new Promise((resolve, reject) => {
			const id = ++this.#nextId;
			const timer = setTimeout(() => {
				this.#pending.delete(id);
				reject(new Error(`${method} timed out`));
			}, timeoutMs);
			this.#pending.set(id, { resolve, reject, timer });
			this.#socket.send(JSON.stringify({ id, method, params }));
		});
	}

	async evaluate(expression) {
		const response = await this.request('Runtime.evaluate', { expression, returnByValue: true });
		if (response.exceptionDetails) throw new Error('Cannot read the backend process');
		return response.result.value;
	}

	async snapshot(filename) {
		const fd = openSync(filename, 'wx', 0o600);
		// Write chunks outside the target process. Do not assemble the snapshot in memory.
		this.#snapshotSink = (chunk) => writeSync(fd, chunk);
		try {
			await this.request('HeapProfiler.takeHeapSnapshot', {}, 120_000);
		} finally {
			this.#snapshotSink = undefined;
			closeSync(fd);
		}
	}

	async trackRequests(sink, leaseMs = 180_000) {
		this.#requestSink = sink;
		await this.request('Runtime.enable');
		await this.request('Runtime.addBinding', { name: this.#binding });
		await this.evaluate(`(() => {
			const channel = process.getBuiltinModule('node:diagnostics_channel').channel('n8n.memory-profiler.requests');
			const key = ${JSON.stringify(`${this.#binding}State`)};
			const state = { expiresAt: Date.now() + ${leaseMs} };
			const callback = event => {
				try { globalThis[${JSON.stringify(this.#binding)}](JSON.stringify(event)); }
				catch { state.dispose(); }
			};
			const timer = setInterval(() => { if (Date.now() > state.expiresAt) state.dispose(); }, 10_000);
			timer.unref();
			state.dispose = () => { channel.unsubscribe(callback); clearInterval(timer); delete globalThis[key]; delete globalThis[${JSON.stringify(this.#binding)}]; };
			globalThis[key] = state;
			channel.subscribe(callback);
		})()`);
	}

	async refreshRequests(leaseMs) {
		if (this.#requestSink && !this.closed)
			await this.evaluate(`(() => {
				const state = globalThis[${JSON.stringify(`${this.#binding}State`)}];
				if (!state) throw new Error('Request tracking expired');
				state.expiresAt = Date.now() + ${leaseMs};
			})()`);
	}

	async stopRequests() {
		if (!this.#requestSink || this.closed) return;
		await this.evaluate(`(() => {
			globalThis[${JSON.stringify(`${this.#binding}State`)}]?.dispose();
		})()`);
		await this.request('Runtime.removeBinding', { name: this.#binding });
		this.#requestSink = undefined;
	}

	close(error = new Error('Inspector closed')) {
		if (this.closed) return;
		this.closed = true;
		for (const pending of this.#pending.values()) {
			clearTimeout(pending.timer);
			pending.reject(error);
		}
		this.#pending.clear();
		this.#socket.close();
	}
}
