import {
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type INodeListSearchItems,
} from 'n8n-workflow';

export interface IHttpRequestOptionsExtended extends IHttpRequestOptions {
	uri?: string;
}

export function formatResults(items: IDataObject[], filter?: string): INodeListSearchItems[] {
	return items
		.map(({ id }) => ({
			name: String(id).replace(/ /g, ''),
			value: String(id),
		}))
		.filter(({ name }) => !filter || name.includes(filter))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function formatJSONFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;
	const rawPartitionKey = additionalFields.partitionKey as string | undefined;
	const indexingPolicy = additionalFields.indexingPolicy as string;

	const parseJSON = (
		jsonString: string | undefined,
		defaultValue: IDataObject = {},
	): IDataObject => {
		if (!jsonString) return defaultValue;
		try {
			return JSON.parse(jsonString);
		} catch {
			throw new NodeApiError(
				this.getNode(),
				{},
				{
					message: 'Invalid JSON format',
					description:
						'Please provide valid JSON objects for "Partition Key" or "Indexing Policy".',
				},
			);
		}
	};

	const defaultPartitionKey = { paths: ['/id'], kind: 'Hash', version: 2 };
	const parsedPartitionKey = parseJSON(rawPartitionKey, defaultPartitionKey);
	const parsedIndexPolicy = parseJSON(indexingPolicy);

	(requestOptions.body as IDataObject).partitionKey = parsedPartitionKey;
	if (Object.keys(parsedIndexPolicy).length > 0) {
		(requestOptions.body as IDataObject).indexingPolicy = parsedIndexPolicy;
	}

	return requestOptions;
}

export function parseCustomProperties(this: IExecuteSingleFunctions): IDataObject {
	let customProperties = this.getNodeParameter('customProperties', {}) as IDataObject;

	if (typeof customProperties === 'string') {
		try {
			customProperties = JSON.parse(customProperties);
		} catch (error) {
			throw new NodeApiError(
				this.getNode(),
				{},
				{
					message: 'Invalid JSON format in "Item Contents".',
					description: 'Ensure the "Item Contents" field contains a valid JSON object.',
				},
			);
		}
	}

	if (customProperties && Object.keys(customProperties).length === 0) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'No item content property provided',
				description: 'Item contents must contain at least one field',
			},
		);
	}
	return customProperties;
}

export async function formatCustomProperties(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const parsedProperties = parseCustomProperties.call(this);
	const operation = this.getNodeParameter('operation') as string;

	let itemId: string | undefined;

	if (operation === 'update') {
		itemId = (this.getNodeParameter('id', {}) as IDataObject).value as string;
		if (!itemId || typeof itemId !== 'string') {
			throw new NodeApiError(
				this.getNode(),
				{},
				{
					message: 'Missing "Item" field for update operation.',
					description: 'The "Item" must be provided separately when updating an item.',
				},
			);
		}
	} else if (operation === 'create') {
		itemId = (parsedProperties.id as string) ?? undefined;
		if (!itemId || typeof itemId !== 'string') {
			throw new NodeApiError(
				this.getNode(),
				{},
				{
					message: 'Missing or invalid "id" field.',
					description: 'The "id" must be provided in the "Item Contents" for creating an item.',
				},
			);
		}
	}

	parsedProperties.id = itemId;

	if (!parsedProperties.id || typeof parsedProperties.id !== 'string') {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Missing or invalid "id" field.',
				description: 'The "Item Contents" JSON must contain an "id" field as a string.',
			},
		);
	}

	if (/\s/.test(parsedProperties.id)) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Invalid ID format: IDs cannot contain spaces.',
				description: 'Use an underscore (_) or another separator instead.',
			},
		);
	}

	requestOptions.body = parsedProperties;

	return requestOptions;
}
