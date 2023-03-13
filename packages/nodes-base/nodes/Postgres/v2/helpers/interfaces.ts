import type { IDataObject } from 'n8n-workflow';
import type pgPromise from 'pg-promise';
import type pg from 'pg-promise/typescript/pg-subset';

export type QueryMode = 'multiple' | 'transaction' | 'independently';

export type QueryValue = string | IDataObject | string[];
export type QueryValues = QueryValue[];
export type QueryWithValues = { query: string; values?: QueryValues };

export type WhereClause = { column: string; condition: string; value: string };
export type SortRule = { column: string; direction: string };
export type ColumnInfo = { column_name: string; data_type: string; is_nullable: string };

export type PgpClient = pgPromise.IMain<{}, pg.IClient>;
export type PgpDatabase = pgPromise.IDatabase<{}, pg.IClient>;
export type PgpConnectionParameters = pg.IConnectionParameters<pg.IClient>;
