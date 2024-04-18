import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import type pgPromise from 'pg-promise';
import type pg from 'pg-promise/typescript/pg-subset';
import type { Client } from 'ssh2';

export type QueryMode = 'single' | 'transaction' | 'independently';

export type QueryValue = string | number | IDataObject | string[];
export type QueryValues = QueryValue[];
export type QueryWithValues = { query: string; values?: QueryValues };

export type WhereClause = { column: string; condition: string; value: string | number };
export type SortRule = { column: string; direction: string };
export type ColumnInfo = {
	column_name: string;
	data_type: string;
	is_nullable: string;
	udt_name?: string;
	column_default?: string | null;
	is_generated?: 'ALWAYS' | 'NEVER';
	identity_generation?: 'ALWAYS' | 'NEVER';
};
export type EnumInfo = {
	typname: string;
	enumlabel: string;
};

export type PgpClient = pgPromise.IMain<{}, pg.IClient>;
export type PgpDatabase = pgPromise.IDatabase<{}, pg.IClient>;
export type PgpConnectionParameters = pg.IConnectionParameters<pg.IClient>;
export type ConnectionsData = { db: PgpDatabase; pgp: PgpClient; sshClient?: Client };

export type QueriesRunner = (
	queries: QueryWithValues[],
	items: INodeExecutionData[],
	options: IDataObject,
) => Promise<INodeExecutionData[]>;

export type PostgresNodeOptions = {
	nodeVersion?: number;
	operation?: string;
	cascade?: boolean;
	connectionTimeout?: number;
	delayClosingIdleConnection?: number;
	queryBatching?: QueryMode;
	queryReplacement?: string;
	outputColumns?: string[];
	largeNumbersOutput?: 'numbers' | 'text';
	skipOnConflict?: boolean;
	replaceEmptyStrings?: boolean;
};

export type PostgresNodeCredentials = {
	sshAuthenticateWith: 'password' | 'privateKey';
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
	allowUnauthorizedCerts?: boolean;
	ssl?: 'disable' | 'allow' | 'require' | 'verify' | 'verify-full';
	sshTunnel?: boolean;
	sshHost?: string;
	sshPort?: number;
	sshPostgresPort?: number;
	sshUser?: string;
	sshPassword?: string;
	privateKey?: string;
	passphrase?: string;
};
