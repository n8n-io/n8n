import type pgPromise from 'pg-promise';
import type pg from 'pg-promise/typescript/pg-subset';

export type QueryMode = 'multiple' | 'transaction' | 'independently';

export type QueryWithValues = { query: string; values?: string[] };

export type WhereClause = { column: string; condition: string; value: string; operator: string };
export type SortRule = { column: string; direction: string };

export type PgpClient = pgPromise.IMain<{}, pg.IClient>;
export type PgpDatabase = pgPromise.IDatabase<{}, pg.IClient>;
export type PgpConnectionParameters = pg.IConnectionParameters<pg.IClient>;
