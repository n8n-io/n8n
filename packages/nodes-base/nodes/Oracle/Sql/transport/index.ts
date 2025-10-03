import type {
	IExecuteFunctions,
	ICredentialTestFunctions,
	ILoadOptionsFunctions,
	ITriggerFunctions,
} from 'n8n-workflow';
import oracledb from 'oracledb';

import { ConnectionPoolManager } from '@utils/connection-pool-manager';

import type { OracleDBNodeOptions, OracleDBNodeCredentials } from '../helpers/interfaces';

// used for thick mode to call initOracleClient API only once.
let initializeDriverMode = false;

const getOracleDBConfig = (credentials: OracleDBNodeCredentials) => {
	const { useThickMode, useSSL, ...dbConfig } = credentials;
	return dbConfig;
};

export async function configureOracleDB(
	this: IExecuteFunctions | ICredentialTestFunctions | ILoadOptionsFunctions | ITriggerFunctions,
	credentials: OracleDBNodeCredentials,
	options: OracleDBNodeOptions = {},
): Promise<oracledb.Pool> {
	const poolManager = ConnectionPoolManager.getInstance(this.logger);
	const fallBackHandler = async (abortController: AbortController): Promise<oracledb.Pool> => {
		const dbConfig = getOracleDBConfig(credentials);

		if (credentials.useThickMode) {
			if (!initializeDriverMode) {
				oracledb.initOracleClient();
				initializeDriverMode = true;
			}
		} else if (initializeDriverMode) {
			// Thick mode is initialized, cannot switch back to thin mode
			throw new Error('Thin mode can not be used after thick mode initialization');
		}
		const pool = await oracledb.createPool(dbConfig);

		abortController.signal.addEventListener('abort', async () => {
			try {
				await pool.close();
				this.logger.debug('pool closed on abort');
			} catch (error) {
				this.logger.error('Error closing pool on abort', { error });
			}
		});
		return pool;
	};

	return await poolManager.getConnection<oracledb.Pool>({
		credentials,
		nodeType: 'oracledb',
		nodeVersion: String(options.nodeVersion ?? '1'),
		fallBackHandler,
		wasUsed: (pool) => {
			if (pool) {
				this.logger.debug(`DB pool reused, open connections: ${pool.connectionsOpen}`);
			}
		},
	});
}
