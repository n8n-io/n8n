import type {
	IExecuteFunctions,
	ICredentialTestFunctions,
	ILoadOptionsFunctions,
	ITriggerFunctions,
	Logger,
} from 'n8n-workflow';
import { createServer, type AddressInfo, type Server } from 'node:net';
import pgPromise from 'pg-promise';

import { ConnectionPoolManager } from '@utils/connection-pool-manager';
import { LOCALHOST } from '@utils/constants';
import { formatPrivateKey } from '@utils/utilities';

import type {
	ConnectionsData,
	PgpConnectionParameters,
	PostgresNodeCredentials,
	PostgresNodeOptions,
} from '../v2/helpers/interfaces';

const getPostgresConfig = (
	credentials: PostgresNodeCredentials,
	options: PostgresNodeOptions = {},
) => {
	const dbConfig: PgpConnectionParameters = {
		host: credentials.host,
		port: credentials.port,
		database: credentials.database,
		user: credentials.user,
		password: credentials.password,
		keepAlive: true,
		max: credentials.maxConnections,
	};

	if (options.connectionTimeout) {
		dbConfig.connectionTimeoutMillis = options.connectionTimeout * 1000;
	}

	if (options.delayClosingIdleConnection) {
		dbConfig.keepAliveInitialDelayMillis = options.delayClosingIdleConnection * 1000;
	}

	if (credentials.allowUnauthorizedCerts === true) {
		dbConfig.ssl = {
			rejectUnauthorized: false,
		};
	} else {
		dbConfig.ssl = !['disable', undefined].includes(credentials.ssl as string | undefined);
		// @ts-ignore these typings need to be updated
		dbConfig.sslmode = credentials.ssl || 'disable';
	}

	return dbConfig;
};

function withCleanupHandler(proxy: Server, abortController: AbortController, logger: Logger) {
	proxy.on('error', (error) => {
		logger.error('TCP Proxy: Got error, calling abort controller', { error });
		abortController.abort();
	});
	proxy.on('close', () => {
		logger.error('TCP Proxy: Was closed, calling abort controller');
		abortController.abort();
	});
	proxy.on('drop', (dropArgument) => {
		logger.error('TCP Proxy: Connection was dropped, calling abort controller', {
			dropArgument,
		});
		abortController.abort();
	});
	abortController.signal.addEventListener('abort', () => {
		logger.debug('Got abort signal. Closing TCP proxy server.');
		proxy.close();
	});

	return proxy;
}

export async function configurePostgres(
	this: IExecuteFunctions | ICredentialTestFunctions | ILoadOptionsFunctions | ITriggerFunctions,
	credentials: PostgresNodeCredentials,
	options: PostgresNodeOptions = {},
): Promise<ConnectionsData> {
	const poolManager = ConnectionPoolManager.getInstance(this.logger);

	const fallBackHandler = async (abortController: AbortController) => {
		const pgp = pgPromise({
			// prevent spam in console "WARNING: Creating a duplicate database object for the same connection."
			// duplicate connections created when auto loading parameters, they are closed immediately after, but several could be open at the same time
			noWarnings: true,
		});

		if (typeof options.nodeVersion === 'number' && options.nodeVersion >= 2.1) {
			// Always return dates as ISO strings
			[pgp.pg.types.builtins.TIMESTAMP, pgp.pg.types.builtins.TIMESTAMPTZ].forEach((type) => {
				pgp.pg.types.setTypeParser(type, (value: string) => {
					const parsedDate = new Date(value);

					if (isNaN(parsedDate.getTime())) {
						return value;
					}

					return parsedDate.toISOString();
				});
			});
		}

		if (options.largeNumbersOutput === 'numbers') {
			pgp.pg.types.setTypeParser(20, (value: string) => {
				return parseInt(value, 10);
			});
			pgp.pg.types.setTypeParser(1700, (value: string) => {
				return parseFloat(value);
			});
		}

		const dbConfig = getPostgresConfig(credentials, options);

		if (!credentials.sshTunnel) {
			const db = pgp(dbConfig);

			return { db, pgp };
		} else {
			if (credentials.sshAuthenticateWith === 'privateKey' && credentials.privateKey) {
				credentials.privateKey = formatPrivateKey(credentials.privateKey);
			}
			const sshClient = await this.helpers.getSSHClient(credentials, abortController);

			// Create a TCP proxy listening on a random available port
			const proxy = withCleanupHandler(createServer(), abortController, this.logger);

			const proxyPort = await new Promise<number>((resolve) => {
				proxy.listen(0, LOCALHOST, () => {
					resolve((proxy.address() as AddressInfo).port);
				});
			});

			proxy.on('connection', (localSocket) => {
				sshClient.forwardOut(
					LOCALHOST,
					localSocket.remotePort!,
					credentials.host,
					credentials.port,
					(error, clientChannel) => {
						if (error) {
							this.logger.error('SSH Client: Port forwarding encountered an error', { error });
							abortController.abort();
						} else {
							localSocket.pipe(clientChannel);
							clientChannel.pipe(localSocket);
						}
					},
				);
			});

			const db = pgp({
				...dbConfig,
				port: proxyPort,
				host: LOCALHOST,
			});

			abortController.signal.addEventListener('abort', async () => {
				this.logger.debug('configurePostgres: Got abort signal, closing pg connection.');
				try {
					if (!db.$pool.ended) await db.$pool.end();
				} catch (error) {
					this.logger.error('configurePostgres: Encountered error while closing the pool.', {
						error,
					});
					throw error;
				}
			});

			return { db, pgp, sshClient };
		}
	};

	return await poolManager.getConnection({
		credentials,
		nodeType: 'postgres',
		nodeVersion: options.nodeVersion as unknown as string,
		fallBackHandler,
		wasUsed: ({ sshClient }) => {
			if (sshClient) {
				this.helpers.updateLastUsed(sshClient);
			}
		},
	});
}
