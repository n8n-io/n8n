import { createHash } from 'crypto';
import { OperationalError, type Logger } from 'n8n-workflow';

let instance: ConnectionPoolManager;

// 5 minutes
const ttl = 5 * 60 * 1000;

// 1 minute
const cleanUpInterval = 60 * 1000;

type RegistrationOptions = {
	credentials: unknown;
	nodeType: string;
	nodeVersion?: string;
};

type GetConnectionOption<Pool> = RegistrationOptions & {
	/**
	 * When a node requests for a connection pool, but none is available, this
	 * handler is called to create new instance of the pool, which is then cached
	 * and re-used until it goes stale.
	 */
	fallBackHandler: (abortController: AbortController) => Promise<Pool>;

	wasUsed: (pool: Pool) => void;
};

type Registration<Pool> = {
	/** This is an instance of a Connection Pool class, that gets reused across multiple executions */
	pool: Pool;

	abortController: AbortController;

	wasUsed: (pool: Pool) => void;

	/** We keep this timestamp to check if a pool hasn't been used in a while, and if it needs to be closed */
	lastUsed: number;
};

export class ConnectionPoolManager {
	/**
	 * Gets the singleton instance of the ConnectionPoolManager.
	 * Creates a new instance if one doesn't exist.
	 */
	static getInstance(logger: Logger): ConnectionPoolManager {
		if (!instance) {
			instance = new ConnectionPoolManager(logger);
		}
		return instance;
	}

	private map = new Map<string, Registration<unknown>>();

	/**
	 * Private constructor that initializes the connection pool manager.
	 * Sets up cleanup handlers for process exit and stale connections.
	 */
	private constructor(private readonly logger: Logger) {
		// Close all open pools when the process exits
		process.on('exit', () => {
			this.logger.debug('ConnectionPoolManager: Shutting down. Cleaning up all pools');
			this.purgeConnections();
		});

		// Regularly close stale pools
		setInterval(() => this.cleanupStaleConnections(), cleanUpInterval);
	}

	/**
	 * Generates a unique key for connection pool identification.
	 * Hashes the credentials and node information for security.
	 */
	private makeKey({ credentials, nodeType, nodeVersion }: RegistrationOptions): string {
		// The credential contains decrypted secrets, that's why we hash it.
		return createHash('sha1')
			.update(
				JSON.stringify({
					credentials,
					nodeType,
					nodeVersion,
				}),
			)
			.digest('base64');
	}

	/**
	 * Gets or creates a connection pool for the given options.
	 * Updates the last used timestamp for existing connections.
	 */
	async getConnection<T>(options: GetConnectionOption<T>): Promise<T> {
		const key = this.makeKey(options);

		let value = this.map.get(key);

		if (value) {
			value.lastUsed = Date.now();
			value.wasUsed(value.pool);
			return value.pool as T;
		}

		const abortController = new AbortController();
		value = {
			pool: await options.fallBackHandler(abortController),
			abortController,
			wasUsed: options.wasUsed,
		} as Registration<unknown>;

		// It's possible that `options.fallBackHandler` already called the abort
		// function. If that's the case let's not continue.
		if (abortController.signal.aborted) {
			throw new OperationalError('Could not create pool. Connection attempt was aborted.', {
				cause: abortController.signal.reason,
			});
		}

		this.map.set(key, { ...value, lastUsed: Date.now() });
		abortController.signal.addEventListener('abort', async () => {
			this.logger.debug('ConnectionPoolManager: Got abort signal, cleaning up pool.');
			this.cleanupConnection(key);
		});

		return value.pool as T;
	}

	private cleanupConnection(key: string) {
		const registration = this.map.get(key);

		if (registration) {
			this.map.delete(key);
			registration.abortController.abort();
		}
	}

	/**
	 * Removes and cleans up connection pools that haven't been used within the
	 * TTL.
	 */
	private cleanupStaleConnections() {
		const now = Date.now();
		for (const [key, { lastUsed }] of this.map.entries()) {
			if (now - lastUsed > ttl) {
				this.logger.debug('ConnectionPoolManager: Found stale pool. Cleaning it up.');
				void this.cleanupConnection(key);
			}
		}
	}

	/**
	 * Removes and cleans up all existing connection pools.
	 * Connections are closed in the background.
	 */
	purgeConnections(): void {
		for (const key of this.map.keys()) {
			this.cleanupConnection(key);
		}
	}
}
