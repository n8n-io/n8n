import { createHash } from 'crypto';
import { OperationalError } from 'n8n-workflow';
let instance;
// 5 minutes
const ttl = 5 * 60 * 1000;
// 1 minute
const cleanUpInterval = 60 * 1000;
export class ConnectionPoolManager {
    logger;
    /**
     * Gets the singleton instance of the ConnectionPoolManager.
     * Creates a new instance if one doesn't exist.
     */
    static getInstance(logger) {
        if (!instance) {
            instance = new ConnectionPoolManager(logger);
        }
        return instance;
    }
    map = new Map();
    /**
     * Private constructor that initializes the connection pool manager.
     * Sets up cleanup handlers for process exit and stale connections.
     */
    constructor(logger) {
        this.logger = logger;
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
    makeKey({ credentials, nodeType, nodeVersion, poolKeyExtras, }) {
        // The credential contains decrypted secrets, that's why we hash it.
        return createHash('sha1')
            .update(JSON.stringify({
            credentials,
            nodeType,
            nodeVersion,
            poolKeyExtras,
        }))
            .digest('base64');
    }
    /**
     * Gets or creates a connection pool for the given options.
     * Updates the last used timestamp for existing connections.
     */
    async getConnection(options) {
        const key = this.makeKey(options);
        let value = this.map.get(key);
        if (value) {
            value.lastUsed = Date.now();
            options.wasUsed(value.pool);
            return value.pool;
        }
        const abortController = new AbortController();
        value = {
            pool: await options.fallBackHandler(abortController),
            abortController,
            isIdle: options.isIdle,
        };
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
        return value.pool;
    }
    cleanupConnection(key) {
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
    cleanupStaleConnections() {
        const now = Date.now();
        for (const [key, registration] of this.map.entries()) {
            const { isIdle, lastUsed, pool } = registration;
            if (now - lastUsed > ttl) {
                if (isIdle && !isIdle(pool)) {
                    registration.lastUsed = now;
                    this.logger.debug('ConnectionPoolManager: Found stale pool, but it is still in use.');
                    continue;
                }
                this.logger.debug('ConnectionPoolManager: Found stale pool. Cleaning it up.');
                void this.cleanupConnection(key);
            }
        }
    }
    /**
     * Removes and cleans up all existing connection pools.
     * Connections are closed in the background.
     */
    purgeConnections() {
        for (const key of this.map.keys()) {
            this.cleanupConnection(key);
        }
    }
}
//# sourceMappingURL=connection-pool-manager.js.map