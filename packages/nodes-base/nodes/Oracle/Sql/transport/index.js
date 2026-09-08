import oracledb from 'oracledb';
import { ConnectionPoolManager } from '@utils/connection-pool-manager';
// used for thick mode to call initOracleClient API only once.
let initializeDriverMode = false;
const getOracleDBConfig = (credentials) => {
    const { useThickMode, useSSL, ...dbConfig } = {
        ...credentials,
        privilege: credentials.privilege || undefined,
    };
    return dbConfig;
};
export async function configureOracleDB(credentials, options = {}) {
    const poolManager = ConnectionPoolManager.getInstance(this.logger);
    const fallBackHandler = async (abortController) => {
        const dbConfig = getOracleDBConfig(credentials);
        if (credentials.useThickMode) {
            if (!initializeDriverMode) {
                oracledb.initOracleClient();
                initializeDriverMode = true;
            }
        }
        else if (initializeDriverMode) {
            // Thick mode is initialized, cannot switch back to thin mode
            throw new Error('Thin mode can not be used after thick mode initialization');
        }
        const pool = await oracledb.createPool(dbConfig);
        abortController.signal.addEventListener('abort', async () => {
            try {
                await pool.close();
                this.logger.debug('pool closed on abort');
            }
            catch (error) {
                this.logger.error('Error closing pool on abort', { error });
            }
        });
        return pool;
    };
    return await poolManager.getConnection({
        credentials,
        nodeType: 'oracledb',
        nodeVersion: String(options.nodeVersion ?? '1'),
        fallBackHandler,
        isIdle: (pool) => pool.connectionsInUse === 0,
        wasUsed: (pool) => {
            if (pool) {
                this.logger.debug(`DB pool reused, open connections: ${pool.connectionsOpen}`);
            }
        },
    });
}
//# sourceMappingURL=index.js.map