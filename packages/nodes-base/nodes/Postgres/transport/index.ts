import type {
	IExecuteFunctions,
	ICredentialTestFunctions,
	ILoadOptionsFunctions,
	ITriggerFunctions,
} from 'n8n-workflow';
import { createServer, type AddressInfo } from 'node:net';
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

export async function configurePostgres(
	this: IExecuteFunctions | ICredentialTestFunctions | ILoadOptionsFunctions | ITriggerFunctions,
	credentials: PostgresNodeCredentials,
	options: PostgresNodeOptions = {},
): Promise<ConnectionsData> {
	const poolManager = ConnectionPoolManager.getInstance();

	const fallBackHandler = async () => {
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
			const sshClient = await this.helpers.getSSHClient(credentials);

			// Create a TCP proxy listening on a random available port
			const proxy = createServer();
			const proxyPort = await new Promise<number>((resolve) => {
				proxy.listen(0, LOCALHOST, () => {
					resolve((proxy.address() as AddressInfo).port);
				});
			});

			const close = () => {
				proxy.close();
				sshClient.off('end', close);
				sshClient.off('error', close);
			};
			sshClient.on('end', close);
			sshClient.on('error', close);

			await new Promise<void>((resolve, reject) => {
				proxy.on('error', (err) => reject(err));
				proxy.on('connection', (localSocket) => {
					sshClient.forwardOut(
						LOCALHOST,
						localSocket.remotePort!,
						credentials.host,
						credentials.port,
						(err, clientChannel) => {
							if (err) {
								proxy.close();
								localSocket.destroy();
							} else {
								localSocket.pipe(clientChannel);
								clientChannel.pipe(localSocket);
							}
						},
					);
				});
				resolve();
			}).catch((err) => {
				proxy.close();

				let message = err.message;
				let description = err.description;

				if (err.message.includes('ECONNREFUSED')) {
					message = 'Connection refused';
					try {
						description = err.message.split('ECONNREFUSED ')[1].trim();
					} catch (e) {}
				}

				if (err.message.includes('ENOTFOUND')) {
					message = 'Host not found';
					try {
						description = err.message.split('ENOTFOUND ')[1].trim();
					} catch (e) {}
				}

				if (err.message.includes('ETIMEDOUT')) {
					message = 'Connection timed out';
					try {
						description = err.message.split('ETIMEDOUT ')[1].trim();
					} catch (e) {}
				}

				err.message = message;
				err.description = description;
				throw err;
			});

			const db = pgp({
				...dbConfig,
				port: proxyPort,
				host: LOCALHOST,
			});
			return { db, pgp };
		}
	};

	return await poolManager.getConnection({
		credentials,
		nodeType: 'postgres',
		nodeVersion: options.nodeVersion as unknown as string,
		fallBackHandler,
		cleanUpHandler: async ({ db }) => {
			if (!db.$pool.ended) await db.$pool.end();
		},
	});
}
