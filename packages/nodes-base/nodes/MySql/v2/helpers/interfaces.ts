import type mysql2 from 'mysql2/promise';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

export type Mysql2Connection = mysql2.Connection;
export type Mysql2Pool = mysql2.Pool;
export type Mysql2OkPacket = mysql2.OkPacket;

export type QueryValues = Array<string | number | IDataObject>;
export type QueryWithValues = { query: string; values: QueryValues };

export type QueryMode = 'single' | 'transaction' | 'independently';

export type QueryRunner = (queries: QueryWithValues[]) => Promise<INodeExecutionData[]>;

export type WhereClause = { column: string; condition: string; value: string | number };
export type SortRule = { column: string; direction: string };
