import { ApplicationError, NodeApiError, NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';

import { fetchPartitionKeyField } from './dataFetching';

export async function validateQueryParameters(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const query = this.getNodeParameter('query', '') as string;
	const queryOptions = this.getNodeParameter('options', {}) as IDataObject;

	const parameterNames = query.match(/@\w+/g) ?? [];

	const queryParameters = queryOptions?.queryOptions as IDataObject;
	const queryParamsString = queryParameters?.queryParameters as string;
	const parameterValues = queryParamsString
		? queryParamsString.split(',').map((param) => param.trim())
		: [];

	if (parameterNames.length !== parameterValues.length) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Empty parameter value provided',
				description: 'Please provide non-empty values for the query parameters',
			},
		);
	}

	requestOptions.body = {
		...(requestOptions.body as IDataObject),
		parameters: parameterNames.map((name, index) => ({
			name,
			value: isNaN(Number(parameterValues[index]))
				? parameterValues[index]
				: Number(parameterValues[index]),
		})),
	};

	return requestOptions;
}

export async function validatePartitionKey(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const operation = this.getNodeParameter('operation');
	let customProperties = this.getNodeParameter('customProperties', {}) as IDataObject;

	const partitionKeyResult = await fetchPartitionKeyField.call(this);
	const partitionKeyField =
		partitionKeyResult.results.length > 0 ? partitionKeyResult.results[0].value : '';

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

	if (!partitionKeyField) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Partition key not found',
				description: 'Failed to determine the partition key for this collection.',
			},
		);
	}

	if (!(typeof partitionKeyField === 'string' || typeof partitionKeyField === 'number')) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Invalid partition key',
				description: `Partition key must be a string or number, but got ${typeof partitionKeyField}.`,
			},
		);
	}

	let id;
	let partitionKeyValue;

	if (operation === 'create') {
		if (!Object.prototype.hasOwnProperty.call(customProperties, partitionKeyField)) {
			throw new NodeApiError(
				this.getNode(),
				{},
				{
					message: 'Partition key not found in custom properties',
					description: `Partition key "${partitionKeyField}" must be present and have a valid, non-empty value in custom properties.`,
				},
			);
		}
		partitionKeyValue = customProperties[partitionKeyField];
	} else if (operation === 'update') {
		const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;
		partitionKeyValue = additionalFields.partitionKey;

		if (!partitionKeyValue && partitionKeyField !== 'id') {
			throw new NodeApiError(
				this.getNode(),
				{},
				{
					message: `Partition key "${partitionKeyField}" is required for update`,
					description: `Please provide a valid value for partition key "${partitionKeyField}".`,
				},
			);
		}

		if (partitionKeyField === 'id') {
			partitionKeyValue = (this.getNodeParameter('id', {}) as IDataObject).value as string;
		}

		let requestBody: IDataObject;
		if (typeof requestOptions.body === 'string') {
			try {
				requestBody = JSON.parse(requestOptions.body);
			} catch (error) {
				throw new NodeOperationError(this.getNode(), 'Failed to parse requestOptions.body');
			}
		} else {
			requestBody = (requestOptions.body as IDataObject) || {};
		}

		requestOptions.body = JSON.stringify({
			...requestBody,
			[partitionKeyField]: partitionKeyValue,
		});
	} else {
		if (partitionKeyField === 'id') {
			id = (this.getNodeParameter('id', {}) as IDataObject).value as string;
			if (!id) {
				throw new NodeApiError(
					this.getNode(),
					{},
					{
						message: 'Item is missing or invalid',
						description: "The item must have a valid value selected from 'Item'",
					},
				);
			}
			partitionKeyValue = id;
		} else {
			const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;
			partitionKeyValue = additionalFields.partitionKey;
		}
	}

	if (partitionKeyValue === undefined || partitionKeyValue === null || partitionKeyValue === '') {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Partition key value is missing or empty',
				description: `Provide a value for partition key "${partitionKeyField}" in "Partition Key" field.`,
			},
		);
	}

	requestOptions.headers = {
		...requestOptions.headers,
		'x-ms-documentdb-partitionkey': `["${partitionKeyValue}"]`,
	};

	return requestOptions;
}

export async function validateContainerFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const { offerThroughput: manualThroughput, maxThroughput: autoscaleThroughput } =
		this.getNodeParameter('additionalFields', {}) as IDataObject;

	if (manualThroughput && autoscaleThroughput) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Bad parameter',
				description: 'Please choose only one of Max RU/s (Autoscale) and Manual Throughput RU/s',
			},
		);
	}

	requestOptions.headers = {
		...requestOptions.headers,
		...(autoscaleThroughput && {
			'x-ms-cosmos-offer-autopilot-setting': { maxThroughput: autoscaleThroughput },
		}),
		...(manualThroughput && { 'x-ms-offer-throughput': manualThroughput }),
	};

	return requestOptions;
}

export async function processResponseItems(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (!response || typeof response !== 'object' || !Array.isArray(items)) {
		throw new ApplicationError('Invalid response format from Azure Cosmos DB.');
	}

	const extractedDocuments = items.flatMap((item) => {
		if (item.json && typeof item.json === 'object' && Array.isArray(item.json.Documents)) {
			return item.json.Documents.map((doc) => ({
				...doc,
			}));
		}
		return [];
	});

	return extractedDocuments.length ? extractedDocuments : [{ json: {} }];
}

export async function processResponseContainers(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (!response || typeof response !== 'object' || !Array.isArray(items)) {
		throw new ApplicationError('Invalid response format from Azure Cosmos DB.');
	}

	const data = response.body as IDataObject;
	const documentCollections = (data.DocumentCollections as IDataObject[]) ?? [];

	return documentCollections.length > 0 ? documentCollections.map((doc) => ({ json: doc })) : [];
}

export async function simplifyData(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const simple = this.getNodeParameter('simple');
	const operation = this.getNodeParameter('operation');
	const resource = this.getNodeParameter('resource');

	if (!simple) {
		return items;
	}

	const simplifyFields = (data: IDataObject): IDataObject => {
		const simplifiedData = Object.keys(data)
			.filter((key) => !key.startsWith('_'))
			.reduce((acc, key) => {
				acc[key] = data[key];
				return acc;
			}, {} as IDataObject);

		return simplifiedData;
	};

	return items.map((item) => {
		const simplifiedData = simplifyFields(item.json || item);
		if (resource === 'item' && operation === 'getAll')
			return { ...simplifiedData } as INodeExecutionData;
		else return { json: simplifiedData } as INodeExecutionData;
	});
}
