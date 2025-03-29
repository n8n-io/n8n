import type { Connection, ConnectionAttributes } from 'oracledb';
import oracledb from 'oracledb';

import type { DatabaseConnection } from './interfaces/database.interface';
import type { OracleCredentials } from './types/oracle.credentials.type';

export class OracleConnection implements DatabaseConnection<Connection> {
	private databaseConfig: ConnectionAttributes;

	constructor(credentials: OracleCredentials, useThinMode = true) {
		const { user, password, connectionString } = credentials;
		this.databaseConfig = {
			user,
			password,
			connectionString,
		} as ConnectionAttributes;

		if (!useThinMode) {
			oracledb.initOracleClient({ libDir: process.env.LD_LIBRARY_PATH });
		}

		oracledb.fetchAsString = [oracledb.CLOB];
	}

	async getConnection(): Promise<Connection> {
		return await oracledb.getConnection(this.databaseConfig);
	}
}
