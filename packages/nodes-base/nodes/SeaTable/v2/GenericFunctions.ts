import type FormData from 'form-data';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type {
	ICollaborator,
	ICollaboratorsResult,
	ICredential,
	ICtx,
	IDtableMetadataColumn,
	IEndpointVariables,
	IName,
	IRow,
	IRowObject,
	IColumnDigitalSignature,
	IFile,
} from './actions/Interfaces';
import { schema } from './Schema';
import type { TDtableMetadataColumns, TEndpointVariableName } from './types';

const userBaseUri = (uri?: string) => {
	if (uri === undefined) return uri;
	if (uri.endsWith('/')) return uri.slice(0, -1);
	return uri;
};

export function resolveBaseUri(ctx: ICtx) {
	return ctx?.credentials?.environment === 'cloudHosted'
		? 'https://cloud.seatable.io'
		: userBaseUri(ctx?.credentials?.domain);
}

export async function getBaseAccessToken(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	ctx: ICtx,
) {
	if (ctx?.base?.access_token !== undefined) return;

	const options: IHttpRequestOptions = {
		headers: {
			Authorization: `Token ${ctx?.credentials?.token}`,
		},
		url: `${resolveBaseUri(ctx)}/api/v2.1/dtable/app-access-token/`,
		json: true,
	};
	ctx.base = await this.helpers.httpRequest(options);
}

function endpointCtxExpr(ctx: ICtx, endpoint: string): string {
	const endpointVariables: IEndpointVariables = {};
	endpointVariables.access_token = ctx?.base?.access_token;
	endpointVariables.dtable_uuid = ctx?.base?.dtable_uuid;

	return endpoint.replace(
		/{{ *(access_token|dtable_uuid|server) *}}/g,
		(match: string, name: TEndpointVariableName) => {
			return (endpointVariables[name] as string) || match;
		},
	);
}

export async function seaTableApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	ctx: ICtx,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | FormData | string | Buffer = {},
	qs: IDataObject = {},
	url: string = '',
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('seaTableApi');

	ctx.credentials = credentials as unknown as ICredential;

	await getBaseAccessToken.call(this, ctx);

	// some API endpoints require the api_token instead of base_access_token.
	const token =
		endpoint.indexOf('/api/v2.1/dtable/app-download-link/') === 0 ||
		endpoint == '/api/v2.1/dtable/app-upload-link/' ||
		endpoint.indexOf('/seafhttp/upload-api') === 0
			? `${ctx?.credentials?.token}`
			: `${ctx?.base?.access_token}`;

	let options: IRequestOptions = {
		uri: url || `${resolveBaseUri(ctx)}${endpointCtxExpr(ctx, endpoint)}`,
		headers: {
			Authorization: `Token ${token}`,
		},
		method,
		qs,
		body,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		options = Object.assign({}, options, option);
	}

	// remove header from download request.
	if (endpoint.indexOf('/seafhttp/files/') === 0) {
		delete options.headers;
	}

	// enhance header for upload request
	if (endpoint.indexOf('/seafhttp/upload-api') === 0) {
		options.json = true;
		options.headers = {
			...options.headers,
			'Content-Type': 'multipart/form-data',
		};
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'seaTableApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function getBaseCollaborators(
	this: ILoadOptionsFunctions | IExecuteFunctions | IPollFunctions,
): Promise<any> {
	const collaboratorsResult: ICollaboratorsResult = await seaTableApiRequest.call(
		this,
		{},
		'GET',
		'/api-gateway/api/v2/dtables/{{dtable_uuid}}/related-users/',
	);
	const collaborators: ICollaborator[] = collaboratorsResult.user_list || [];
	return collaborators;
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
		'/api-gateway/api/v2/dtables/{{dtable_uuid}}/metadata',
	);
	for (const table of tables) {
		if (table.name === tableName) {
			return table.columns;
		}
	}
	return [];
}

export function simplify_new(row: IRow) {
	for (const key of Object.keys(row)) {
		if (key.startsWith('_')) delete row[key];
	}
	return row;
}

const namePredicate = (name: string) => (named: IName) => named.name === name;
export const nameOfPredicate = (names: readonly IName[]) => (name: string) =>
	names.find(namePredicate(name));

const normalize = (subject: string): string => (subject ? subject.normalize() : '');

export const split = (subject: string): string[] =>
	normalize(subject)
		.split(/\s*((?:[^\\,]*?(?:\\[\s\S])*)*?)\s*(?:,|$)/)
		.filter((s) => s.length)
		.map((s) => s.replace(/\\([\s\S])/gm, (_, $1) => $1));

function getCollaboratorInfo(
	authLocal: string | null | undefined,
	collaboratorList: ICollaborator[],
): ICollaborator {
	return (
		collaboratorList.find((singleCollaborator) => singleCollaborator.email === authLocal) || {
			contact_email: 'unknown',
			name: 'unknown',
			email: 'unknown',
		}
	);
}

function getAssetPath(type: string, url: string) {
	const parts = url.split(`/${type}/`);
	if (parts[1]) {
		return '/' + type + '/' + parts[1];
	}
	return url;
}

export function enrichColumns(
	row: IRow,
	metadata: IDtableMetadataColumn[],
	collaboratorList: ICollaborator[],
): IRow {
	Object.keys(row).forEach((key) => {
		const columnDef = metadata.find((obj) => obj.name === key || obj.key === key);

		if (columnDef?.type === 'collaborator') {
			// collaborator is an array of strings.
			const collaborators = (row[key] as string[]) || [];
			if (collaborators.length > 0) {
				const newArray = collaborators.map((email) => {
					const collaboratorDetails = getCollaboratorInfo(email, collaboratorList);
					const newColl = {
						email,
						contact_email: collaboratorDetails.contact_email,
						name: collaboratorDetails.name,
					};
					return newColl;
				});
				row[key] = newArray;
			}
		}

		if (
			columnDef?.type === 'last-modifier' ||
			columnDef?.type === 'creator' ||
			columnDef?.key === '_creator' ||
			columnDef?.key === '_last_modifier'
		) {
			// creator or last-modifier are always a single string.
			const collaboratorDetails = getCollaboratorInfo(row[key] as string, collaboratorList);
			row[key] = {
				email: row[key],
				contact_email: collaboratorDetails.contact_email,
				name: collaboratorDetails.name,
			};
		}

		if (columnDef?.type === 'image') {
			const pictures = (row[key] as string[]) || [];
			if (pictures.length > 0) {
				const newArray = pictures.map((url) => ({
					name: url.split('/').pop(),
					size: 0,
					type: 'image',
					url,
					path: getAssetPath('images', url),
				}));
				row[key] = newArray;
			}
		}

		if (columnDef?.type === 'file') {
			const files = (row[key] as IFile[]) || [];
			files.forEach((file) => {
				file.path = getAssetPath('files', file.url);
			});
		}

		if (columnDef?.type === 'digital-sign') {
			const digitalSignature: IColumnDigitalSignature | any = row[key];
			const collaboratorDetails = getCollaboratorInfo(digitalSignature?.username, collaboratorList);
			if (digitalSignature?.username) {
				digitalSignature.contact_email = collaboratorDetails.contact_email;
				digitalSignature.name = collaboratorDetails.name;
			}
		}

		if (columnDef?.type === 'button') {
			delete row[key];
		}
	});

	return row;
}

export function splitStringColumnsToArrays(
	row: IRowObject,
	columns: TDtableMetadataColumns,
): IRowObject {
	columns.map((column) => {
		if (column.type === 'collaborator' || column.type === 'multiple-select') {
			if (typeof row[column.name] === 'string') {
				const input = row[column.name] as string;
				row[column.name] = input.split(',').map((item) => item.trim());
			}
		}
		if (column.type === 'number') {
			if (typeof row[column.name] === 'string') {
				const input = row[column.name] as string;
				row[column.name] = parseFloat(input);
			}
		}
		if (column.type === 'rate' || column.type === 'duration') {
			if (typeof row[column.name] === 'string') {
				const input = row[column.name] as string;
				row[column.name] = parseInt(input);
			}
		}
		if (column.type === 'checkbox') {
			if (typeof row[column.name] === 'string') {
				const input = row[column.name] as string;
				row[column.name] = false;
				if (input === 'true' || input === 'on' || input === '1') {
					row[column.name] = true;
				}
			}
		}
	});
	return row;
}

export function rowExport(row: IRowObject, columns: TDtableMetadataColumns): IRowObject {
	const rowAllowed = {} as IRowObject;
	columns.map((column) => {
		if (row[column.name]) {
			rowAllowed[column.name] = row[column.name];
		}
	});
	return rowAllowed;
}

export const dtableSchemaIsColumn = (column: IDtableMetadataColumn): boolean =>
	!!schema.columnTypes[column.type];

const dtableSchemaIsUpdateAbleColumn = (column: IDtableMetadataColumn): boolean =>
	!!schema.columnTypes[column.type] && !schema.nonUpdateAbleColumnTypes[column.type];

export const dtableSchemaColumns = (columns: TDtableMetadataColumns): TDtableMetadataColumns =>
	columns.filter(dtableSchemaIsColumn);

export const updateAble = (columns: TDtableMetadataColumns): TDtableMetadataColumns =>
	columns.filter(dtableSchemaIsUpdateAbleColumn);
