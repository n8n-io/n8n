import type mysql2 from 'mysql2/promise';
import type { IDataObject } from 'n8n-workflow';

export type Mysql2Connection = mysql2.Connection;

export type Mysql2OkPacket = mysql2.OkPacket;

export type QueryValues = Array<string | IDataObject | string[]>;
export type QueryWithValues = { query: string; values: QueryValues };

export type QueryMode = 'multiple' | 'transaction' | 'independently';
