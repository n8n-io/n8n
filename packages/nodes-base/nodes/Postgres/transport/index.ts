import { formatPemBlock } from '@n8n/utils/format-pem-block';
import { ConnectionPoolManager } from '@utils/connection-pool-manager';
import { LOCALHOST } from '@utils/constants';
import type {
	IExecuteFunctions,
	ICredentialTestFunctions,
	ILoadOptionsFunctions,
	ITriggerFunctions,
	Logger,
} from 'n8n-workflow';
import { createServer, type AddressInfo, type Server } from 'node:net';
import pgPromise from 'pg-promise';

import type {
	ConnectionsData,
	PgpClient,
	PgpConnectionParameters,
	PostgresNodeCredentials,
	PostgresNodeOptions,
} from '../v2/helpers/interfaces';

// dataTypeIDs for bigint (int8) and numeric types in PostgreSQL
const BIGINT_TYPE_ID = 20;
const NUMERIC_TYPE_ID = 1700;

// Array type OIDs, not exposed via pg-types `builtins`
const DATE_ARRAY_TYPE_ID = 1182; // _date
const TIMESTAMP_ARRAY_TYPE_ID = 1115; // _timestamp
const TIMESTAMPTZ_ARRAY_TYPE_ID = 1185; // _timestamptz

export function applyLargeNumbersReceive(e: {
	data: Array<Record<string, unknown>>;
	result?: { fields: Array<{ name: string; dataTypeID: number }> };
}) {
	if (!e.result) return;
	for (const field of e.result.fields) {
		if (field.dataTypeID !== BIGINT_TYPE_ID && field.dataTypeID !== NUMERIC_TYPE_ID) continue;
		const isInt = field.dataTypeID === BIGINT_TYPE_ID;
		for (const row of e.data) {
			if (typeof row[field.name] === 'string') {
				row[field.name] = isInt
					? parseInt(row[field.name] as string, 10)
					: parseFloat(row[field.name] as string);
			}
		}
	}
}

// Must stay at module scope. Pools outlive the execution in pg-promise's global
// registry, so an inline handler would pin the whole execution context via `this`.
export function createReceiveHandler(
	largeNumbersOutput: PostgresNodeOptions['largeNumbersOutput'],
) {
	return (e: unknown) => {
		if (largeNumbersOutput !== 'numbers') return;
		applyLargeNumbersReceive(e as Parameters<typeof applyLargeNumbersReceive>[0]);
	};
}

export function parseDateToISO(value: string) {
	const parsedDate = new Date(value);

	if (isNaN(parsedDate.getTime())) {
		return value;
	}
	return parsedDate.toISOString();
}

// pg-promise's bundled pg-types exposes `arrayParser.create(source, transform)`,
// but the published typings type `arrayParser` as a plain function.
type ArrayParser = {
	create: (source: string, transform: (entry: string) => unknown) => { parse: () => unknown[] };
};

/**
 * Per-connection type parsers that return date/timestamp columns (and their array
 * variants) as JSON-safe strings, so node output never contains live `Date` objects.
 * DATE stays as its `YYYY-MM-DD` wire value; timestamps are normalized to ISO. Every
 * other OID falls back to the default parser. Applied via the pg `types` connection
 * option so we don't mutate global pg-types state shared across all pools.
 */
export function getDateAsStringTypeParsers(
	pgp: PgpClient,
): NonNullable<PgpConnectionParameters['types']> {
	const { builtins } = pgp.pg.types;
	const arrayParser = pgp.pg.types.arrayParser as unknown as ArrayParser;
	const parseElements = (transform: (entry: string) => unknown) => (value: string) =>
		arrayParser.create(value, transform).parse();

	const overrides = new Map<number, (value: string) => unknown>([
		[builtins.DATE, (value) => value],
		[builtins.TIMESTAMP, parseDateToISO],
		[builtins.TIMESTAMPTZ, parseDateToISO],
		[DATE_ARRAY_TYPE_ID, parseElements((value) => value)],
		[TIMESTAMP_ARRAY_TYPE_ID, parseElements(parseDateToISO)],
		[TIMESTAMPTZ_ARRAY_TYPE_ID, parseElements(parseDateToISO)],
	]);

	return {
		setTypeParser(
			id: number,
			formatOrParseFn: string | ((value: string) => unknown),
			parseFn?: string | ((value: string) => unknown),
		) {
			const fn = parseFn ?? formatOrParseFn;
			if (typeof fn === 'function') overrides.set(id, fn);
		},
		getTypeParser(id: number, format?: 'text' | 'binary') {
			const override = overrides.get(id);
			if (override && (format === undefined || format === 'text')) return override;
			return pgp.pg.types.getTypeParser(id, format);
		},
	};
}

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
			// Use per-instance receive event instead of pgp.pg.types.setTypeParser, which mutates
			// global pg state and would affect all pools regardless of their largeNumbersOutput setting
			receive: createReceiveHandler(options.largeNumbersOutput),
		});

		const dbConfig = getPostgresConfig(credentials, options);

		if (typeof options.nodeVersion === 'number' && options.nodeVersion >= 2.7) {
			// Return DATE, TIME and array date/timestamp columns as strings too, via a
			// per-connection type config that leaves global pg-types state untouched.
			dbConfig.types = getDateAsStringTypeParsers(pgp);
		} else if (typeof options.nodeVersion === 'number' && options.nodeVersion >= 2.1) {
			// Return TIMESTAMP columns as ISO strings (DATE columns still return Date objects)
			[pgp.pg.types.builtins.TIMESTAMP, pgp.pg.types.builtins.TIMESTAMPTZ].forEach((type) => {
				pgp.pg.types.setTypeParser(type, parseDateToISO);
			});
		}

		if (!credentials.sshTunnel) {
			const db = pgp(dbConfig);

			return { db, pgp };
		} else {
			if (credentials.sshAuthenticateWith === 'privateKey' && credentials.privateKey) {
				credentials.privateKey = formatPemBlock(credentials.privateKey);
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
		poolKeyExtras: { largeNumbersOutput: options.largeNumbersOutput ?? 'text' },
		fallBackHandler,
		wasUsed: ({ sshClient }) => {
			if (sshClient) {
				this.helpers.updateLastUsed(sshClient);
			}
		},
	});
}
