import type mysql2 from 'mysql2/promise';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

export type Mysql2Connection = mysql2.Connection;
export type Mysql2Pool = mysql2.Pool;
export type Mysql2OkPacket = mysql2.OkPacket;

export type QueryValues = Array<string | number | IDataObject>;
export type QueryWithValues = { query: string; values: QueryValues };

export type QueryRunner = (queries: QueryWithValues[]) => Promise<INodeExecutionData[]>;

export type WhereClause = { column: string; condition: string; value: string | number };
export type SortRule = { column: string; direction: string };

export const AUTO_MAP = 'autoMapInputData';
const MANUAL = 'defineBelow';
export const DATA_MODE = {
	AUTO_MAP,
	MANUAL,
};

export const SINGLE = 'single';
const TRANSACTION = 'transaction';
const INDEPENDENTLY = 'independently';
export const BATCH_MODE = { SINGLE, TRANSACTION, INDEPENDENTLY };

export type QueryMode = typeof SINGLE | typeof TRANSACTION | typeof INDEPENDENTLY;
