import { createHash } from 'crypto';

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
	/** When a node requests for a connection pool, but none is available, this handler is called to create new instance of the pool, which then cached and re-used until it goes stale.  */
	fallBackHandler: () => Promise<Pool>;

	/** When a pool hasn't been used in a while, or when the server is shutting down, this handler is invoked to close the pool */
	cleanUpHandler: (pool: Pool) => Promise<void>;
};

type Registration<Pool> = {
	/** This is an instance of a Connection Pool class, that gets reused across multiple executions */
	pool: Pool;

	/** @see GetConnectionOption['closeHandler'] */
	cleanUpHandler: (pool: Pool) => Promise<void>;

	/** We keep this timestamp to check if a pool hasn't been used in a while, and if it needs to be closed */
	lastUsed: number;
};

export class ConnectionPoolManager {
	/**
	 * Gets the singleton instance of the ConnectionPoolManager.
	 * Creates a new instance if one doesn't exist.
	 */
	static getInstance(): ConnectionPoolManager {
		if (!instance) {
			instance = new ConnectionPoolManager();
		}
		return instance;
	}

	private map = new Map<string, Registration<unknown>>();

	/**
	 * Private constructor that initializes the connection pool manager.
	 * Sets up cleanup handlers for process exit and stale connections.
	 */
	private constructor() {
		// Close all open pools when the process exits
		process.on('exit', () => this.onShutdown());

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
		if (!value) {
			value = {
				pool: await options.fallBackHandler(),
				cleanUpHandler: options.cleanUpHandler,
			} as Registration<unknown>;
		}

		this.map.set(key, { ...value, lastUsed: Date.now() });
		return value.pool as T;
	}

	/**
	 * Removes and cleans up connection pools that haven't been used within the
	 * TTL.
	 */
	private cleanupStaleConnections() {
		const now = Date.now();
		for (const [key, { cleanUpHandler, lastUsed, pool }] of this.map.entries()) {
			if (now - lastUsed > ttl) {
				void cleanUpHandler(pool);
				this.map.delete(key);
			}
		}
	}

	/**
	 * Removes and cleans up all existing connection pools.
	 */
	async purgeConnections(): Promise<void> {
		await Promise.all(
			[...this.map.entries()].map(async ([key, value]) => {
				this.map.delete(key);

				return await value.cleanUpHandler(value.pool);
			}),
		);
	}

	/**
	 * Cleans up all connection pools when the process is shutting down.
	 * Does not wait for cleanup promises to resolve also does not remove the
	 * references from the pool.
	 *
	 * Only call this on process shutdown.
	 */
	onShutdown() {
		for (const { cleanUpHandler, pool } of this.map.values()) {
			void cleanUpHandler(pool);
		}
	}
}
