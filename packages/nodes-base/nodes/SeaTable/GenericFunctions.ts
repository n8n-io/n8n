import {IExecuteFunctions, IHookFunctions} from 'n8n-core';

import {OptionsWithUri} from 'request';

import {IDataObject, ILoadOptionsFunctions, IPollFunctions, NodeApiError, NodeOperationError} from 'n8n-workflow';

import * as _ from 'lodash';
import {
		TCredentials,
		TDtableMetadataColumns,
		TDtableMetadataTables,
		TEndpoint,
		TEndpointExpr,
		TEndpointResolvedExpr,
		TEndpointVariableName,
		TLoadedResource,
		TMethod,
} from './types';
import {schema} from './Schema';
import {
		IApi,
		IAppAccessToken,
		ICtx,
		IDtableMetadata,
		IDtableMetadataColumn,
		IDtableMetadataTable,
		IEndpointVariables,
		IName,
		IRow,
		IRowObject,
		IRows,
		IServerInfo,
} from './Interfaces';
import {URL} from 'url';

const normalize = (subject: string): string => subject ? subject.normalize() : '';

export const split = (subject: string): string[] =>
	normalize(subject)
		.split(/\s*((?:[^\\,]*?(?:\\[\s\S])*)*?)\s*(?:,|$)/)
		.filter(s => s.length)
		.map(s => s.replace(/\\([\s\S])/gm, ($0, $1) => $1))
;

export function apiCtx(api: IApi): ICtx {
		if (api === undefined) {
				throw new Error('Expectation failed: SeaTable: Context: Need api/credentials to create context, got undefined.');
		}

		const prepApi = api;
		prepApi.server = normalize(prepApi.server);
		if (prepApi.server === '') {
				throw new Error(`Expectation failed: SeaTable: Context: Need server to create context, got server-less: ${Object.prototype.toString.call(api)}.`);
		}
		// noinspection HttpUrlsUsage
		if (['http://', 'https://'].includes(prepApi.server)) {
				throw new Error(`Expectation failed: SeaTable: Context: Need server to create context, got URL-scheme only: "${prepApi.server}".`);
		}

		try {
				const serverUrl = new URL(prepApi.server);
				if (!['http:', 'https:'].includes(serverUrl.protocol)) {
						throw new Error(`Unsupported protocol: "${serverUrl.protocol}"`);
				}
				serverUrl.hash = serverUrl.search = '';
				// throw new Error(`debug: ${Object.prototype.toString.call(serverUrl)} "${serverUrl}"`);
				prepApi.server = serverUrl.toString();
		} catch (e) {
				throw new Error(`Expectation failed: SeaTable: Context: Server URL: ${e.message}`);
		}

		return {api: prepApi} as ICtx;
}

/**
 * Helper function for mangling options parts for an API request with the HTTP client in n8n.
 *
 * @param options
 * @param body
 * @param option
 */
function apiRequestMergeOptionsWithUri(options: OptionsWithUri, body: object, option: IDataObject): OptionsWithUri {
		if (Object.keys(option).length !== 0) {
				Object.assign(options, option);
		}

		if (Object.keys(body).length === 0) {
				delete options.body;
		}

		return options;
}

const uniquePredicate = (current: string, index: number, all: string[]) => all.indexOf(current) === index;
const nonInternalPredicate = (name: string) => !Object.keys(schema.internalNames).includes(name);
const namePredicate = (name: string) => (named: IName) => named.name === name;
export const nameOfPredicate = (names: ReadonlyArray<IName>) => (name: string) => names.find(namePredicate(name));

export function columnNamesToArray(columnNames: string): string[] {
		return columnNames
			? split(columnNames)
				.filter(nonInternalPredicate)
				.filter(uniquePredicate)
			: []
			;
}

export function columnNamesGlob(columnNames: string[], dtableColumns: TDtableMetadataColumns): string[] {
		const buffer: string[] = [];
		const names: string[] = dtableColumns.map(c => c.name).filter(nonInternalPredicate);
		columnNames.forEach(columnName => {
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
export function rowsSequence(rows: IRows) {
		const l = rows.rows.length;
		if (l) {
				const [first] = rows.rows;
				if (first && first._seq !== undefined) {
						return;
				}
		}
		for (let i = 0; i < l;) {
				rows.rows[i]._seq = ++i;
		}
}

export function rowDeleteInternalColumns(row: IRow): IRow {
		Object.keys(schema.internalNames).forEach(columnName => delete row[columnName]);
		return row;
}

export function rowsDeleteInternalColumns(rows: IRows) {
		rows.rows = rows.rows.map(rowDeleteInternalColumns);
}

function rowFormatColumn(input: unknown): boolean | number | string | string[] | null {
		if (null === input || undefined === input) {
				return null;
		}

		if (typeof input === 'boolean' || typeof input === 'number' || typeof input === 'string') {
				return input;
		}

		if (Array.isArray(input) && input.every(i => (typeof i === 'string'))) {
				return input;
		}

		return null;
}

export function rowFormatColumns(row: IRow, columnNames: string[]): IRow {
		const outRow = {} as IRow;
		columnNames.forEach((c) => (outRow[c] = rowFormatColumn(row[c])));
		return outRow;
}

export function rowsFormatColumns(rows: IRows, columnNames: string[]) {
		rows.rows = rows.rows.map((row) => rowFormatColumns(row, columnNames));
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
		Object.keys(row).forEach(key => {
				const column = columns.find(c => c.key === key);
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

export function rowsTimeFilter(rows: IRows, columnName: string, startDate: string) {
		rowsSequence(rows);
		const filter = (f: string) => f > startDate;
		rows.rows = rows.rows.filter(row => filter(row[columnName] as string));
}

export function rowsTimeSort(rows: IRows, columnName: string) {
		rowsSequence(rows);
		rows.rows = _.orderBy(rows.rows, [columnName, '_seq'], ['asc', 'asc']);
}

const assertResponse = (responsible: unknown): boolean => {
		if (responsible === undefined || !responsible || typeof responsible === 'string') {
				return false;
		}
		return typeof responsible === 'object';
};

async function ctxStageApiCredentials(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, ctx?: ICtx): Promise<ICtx> {
		ctx = ctx || {} as ICtx;
		if (!ctx.api) {
				const credentials: TCredentials = await this.getCredentials('seatableApi');

				if (credentials === undefined) {
						throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
				}

				if (0 === Object.keys(credentials).length) {
						throw new NodeOperationError(this.getNode(), 'Empty credentials got returned!');
				}

				ctx = apiCtx(credentials as unknown as IApi);
		}

		if (ctx.api === undefined || !assertResponse(ctx.api)) {
				throw new NodeOperationError(this.getNode(), 'SeaTable: Unable to stage on "api".');
		}

		return ctx;
}

async function ctxStageServerInfo(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, ctx?: ICtx): Promise<ICtx> {
		ctx = await ctxStageApiCredentials.call(this, ctx);

		const endpointExpr = endpointExprFunctor(ctx);
		let responseData;
		try {
				responseData = await this.helpers.request!({
						url: endpointExpr('/server-info/'),
						json: true,
				}) as IServerInfo;
		} catch (error) {
		}
		if (responseData?.version === undefined || responseData.edition === undefined) {
				throw new NodeOperationError(this.getNode(), `SeaTable: Failed to find server at "${ctx.api.server}", please check your credentials server setting.`);
		}
		ctx.api.info = responseData;

		return ctx;
}

async function ctxStageAppAccessToken(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, ctx?: ICtx): Promise<ICtx> {
		ctx = await ctxStageApiCredentials.call(this, ctx);

		if (ctx.api.appAccessToken === undefined) {
				if (ctx.api.server === undefined) {
						throw new NodeOperationError(this.getNode(), 'SeaTable: Unable to stage on "api" for {{server}}.');
				}
				const endpointExpr = endpointExprFunctor(ctx);
				try {
						ctx.api.appAccessToken = await this.helpers.request!({
								url: endpointExpr('/api/v2.1/dtable/app-access-token/'),
								// endpointExpr('Token {{access_token}}')
								headers: {Authorization: `Token ${ctx.api.token}`},
								json: true,
						}) as IAppAccessToken;
				} catch (error) {
						throw new NodeApiError(this.getNode(), error);
				}
		}

		if (ctx.api.appAccessToken === undefined || !assertResponse(ctx.api.appAccessToken)) {
				throw new NodeOperationError(this.getNode(), 'SeaTable: Failed to obtain access token of the base.');
		}

		return ctx;
}

export async function ctxStageDtableMetadata(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, ctx?: ICtx): Promise<ICtx> {
		ctx = await ctxStageAppAccessToken.call(this, ctx);

		if (ctx.metadata === undefined) {
				const endpointExpr = endpointExprFunctor(ctx);
				let responseData;
				try {
						responseData = await this.helpers.request!({
								url: endpointExpr('/dtable-server/api/v1/dtables/{{dtable_uuid}}/metadata/'),
								headers: {Authorization: endpointExpr('Token {{access_token}}')},
								json: true,
						});
				} catch (error) {
						throw new NodeApiError(this.getNode(), error);
				}
				if (responseData.metadata === undefined || !assertResponse(responseData)) {
						throw new NodeOperationError(this.getNode(), 'SeaTable: Error while obtaining metadata.');
				}
				ctx.metadata = responseData.metadata as IDtableMetadata;
		}

		if (ctx.metadata?.tables === undefined) {
				throw new NodeOperationError(this.getNode(), 'SeaTable: Metadata error.');
		}

		return ctx;
}

export const dtableSchemaIsColumn = (column: IDtableMetadataColumn): boolean =>
	!!schema.columnTypes[column.type];

const dtableSchemaIsUpdateAbleColumn = (column: IDtableMetadataColumn): boolean =>
	!!schema.columnTypes[column.type] && !schema.nonUpdateAbleColumnTypes[column.type];

export const dtableSchemaColumns = (columns: TDtableMetadataColumns): TDtableMetadataColumns =>
	columns.filter(dtableSchemaIsColumn);

export const updateAble = (columns: TDtableMetadataColumns): TDtableMetadataColumns =>
	columns.filter(dtableSchemaIsUpdateAbleColumn);

export async function apiDtableTables(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, ctx?: ICtx): Promise<TDtableMetadataTables> {
		ctx = await ctxStageDtableMetadata.call(this, ctx);

		return ctx.metadata.tables;
}

export async function apiDtableColumns(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, ctx: ICtx | undefined, tableName: string): Promise<TDtableMetadataColumns> {
		ctx = await ctxStageDtableMetadata.call(this, ctx);

		const table = ctx.metadata.tables.find(namePredicate(tableName)) as IDtableMetadataTable;
		if (table === undefined) {
				throw new NodeOperationError(this.getNode(), `SeaTable: Not a table: "${tableName}".`);
		}

		return dtableSchemaColumns(table.columns);
}

const trimEnd = (str: string, ch: '/') => {
		let end = str.length;
		while (end > 0 && str[end - 1] === ch) {
				--end;
		}
		return end < str.length ? str.substring(0, end) : str;
};

function endpointCtxExpr(this: void, ctx: ICtx, endpoint: TEndpointExpr): TEndpointResolvedExpr {
		const endpointVariables: IEndpointVariables = {};
		endpointVariables.access_token = ctx.api.appAccessToken?.access_token;
		endpointVariables.dtable_uuid = ctx.api.appAccessToken && ctx.api.appAccessToken['dtable_uuid'];
		endpointVariables.server = ctx.api.server;

		endpoint = normalize(endpoint);
		if (endpoint === undefined || !endpoint.length) {
				return '';
		}

		if (endpoint.charAt(0) === '/') {
				endpoint = trimEnd(endpointVariables.server, '/') + endpoint;
		}

		return endpoint.replace(/({{ *(access_token|dtable_uuid|server) *}})/g, (match: string, expr: string, name: TEndpointVariableName) => {
				return endpointVariables[name] || match;
		}) as TEndpointResolvedExpr;
}

const endpointExprFunctor = (ctx: ICtx) => (expression: TEndpointExpr): TEndpointResolvedExpr => endpointCtxExpr(ctx, expression);

/**
 * Make an API request to SeaTable
 *
 * @export
 * @param {ICtx} ctx
 * @returns {Promise<IDtableMetadata>}
 */
export async function apiMetadata(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, ctx: ICtx): Promise<IDtableMetadata> {
		ctx = await ctxStageDtableMetadata.call(this, ctx);

		return ctx.metadata;
}

/**
 * Make an API request to SeaTable
 *
 * @export
 * @param {ICtx} ctx
 * @param {TEndpoint} method
 * @param {string} endpoint
 * @param {object} body
 * @param query
 * @param uri
 * @param option
 * @returns {Promise<any>}
 */
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, ctx: ICtx, method: string, endpoint: TEndpoint, body: object, query?: IDataObject, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
		ctx = await ctxStageAppAccessToken.call(this, ctx);

		const endpointExpr = endpointExprFunctor(ctx);

		query = query || {};

		const options: OptionsWithUri = {
				headers: {
						Authorization: endpointExpr('Token {{access_token}}'),
				},
				method,
				body,
				qs: query,
				uri: uri || endpointExpr(endpoint),
				useQuerystring: false,
				json: true,
		};

		try {
				return await this.helpers.request!(apiRequestMergeOptionsWithUri(options, body, option));
		} catch (error) {
				throw new NodeApiError(this.getNode(), error);
		}
}

/**
 * Make an API request to paginated SeaTable endpoint
 * and return all results
 *
 * @export
 * @param {ICtx} ctx
 * @param {TMethod} method
 * @param {TEndpoint} endpoint
 * @param {IDataObject} body
 * @param {IDataObject} [query]
 * @returns {Promise<any>}
 */
export async function apiRequestAllItems(this: IHookFunctions | IExecuteFunctions | IPollFunctions, ctx: ICtx, method: TMethod, endpoint: TEndpoint, body: IDataObject, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any

		if (query === undefined) {
				query = {};
		}
		const segment = schema.rowFetchSegmentLimit;
		query.start = 0;
		query.limit = segment;

		const returnData: IDataObject[] = [];

		let responseData;

		do {
				responseData = await apiRequest.call(this, ctx, method, endpoint, body, query) as unknown as IRows;
				returnData.push.apply(returnData, responseData.rows);
				query.start = +query.start + segment;
		} while (responseData.rows && responseData.rows.length > segment - 1);

		return {rows: returnData};
}

export const toOptions = (items: ReadonlyArray<TLoadedResource>) =>
	items.map(({name}: IName) => ({name, value: name}));

export const getTableNames = async function (this: ILoadOptionsFunctions) {
		return toOptions(await apiDtableTables.call(this));
};
