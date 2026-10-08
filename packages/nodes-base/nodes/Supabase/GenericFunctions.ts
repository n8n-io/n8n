import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeProperties,
	IPairedItemData,
	JsonObject,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError, toPathSegment, UserError } from 'n8n-workflow';
import { createHash } from 'node:crypto';

type SupabaseCredentials = {
	host: string;
	serviceRole: string;
};

export type SupabaseProject = {
	name: string;
	ref: string;
};

type SupabaseProjectApiKey = {
	api_key?: string;
	name?: string;
	type?: string;
};

const N8N_SECRET_KEY_NAME = 'n8n_managed_data_api';

function getCredentialType(context: IExecuteFunctions | ILoadOptionsFunctions) {
	const authentication = context.getNodeParameter('authentication', 0) as string;
	return authentication === 'oAuth2' ? 'supabaseOAuth2Api' : 'supabaseApi';
}

function getProjectRef(context: IExecuteFunctions | ILoadOptionsFunctions, itemIndex = 0) {
	const project = context.getNodeParameter('projectRef', itemIndex);
	if (typeof project !== 'string' || !project) throw new UserError('Select a Supabase project');
	if (!/^[a-z0-9]+$/.test(project)) throw new UserError('The Supabase project ID is invalid');

	return project;
}

async function supabaseManagementApiRequest<T>(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	resource: string,
	qs: IDataObject = {},
	method: IHttpRequestMethods = 'GET',
	body: IDataObject = {},
) {
	try {
		const options: IHttpRequestOptions = {
			method,
			url: `https://api.supabase.com/v1${resource}`,
			qs,
			body,
			json: true,
		};
		if (Object.keys(body).length === 0) delete options.body;

		return (await context.helpers.httpRequestWithAuthentication.call(
			context,
			'supabaseOAuth2Api',
			options,
		)) as T;
	} catch (error) {
		throw new NodeApiError(context.getNode(), error as JsonObject);
	}
}

export async function getSupabaseProjects(this: ILoadOptionsFunctions) {
	return await supabaseManagementApiRequest<SupabaseProject[]>(this, '/projects');
}

const projectSecretKeyCache = new Map<string, Promise<string>>();

function getOAuthCredentialId(context: IExecuteFunctions | ILoadOptionsFunctions) {
	const credentialId = context.getNode().credentials?.supabaseOAuth2Api?.id;
	return typeof credentialId === 'string' ? credentialId : undefined;
}

function getProjectSecretKeyCacheKey(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	projectRef: string,
) {
	const credentialId = getOAuthCredentialId(context);
	return credentialId ? `${credentialId}:${projectRef}` : undefined;
}

async function resolveProjectSecretKey(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	projectRef: string,
) {
	const keys = await supabaseManagementApiRequest<SupabaseProjectApiKey[]>(
		context,
		`/projects/${toPathSegment(projectRef)}/api-keys`,
		{ reveal: true },
	);
	const secretKey = keys.find(
		(key) => key.type === 'secret' && key.name === N8N_SECRET_KEY_NAME && key.api_key,
	);

	if (secretKey?.api_key) return secretKey.api_key;

	const createdKey = await supabaseManagementApiRequest<SupabaseProjectApiKey>(
		context,
		`/projects/${toPathSegment(projectRef)}/api-keys`,
		{ reveal: true },
		'POST',
		{
			type: 'secret',
			name: N8N_SECRET_KEY_NAME,
			description:
				"The n8n Supabase Node uses this key to access the Data API. Don't delete it if you want the node to keep working.",
		},
	);

	if (!createdKey.api_key) {
		throw new UserError(
			'Supabase did not return the new secret key. Give the OAuth app Secrets Read and Write access, then reconnect the credential.',
		);
	}

	return createdKey.api_key;
}

async function getProjectSecretKey(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	projectRef: string,
) {
	const cacheKey = getProjectSecretKeyCacheKey(context, projectRef);
	if (!cacheKey) return await resolveProjectSecretKey(context, projectRef);

	const cached = projectSecretKeyCache.get(cacheKey);
	if (cached) return await cached;

	const request = resolveProjectSecretKey(context, projectRef);
	projectSecretKeyCache.set(cacheKey, request);
	try {
		return await request;
	} catch (error) {
		if (projectSecretKeyCache.get(cacheKey) === request) projectSecretKeyCache.delete(cacheKey);
		throw error;
	}
}

async function invalidateProjectSecretKey(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	projectRef: string,
	projectKey: string,
) {
	const cacheKey = getProjectSecretKeyCacheKey(context, projectRef);
	if (!cacheKey) return;

	const cached = projectSecretKeyCache.get(cacheKey);
	if (cached && (await cached) === projectKey && projectSecretKeyCache.get(cacheKey) === cached) {
		projectSecretKeyCache.delete(cacheKey);
	}
}

export function getSchemaHeader(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	contextType: 'execute' | 'loadOptions',
) {
	let useCustomSchema = false;

	if (contextType === 'loadOptions') {
		useCustomSchema = context.getNodeParameter('useCustomSchema', false) as boolean;
	} else {
		useCustomSchema = context.getNodeParameter('useCustomSchema', 0, false) as boolean;
	}

	if (useCustomSchema) {
		let schema: string;
		const headers: IDataObject = {};

		if (contextType === 'loadOptions') {
			schema = context.getNodeParameter('schema', 'public') as string;
		} else {
			schema = context.getNodeParameter('schema', 0, 'public') as string;
		}

		if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
			headers['Content-Profile'] = schema;
		} else if (['GET', 'HEAD'].includes(method)) {
			headers['Accept-Profile'] = schema;
		}

		return headers;
	}

	return {};
}

export async function supabaseApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject | IDataObject[] = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
	itemIndex = 0,
) {
	const credentialType = getCredentialType(this);
	let host: string;
	let projectKey: string | undefined;
	let projectRef: string | undefined;

	if (credentialType === 'supabaseOAuth2Api') {
		projectRef = getProjectRef(this, itemIndex);
		host = `https://${projectRef}.supabase.co`;
		projectKey = await getProjectSecretKey(this, projectRef);
	} else {
		const credentials = await this.getCredentials<SupabaseCredentials>(credentialType);
		host = credentials.host;
	}

	const options: IHttpRequestOptions = {
		headers: {
			Prefer: 'return=representation',
			...(projectKey
				? {
						apikey: projectKey,
						Authorization: `Bearer ${projectKey}`,
					}
				: {}),
		},
		method,
		qs,
		body,
		url: uri ?? `${host.replace(/\/$/, '')}/rest/v1${resource}`,
		json: true,
	};

	try {
		options.headers = Object.assign({}, options.headers, headers);
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		if (credentialType === 'supabaseOAuth2Api') {
			try {
				return await this.helpers.httpRequest(options);
			} catch (error) {
				if (error.response?.status !== 401 || !projectRef || !projectKey) throw error;

				await invalidateProjectSecretKey(this, projectRef, projectKey);
				projectKey = await getProjectSecretKey(this, projectRef);
				options.headers = {
					...options.headers,
					apikey: projectKey,
					Authorization: `Bearer ${projectKey}`,
				};
				return await this.helpers.httpRequest(options);
			}
		}
		return await this.helpers.httpRequestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		if (error.description) {
			error.message = `${error.message}: ${error.description}`;
		}
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

type SupabaseApiDefinition = {
	paths?: IDataObject;
	definitions?: {
		[table: string]: { properties?: { [column: string]: { type: string } } } | undefined;
	};
};

const apiDefinitionsInFlight = new Map<string, Promise<SupabaseApiDefinition>>();

/**
 * Reads the PostgREST root document, which lists every table and column and so can run to
 * several megabytes. The editor opens one column dropdown per field and they all ask at
 * once, so overlapping callers share one request instead of a parsed copy each.
 */
export async function getApiDefinition(
	this: ILoadOptionsFunctions,
): Promise<SupabaseApiDefinition> {
	const credentialType = getCredentialType(this);
	const header = getSchemaHeader(this, 'GET', 'loadOptions');
	let credentialIdentity: unknown;
	if (credentialType === 'supabaseOAuth2Api') {
		credentialIdentity = [getOAuthCredentialId(this), getProjectRef(this)];
	} else {
		const { host, serviceRole } = await this.getCredentials<SupabaseCredentials>(credentialType);
		credentialIdentity = [host, serviceRole];
	}
	const key = createHash('sha256')
		.update(JSON.stringify([credentialType, credentialIdentity, header]))
		.digest('hex');

	const inFlight = apiDefinitionsInFlight.get(key);
	if (inFlight) return await inFlight;

	const request = supabaseApiRequest.call(this, 'GET', '/', {}, {}, undefined, header);
	apiDefinitionsInFlight.set(key, request);
	try {
		return await request;
	} finally {
		apiDefinitionsInFlight.delete(key);
	}
}

const mapOperations: { [key: string]: string } = {
	create: 'created',
	update: 'updated',
	getAll: 'retrieved',
	delete: 'deleted',
};

export function getFilters(
	resources: string[],
	operations: string[],
	{
		includeNoneOption = true,
		filterTypeDisplayName = 'Filter',
		filterFixedCollectionDisplayName = 'Filters',

		mustMatchOptions = [
			{
				name: 'Any Filter',
				value: 'anyFilter',
			},
			{
				name: 'All Filters',
				value: 'allFilters',
			},
		],
	},
): INodeProperties[] {
	return [
		{
			displayName: filterTypeDisplayName,
			name: 'filterType',
			type: 'options',
			options: [
				...(includeNoneOption ? [{ name: 'None', value: 'none' }] : []),
				{
					name: 'Build Manually',
					value: 'manual',
				},
				{
					name: 'String',
					value: 'string',
				},
			],
			displayOptions: {
				show: {
					resource: resources,
					operation: operations,
				},
			},
			default: 'manual',
		},
		{
			displayName: 'Must Match',
			name: 'matchType',
			type: 'options',
			options: mustMatchOptions,
			displayOptions: {
				show: {
					resource: resources,
					operation: operations,
					filterType: ['manual'],
				},
			},
			default: 'anyFilter',
		},
		{
			displayName: filterFixedCollectionDisplayName,
			name: 'filters',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			displayOptions: {
				show: {
					resource: resources,
					operation: operations,
					filterType: ['manual'],
				},
			},
			default: {},
			placeholder: 'Add Condition',
			options: [
				{
					displayName: 'Conditions',
					name: 'conditions',
					values: [
						{
							displayName: 'Field Name or ID',
							name: 'keyName',
							type: 'options',
							description:
								'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
							typeOptions: {
								loadOptionsDependsOn: ['tableId'],
								loadOptionsMethod: 'getTableColumns',
							},
							default: '',
						},
						{
							displayName: 'Condition',
							name: 'condition',
							type: 'options',
							options: [
								{
									name: 'Equals',
									value: 'eq',
								},
								{
									name: 'Full-Text',
									value: 'fullText',
								},
								{
									name: 'Greater Than',
									value: 'gt',
								},
								{
									name: 'Greater Than or Equal',
									value: 'gte',
								},
								{
									name: 'ILIKE operator',
									value: 'ilike',
									description: 'Use * in place of %',
								},
								{
									name: 'Is',
									value: 'is',
									description: 'Checking for exact equality (null,true,false,unknown)',
								},
								{
									name: 'Less Than',
									value: 'lt',
								},
								{
									name: 'Less Than or Equal',
									value: 'lte',
								},
								{
									name: 'LIKE operator',
									value: 'like',
									description: 'Use * in place of %',
								},
								{
									name: 'Not Equals',
									value: 'neq',
								},
							],
							default: '',
						},
						{
							displayName: 'Search Function',
							name: 'searchFunction',
							type: 'options',
							displayOptions: {
								show: {
									condition: ['fullText'],
								},
							},
							options: [
								{
									name: 'to_tsquery',
									value: 'fts',
								},
								{
									name: 'plainto_tsquery',
									value: 'plfts',
								},
								{
									name: 'phraseto_tsquery',
									value: 'phfts',
								},
								{
									name: 'websearch_to_tsquery',
									value: 'wfts',
								},
							],
							default: '',
						},
						{
							displayName: 'Field Value',
							name: 'keyValue',
							type: 'string',
							default: '',
						},
					],
				},
			],
			description: `Filter to decide which rows get ${mapOperations[operations[0]]}`,
		},
		{
			displayName:
				'See <a href="https://postgrest.org/en/stable/references/api/tables_views.html#horizontal-filtering" target="_blank">PostgREST guide</a> to creating filters',
			name: 'jsonNotice',
			type: 'notice',
			displayOptions: {
				show: {
					resource: resources,
					operation: operations,
					filterType: ['string'],
				},
			},
			default: '',
		},
		{
			displayName: 'Filters (String)',
			name: 'filterString',
			type: 'string',
			displayOptions: {
				show: {
					resource: resources,
					operation: operations,
					filterType: ['string'],
				},
			},
			default: '',
			placeholder: 'name=eq.jhon',
			hint: 'Use $1, $2, etc. and the parameters below to reference dynamic values, rather than building this string with an expression, to avoid PostgREST filter injection',
		},
		{
			displayName: 'Filters (String) Parameters',
			name: 'filterStringParameters',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			displayOptions: {
				show: {
					resource: resources,
					operation: operations,
					filterType: ['string'],
				},
			},
			default: {},
			placeholder: 'Add Parameter',
			options: [
				{
					displayName: 'Values',
					name: 'values',
					values: [
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
						},
					],
				},
			],
			description: 'Values to substitute for $1, $2, etc. in the filter string above.',
		},
	];
}

const supportedFilterConditions = new Set([
	'eq',
	'gt',
	'gte',
	'ilike',
	'is',
	'lt',
	'lte',
	'like',
	'neq',
]);

const supportedSearchFunctions = new Set(['fts', 'plfts', 'phfts', 'wfts']);

// ,.():"\ - reserved characters by PostgREST
// &?= - characters used in query strings
const postgrestReservedCharacters = /[,.():"&?=\\]/;

function quotePostgrestComponent(value: unknown) {
	const stringValue = String(value);
	if (!postgrestReservedCharacters.test(stringValue)) {
		return stringValue;
	}

	return `"${stringValue.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function getPostgrestOperator(value: IDataObject) {
	const condition = String(value.condition);
	if (condition !== 'fullText') {
		if (!supportedFilterConditions.has(condition)) {
			throw new UserError(`Unsupported filter condition: "${condition}"`);
		}

		return condition;
	}

	const searchFunction = String(value.searchFunction);
	if (!supportedSearchFunctions.has(searchFunction)) {
		throw new UserError(`Unsupported search function: "${searchFunction}"`);
	}

	return searchFunction;
}

export const buildQuery = (query: Map<string, string>, value: IDataObject) =>
	query.set(
		quotePostgrestComponent(value.keyName),
		`${getPostgrestOperator(value)}.${String(value.keyValue)}`,
	);

export const buildOrQuery = (value: IDataObject) =>
	`${quotePostgrestComponent(value.keyName)}.${getPostgrestOperator(value)}.${quotePostgrestComponent(value.keyValue)}`;

export const buildGetQuery = (query: Map<string, string>, value: IDataObject) =>
	query.set(quotePostgrestComponent(value.keyName), `eq.${String(value.keyValue)}`);

export function applyFilterStringParameters(filterString: string, parameters: IDataObject[]) {
	if (parameters.length === 0) return filterString;

	return filterString.replace(/\$(\d+)/g, (_match, index: string) => {
		const position = Number(index) - 1;
		if (position < 0 || position >= parameters.length) {
			throw new UserError(
				`Filters (String) references parameter $${index}, but only ${parameters.length} parameter(s) were provided`,
			);
		}

		return encodeURIComponent(quotePostgrestComponent(parameters[position].value));
	});
}

export function appendFilterStringToEndpoint(
	context: IExecuteFunctions,
	endpoint: string,
	itemIndex: number,
) {
	const filterString = context.getNodeParameter('filterString', itemIndex) as string;
	const filterStringParameters = context.getNodeParameter(
		'filterStringParameters.values',
		itemIndex,
		[],
	) as IDataObject[];

	const encodedTemplate = encodeURI(filterString);
	return `${endpoint}?${applyFilterStringParameters(encodedTemplate, filterStringParameters)}`;
}

export function mapPairedItemsFrom<T>(iterable: Iterable<T> | ArrayLike<T>): IPairedItemData[] {
	return Array.from(iterable, (_, i) => i).map((index) => {
		return {
			item: index,
		};
	});
}
