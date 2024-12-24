import { createHash } from 'crypto';

let instance: ConnectionPoolManager;

// 5 minutes
const ttl = 5 * 60 * 1000;

// 1 minute
const cleanUpInterval = 60 * 1000;

type Options = {
	credentials: unknown;
	nodeType: string;
	nodeVersion?: string;
};

export class ConnectionPoolManager {
	/**
	 * Gets the singleton instance of the ConnectionPoolManager.
	 * Creates a new instance if one doesn't exist.
	 */
	static getInstance(): ConnectionPoolManager {
		if (instance) {
			return instance;
		}

		instance = new ConnectionPoolManager();

		return instance;
	}

	/**
	 * Private constructor that initializes the connection pool manager.
	 * Sets up cleanup handlers for process exit and stale connections.
	 */
	private constructor(
		private map: Map<
			string,
			{ pool: unknown; cleanUpHandler: (pool: unknown) => Promise<void>; lastUsed: number }
		> = new Map(),
	) {
		// Close all SSH connections when the process exits
		process.on('exit', () => this.onShutdown());

		// Regularly close stale SSH connections
		setInterval(() => this.cleanupStaleConnections(), cleanUpInterval);
	}

	/**
	 * Generates a unique key for connection pool identification.
	 * Hashes the credentials and node information for security.
	 */
	private makeKey({ credentials, nodeType, nodeVersion }: Options): string {
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
	async getConnection<T>(
		options: Options,
		fallBackHandler: () => Promise<T>,
		cleanUpHandler: (pool: T) => Promise<void>,
	): Promise<T> {
		const key = this.makeKey(options);

		let value = this.map.get(key);

		if (value) {
			this.map.set(key, { ...value, lastUsed: Date.now() });

			return value.pool as T;
		}

		value = {
			pool: await fallBackHandler(),
			cleanUpHandler: cleanUpHandler as (pool: unknown) => Promise<void>,
			lastUsed: Date.now(),
		};

		this.map.set(key, value);

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
