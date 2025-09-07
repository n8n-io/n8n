// Copyright (c) 2025, Oracle and/or its affiliates.

import type { DateTime } from 'luxon';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import type * as oracleDBTypes from 'oracledb';

export type QueryMode = 'single' | 'transaction' | 'independently';

export type ObjectQueryValue = Extract<oracleDBTypes.BindParameters, Record<string, unknown>>;

// For execute
export type QueryValue =
	| ObjectQueryValue // named binds in object form
	| oracleDBTypes.BindParameters; // positional binds in array form

// A query string along with its bind values.
export type QueryWithValues = {
	query: string;
	values?: QueryValue; // For execute
	executeManyValues?: QueryValue[]; // for executeMany
};

export type WhereClause = { column: string; condition: string; value: any };
export type SortRule = { column: string; direction: string };
export type ColumnInfo = {
	column_name: string;
	data_type: string;
	is_nullable: boolean;
	udt_name?: string;
	column_default?: string | null;
	is_generated?: 'ALWAYS' | 'NEVER';
	identity_generation?: 'ALWAYS' | 'NEVER';
	max_size: number;
};

export type QueriesRunner = (
	queries: QueryWithValues[],
	items: INodeExecutionData[],
	options: IDataObject,
) => Promise<INodeExecutionData[]>;

export type OracleDBNodeOptions = {
	nodeVersion?: number;
	operation?: string;

	// Connection options
	poolPingInterval?: number;
	poolPingTimeout?: number;
	stmtCacheSize?: number;
	poolMax?: number;
	poolMin?: number;
	poolIncrement?: number;

	// Execute options
	autoCommit?: boolean;
	bindDefs?: oracleDBTypes.BindDefinition[];
	batchErrors?: boolean;
	fetchArraySize?: number;
	keepInStmtCache?: boolean;
	maxRows?: number;
	prefetchRows?: number;

	// n8n options
	largeNumbersOutputAsString?: boolean; // bigInt
	outputColumns?: string[];
	stmtBatching?: QueryMode;
	executeManyOptions?: oracleDBTypes.ExecuteManyOptions;
};

export type OracleDBNodeCredentials = {
	accessToken?: any;
	connectionString: string | undefined;
	connectionClass?: string;
	connectTimeout?: number;
	configDir?: string;
	useThickMode: boolean;
	useSSL: boolean;
	expireTime?: number;
	maxLifetimeSession: number;
	password: string | undefined;
	poolTimeout: number;
	poolMin: number;
	poolMax: number;
	poolIncrement: number;
	sslServerCertDN?: string;
	sslServerDNMatch?: boolean;
	sslAllowWeakDNMatch?: boolean;
	transportConnectTimeout?: number;
	user: string | undefined;
	walletPassword?: string | undefined;
	walletContent?: string | undefined;
};

export type ColumnDefinition = {
	type: string;
	nullable: boolean;
	maxSize: number;
};

export type ColumnMap = {
	[key: string]: ColumnDefinition;
};

// shared fields
type BaseBindFields = {
	name: string; // bind param name
	parseInStatement: boolean;
	bindDirection: 'in' | 'out' | 'inout'; // restrict to known directions
};

// discriminated union
export type ExecuteOpBindParam =
	| (BaseBindFields & { datatype: 'string'; valueString: string })
	| (BaseBindFields & { datatype: 'number'; valueNumber: number })
	| (BaseBindFields & { datatype: 'boolean'; valueBoolean: boolean })
	| (BaseBindFields & { datatype: 'date'; valueDate: string | Date | DateTime | null })
	| (BaseBindFields & { datatype: 'json'; valueJson: Record<string, unknown> | null })
	| (BaseBindFields & { datatype: 'vector'; valueVector: number[] | null })
	| (BaseBindFields & { datatype: 'blob'; valueBlob: Buffer | null })
	| (BaseBindFields & {
			datatype: 'sparse';
			valueSparse: {
				dimensions: number;
				indices: number[];
				values: number[];
			};
	  });
