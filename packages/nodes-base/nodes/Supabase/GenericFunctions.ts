import type { OptionsWithUri } from 'request';

import type {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	INodeProperties,
	IPairedItemData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function supabaseApiRequest(
	this:
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IHookFunctions
		| IWebhookFunctions,
	method: string,
	resource: string,
	body: IDataObject | IDataObject[] = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
) {
	const credentials = (await this.getCredentials('supabaseApi')) as {
		host: string;
		serviceRole: string;
	};

	const options: OptionsWithUri = {
		headers: {
			Prefer: 'return=representation',
		},
		method,
		qs,
		body,
		uri: uri || `${credentials.host}/rest/v1${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		return await this.helpers.requestWithAuthentication.call(this, 'supabaseApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
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
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		filterStringDisplayName = 'Filters (String)',
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
								'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
				'See <a href="https://postgrest.org/en/v9.0/api.html#horizontal-filtering-rows" target="_blank">PostgREST guide</a> to creating filters',
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
		},
	];
}

export const buildQuery = (obj: IDataObject, value: IDataObject) => {
	if (value.condition === 'fullText') {
		return Object.assign(obj, {
			[`${value.keyName}`]: `${value.searchFunction}.${value.keyValue}`,
		});
	}
	return Object.assign(obj, { [`${value.keyName}`]: `${value.condition}.${value.keyValue}` });
};

export const buildOrQuery = (key: IDataObject) => {
	if (key.condition === 'fullText') {
		return `${key.keyName}.${key.searchFunction}.${key.keyValue}`;
	}
	return `${key.keyName}.${key.condition}.${key.keyValue}`;
};

export const buildGetQuery = (obj: IDataObject, value: IDataObject) => {
	return Object.assign(obj, { [`${value.keyName}`]: `eq.${value.keyValue}` });
};

export async function validateCredentials(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
): Promise<any> {
	const credentials = decryptedCredentials;

	const { serviceRole } = credentials as {
		serviceRole: string;
	};

	const options: OptionsWithUri = {
		headers: {
			apikey: serviceRole,
			Authorization: 'Bearer ' + serviceRole,
		},
		method: 'GET',
		uri: `${credentials.host}/rest/v1/`,
		json: true,
	};

	return this.helpers.request(options);
}

export function mapPairedItemsFrom<T>(iterable: Iterable<T> | ArrayLike<T>): IPairedItemData[] {
	return Array.from(iterable, (_, i) => i).map((index) => {
		return {
			item: index,
		};
	});
}
