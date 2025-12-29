import { ApplicationError } from '@n8n/errors';

export type DbConnectionTimeoutErrorOpts = {
	configuredTimeoutInMs: number;
	cause: Error;
};

export class DbConnectionTimeoutError extends ApplicationError {
	constructor(opts: DbConnectionTimeoutErrorOpts) {
		const numberFormat = Intl.NumberFormat();
		const errorMessage = `Could not establish database connection within the configured timeout of ${numberFormat.format(opts.configuredTimeoutInMs)} ms. Please ensure the database is configured correctly and the server is reachable. You can increase the timeout by setting the 'DB_POSTGRESDB_CONNECTION_TIMEOUT' environment variable.`;
		super(errorMessage, { cause: opts.cause });
	}
}
