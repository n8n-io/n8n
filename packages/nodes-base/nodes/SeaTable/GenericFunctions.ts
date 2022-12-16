import { IExecuteFunctions } from 'n8n-core';

import { OptionsWithUri } from 'request';

import { IDataObject, ILoadOptionsFunctions, IPollFunctions, NodeApiError } from 'n8n-workflow';

import { TDtableMetadataColumns, TDtableViewColumns, TEndpointVariableName } from './types';

import { schema } from './Schema';

import {
	ICredential,
	ICtx,
	IDtableMetadataColumn,
	IEndpointVariables,
	IName,
	IRow,
	IRowObject,
} from './Interfaces';

import _ from 'lodash';

export async function seaTableApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	ctx: ICtx,
	method: string,
	endpoint: string,

	body: any = {},
	qs: IDataObject = {},
	url: string | undefined = undefined,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('seaTableApi');

	ctx.credentials = credentials as unknown as ICredential;

	await getBaseAccessToken.call(this, ctx);

	const options: OptionsWithUri = {
		headers: {
			Authorization: `Token ${ctx?.base?.access_token}`,
		},
		method,
		qs,
		body,
		uri: url || `${resolveBaseUri(ctx)}${endpointCtxExpr(ctx, endpoint)}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	try {
		//@ts-ignore
		return this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function setableApiRequestAllItems(
	this: IExecuteFunctions | IPollFunctions,
	ctx: ICtx,
	propertyName: string,
	method: string,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
): Promise<any> {
	if (query === undefined) {
		query = {};
	}
	const segment = schema.rowFetchSegmentLimit;
	query.start = 0;
	query.limit = segment;

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = (await seaTableApiRequest.call(
			this,
			ctx,
			method,
			endpoint,
			body,
			query,
		)) as unknown as IRow[];
		//@ts-ignore
		returnData.push.apply(returnData, responseData[propertyName]);
		query.start = +query.start + segment;
	} while (responseData && responseData.length > segment - 1);

	return returnData;
}

export async function getTableColumns(
	this: ILoadOptionsFunctions | IExecuteFunctions | IPollFunctions,
	tableName: string,
	ctx: ICtx = {},
): Promise<TDtableMetadataColumns> {
	const {
		metadata: { tables },
	} = await seaTableApiRequest.call(
		this,
		ctx,
		'GET',
		`/dtable-server/api/v1/dtables/{{dtable_uuid}}/metadata`,
	);
	for (const table of tables) {
		if (table.name === tableName) {
			return table.columns;
		}
	}
	return [];
}

export async function getTableViews(
	this: ILoadOptionsFunctions | IExecuteFunctions,
	tableName: string,
	ctx: ICtx = {},
): Promise<TDtableViewColumns> {
	const { views } = await seaTableApiRequest.call(
		this,
		ctx,
		'GET',
		`/dtable-server/api/v1/dtables/{{dtable_uuid}}/views`,
		{},
		{ table_name: tableName },
	);
	return views;
}

export async function getBaseAccessToken(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	ctx: ICtx,
) {
	if (ctx?.base?.access_token !== undefined) {
		return;
	}

	const options: OptionsWithUri = {
		headers: {
			Authorization: `Token ${ctx?.credentials?.token}`,
		},
		uri: `${resolveBaseUri(ctx)}/api/v2.1/dtable/app-access-token/`,
		json: true,
	};

	ctx.base = await this.helpers.request!(options);
}

export function resolveBaseUri(ctx: ICtx) {
	return ctx?.credentials?.environment === 'cloudHosted'
		? 'https://cloud.seatable.io'
		: userBaseUri(ctx?.credentials?.domain);
}

export function simplify(data: { results: IRow[] }, metadata: IDataObject) {
	return data.results.map((row: IDataObject) => {
		for (const key of Object.keys(row)) {
			if (!key.startsWith('_')) {
				row[metadata[key] as string] = row[key];
				delete row[key];
			}
		}
		return row;
	});
}

export function getColumns(data: { metadata: [{ key: string; name: string }] }) {
	return data.metadata.reduce(
		(obj, value) => Object.assign(obj, { [`${value.key}`]: value.name }),
		{},
	);
}

export function getDownloadableColumns(data: {
	metadata: [{ key: string; name: string; type: string }];
}) {
	return data.metadata.filter((row) => ['image', 'file'].includes(row.type)).map((row) => row.name);
}

const uniquePredicate = (current: string, index: number, all: string[]) =>
	all.indexOf(current) === index;
const nonInternalPredicate = (name: string) => !Object.keys(schema.internalNames).includes(name);
const namePredicate = (name: string) => (named: IName) => named.name === name;
export const nameOfPredicate = (names: readonly IName[]) => (name: string) =>
	names.find(namePredicate(name));

export function columnNamesToArray(columnNames: string): string[] {
	return columnNames ? split(columnNames).filter(nonInternalPredicate).filter(uniquePredicate) : [];
}

export function columnNamesGlob(
	columnNames: string[],
	dtableColumns: TDtableMetadataColumns,
): string[] {
	const buffer: string[] = [];
	const names: string[] = dtableColumns.map((c) => c.name).filter(nonInternalPredicate);
	columnNames.forEach((columnName) => {
		if (columnName !== '*') {
			buffer.push(columnName);
			return;
		}
		buffer.push(...names);
	});
	return buffer.filter(uniquePredicate);
}

/**
 * sequence rows on _seq
 */
export function rowsSequence(rows: IRow[]) {
	const l = rows.length;
	if (l) {
		const [first] = rows;
		if (first?._seq !== undefined) {
			return;
		}
	}
	for (let i = 0; i < l; ) {
		rows[i]._seq = ++i;
	}
}

export function rowDeleteInternalColumns(row: IRow): IRow {
	Object.keys(schema.internalNames).forEach((columnName) => delete row[columnName]);
	return row;
}

function rowFormatColumn(input: unknown): boolean | number | string | string[] | null {
	if (null === input || undefined === input) {
		return null;
	}

	if (typeof input === 'boolean' || typeof input === 'number' || typeof input === 'string') {
		return input;
	}

	if (Array.isArray(input) && input.every((i) => typeof i === 'string')) {
		return input;
	} else if (Array.isArray(input) && input.every((i) => typeof i === 'object')) {
		const returnItems = [] as string[];
		input.every((i) => returnItems.push(i.display_value));
		return returnItems;
	}

	return null;
}

export function rowFormatColumns(row: IRow, columnNames: string[]): IRow {
	const outRow = {} as IRow;
	columnNames.forEach((c) => (outRow[c] = rowFormatColumn(row[c])));
	return outRow;
}

export function rowsFormatColumns(rows: IRow[], columnNames: string[]) {
	rows = rows.map((row) => rowFormatColumns(row, columnNames));
}

export function rowMapKeyToName(row: IRow, columns: TDtableMetadataColumns): IRow {
	const mappedRow = {} as IRow;

	// move internal columns first
	Object.keys(schema.internalNames).forEach((key) => {
		if (row[key]) {
			mappedRow[key] = row[key];
			delete row[key];
		}
	});

	// pick each by its key for name
	Object.keys(row).forEach((key) => {
		const column = columns.find((c) => c.key === key);
		if (column) {
			mappedRow[column.name] = row[key];
		}
	});

	return mappedRow;
}

export function rowExport(row: IRowObject, columns: TDtableMetadataColumns): IRowObject {
	for (const columnName of Object.keys(columns)) {
		if (!columns.find(namePredicate(columnName))) {
			delete row[columnName];
		}
	}
	return row;
}

export const dtableSchemaIsColumn = (column: IDtableMetadataColumn): boolean =>
	!!schema.columnTypes[column.type];

const dtableSchemaIsUpdateAbleColumn = (column: IDtableMetadataColumn): boolean =>
	!!schema.columnTypes[column.type] && !schema.nonUpdateAbleColumnTypes[column.type];

export const dtableSchemaColumns = (columns: TDtableMetadataColumns): TDtableMetadataColumns =>
	columns.filter(dtableSchemaIsColumn);

export const updateAble = (columns: TDtableMetadataColumns): TDtableMetadataColumns =>
	columns.filter(dtableSchemaIsUpdateAbleColumn);

function endpointCtxExpr(ctx: ICtx, endpoint: string): string {
	const endpointVariables: IEndpointVariables = {};
	endpointVariables.access_token = ctx?.base?.access_token;
	endpointVariables.dtable_uuid = ctx?.base?.dtable_uuid;

	return endpoint.replace(
		/({{ *(access_token|dtable_uuid|server) *}})/g,
		(match: string, expr: string, name: TEndpointVariableName) => {
			return endpointVariables[name] || match;
		},
	);
}

const normalize = (subject: string): string => (subject ? subject.normalize() : '');

export const split = (subject: string): string[] =>
	normalize(subject)
		.split(/\s*((?:[^\\,]*?(?:\\[\s\S])*)*?)\s*(?:,|$)/)
		.filter((s) => s.length)
		.map((s) => s.replace(/\\([\s\S])/gm, ($0, $1) => $1));

const userBaseUri = (uri?: string) => {
	if (uri === undefined) {
		return uri;
	}

	if (uri.endsWith('/')) {
		return uri.slice(0, -1);
	}

	return uri;
};
