import {IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions} from 'n8n-core';

import {OptionsWithUri} from 'request';

import {IDataObject, IPollFunctions, NodeApiError, NodeOperationError} from 'n8n-workflow';

import * as _ from 'lodash';

export interface IApi {
		server: string;
		token: string;
		appAccessToken?: IAppAccessToken;
}

export interface ICtx {
		api: IApi;
		metadata: IDtableMetadata;
}

interface IAppAccessToken {
		app_name: string;
		access_token: string;
		dtable_uuid: string;
		dtable_server: string;
		dtable_socket: string;
		workspace_id: number;
		dtable_name: string;
}

interface IDtableMetadata {
		tables: IDtableMetadataTable[];
		version: string;
		format_version: string;
}

export interface IDtableMetadataTable {
		_id: string;
		name: string;
		columns: IDtableMetadataColumn[];
}

export interface IDtableMetadataColumn {
		key: string;
		name: string;
		type: string;
}

type TEndpointVariableName = 'access_token' | 'dtable_uuid' | 'server';

export interface IEndpointVariables {
		[name: string]: string | undefined;
}

type TColumnValue = undefined | boolean | number | string | string[] | null;
export type TTriggerOperationValue = 'create' | 'update';

export interface IRow {
		[key: string]: TColumnValue;

		_id: string;
		_ctime: string;
		_mtime: string;
		_seq?: number;
}

export interface IRows {
		rows: IRow[];
}

export interface ISchema {
		[key: string]: boolean;
}

const schema = {
		rowFetchSegmentLimit: 1000,
		internalNames: ['_id', '_creator', '_ctime', '_last_modifier', '_mtime', '_seq'],
		columnTypes: {
				text: 'Text',
				'long-text': 'Long Text',
				number: 'Number',
				collaborator: 'Collaborator',
				date: 'Date',
				duration: 'Duration',
				'single-select': 'Single Select',
				'multiple-select': 'Multiple Select',
				email: 'Email',
				url: 'URL',
				'rate': 'Rating',
				checkbox: 'Checkbox',
				formula: 'Formula',
				creator: 'Creator',
				ctime: 'Created time',
				'last-modifier': 'Last Modifier',
				mtime: 'Last modified time',
				'auto-number': 'Auto number',
		} as { [type: string]: string },
};

function normalize(subject: string): string {
		if (subject) {
				subject = subject.normalize();
		}
		return subject;
}

export function ctx(api: IApi): ICtx {
		api.server = normalize(api.server);
		return {api} as ICtx;
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

export function columnNamesToArray(columnNames: string): string[] {
		return columnNames
			? normalize(columnNames)
				.split(/\s*((?:[^\\,]*?(?:\\[\s\S])*)*?)\s*(?:,|$)/)
				.filter(s => s.length)
				.map(s => s.replace(/\\([\s\S])/gm, (_, $1) => $1))
				.filter(($) => !(1 + ['', ...schema.internalNames].indexOf($)))
				.filter(($, index, $$) => $$.indexOf($) === index)
			: []
			;
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
		schema.internalNames.forEach(name => delete row[name]);
		return row;
}

export function rowsDeleteInternalColumns(rows: IRows) {
		rows.rows = _.map(rows.rows, rowDeleteInternalColumns);
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

export function rowMapColumnsFromKeysToNames(row: IRow, columns: IDtableMetadataColumn[]): IRow {
		const outRow = {} as IRow;

		schema.internalNames.forEach((name) => {
				if (row[name]) {
						outRow[name] = row[name];
						delete row[name];
				}
		});
		_.forEach(row, (value, key) => {
				const column = columns.find(c => c.key === key);
				if (column) {
						outRow[column.name] = row[key];
				}
		});

		return outRow;
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

function ctxStageApiCredentials(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, ctx: ICtx): ICtx {
		if (!ctx.api) {
				const credentials = this.getCredentials('seatableApi');

				if (credentials === undefined) {
						throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
				}

				ctx.api = credentials as unknown as IApi;
		}

		if (ctx.api === undefined) {
				throw new NodeOperationError(this.getNode(), 'SeaTable: Unable to stage on "api".');
		}

		return ctx;
}

async function ctxStageAppAccessToken(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, ctx: ICtx): Promise<ICtx> {
		ctx = ctxStageApiCredentials.call(this, ctx);
		if (ctx.api === undefined) {
				throw new NodeOperationError(this.getNode(), 'SeaTable: Unable to stage on "api".');
		}

		if (ctx.api.appAccessToken === undefined) {
				try {
						ctx.api.appAccessToken = await this.helpers.request!({
								url: `${ctx.api.server}/api/v2.1/dtable/app-access-token/`,
								headers: {Authorization: `Token ${ctx.api.token}`},
								json: true,
						}) as IAppAccessToken;
				} catch (error) {
						throw new NodeApiError(this.getNode(), error);
				}
		}

		if (ctx.api.appAccessToken === undefined) {
				throw new NodeOperationError(this.getNode(), 'SeaTable: Failed to obtain access token of the base.');
		}

		return ctx;
}

async function ctxStageDtableMetadata(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, ctx: ICtx): Promise<ICtx> {
		ctx = ctxStageApiCredentials.call(this, ctx);
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
				if (responseData.metadata === undefined) {
						throw new NodeOperationError(this.getNode(), 'SeaTable: Error while obtaining metadata.');
				}
				ctx.metadata = responseData.metadata as IDtableMetadata;
		}

		return ctx;
}

export function dtableSchemaIsColumn(column: IDtableMetadataColumn): boolean {
		return !!schema.columnTypes[column.type];
}

function dtableSchemaColumns(columns: IDtableMetadataColumn[]): IDtableMetadataColumn[] {
		return columns.filter(dtableSchemaIsColumn);
}

export async function apiDtableColumns(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, ctx: ICtx, tableName: string): Promise<IDtableMetadataColumn[]> {
		ctx = await ctxStageDtableMetadata.call(this, ctx);

		if (ctx.metadata?.tables === undefined) {
				throw new NodeOperationError(this.getNode(), 'SeaTable: Metadata error.');
		}

		const table = ctx.metadata.tables.find(e => e.name === tableName) as IDtableMetadataTable;
		if (table === undefined) {
				throw new NodeOperationError(this.getNode(), `SeaTable: Not a table: "${tableName}".`);
		}

		return dtableSchemaColumns(table.columns);
}

function endpointCtxExpr(this: void, ctx: ICtx, endpoint: string): string {
		const endpointVariables: IEndpointVariables = {};
		endpointVariables.access_token = ctx.api.appAccessToken?.access_token;
		endpointVariables.dtable_uuid = ctx.api.appAccessToken && ctx.api.appAccessToken['dtable_uuid'];
		endpointVariables.server = ctx.api.server;

		if (endpoint === undefined || !endpoint.length) {
				return '';
		}

		endpoint = normalize(endpoint);

		if (endpoint.charAt(0) === '/') {
				endpoint = endpointVariables.server + endpoint;
		}

		return endpoint.replace(/({{ *(access_token|dtable_uuid|server) *}})/g, (match: string, expr: string, name: TEndpointVariableName) => {
				return endpointVariables[name] || match;
		}) as string;
}

function endpointExprFunctor(this: void, ctx: ICtx): (expr: string) => string {
		return (expr: string) => endpointCtxExpr(ctx, expr);
}

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
 * @param {string} method
 * @param {string} endpoint
 * @param {object} body
 * @param query
 * @param uri
 * @param option
 * @returns {Promise<any>}
 */
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, ctx: ICtx, method: string, endpoint: string, body: object, query?: IDataObject, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
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
 * @param {string} method
 * @param {string} endpoint
 * @param {IDataObject} body
 * @param {IDataObject} [query]
 * @returns {Promise<any>}
 */
export async function apiRequestAllItems(this: IHookFunctions | IExecuteFunctions | IPollFunctions, ctx: ICtx, method: string, endpoint: string, body: IDataObject, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any

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
