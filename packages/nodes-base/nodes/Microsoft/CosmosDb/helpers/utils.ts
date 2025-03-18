import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	NodeApiError,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError, OperationalError } from 'n8n-workflow';

import { HeaderConstants } from './constants';
import { ErrorMap } from './errorHandler';
import type { IContainer } from './interfaces';
import { azureCosmosDbApiRequest } from '../transport';

export async function getPartitionKey(this: IExecuteSingleFunctions): Promise<string> {
	const container = this.getNodeParameter('container', undefined, {
		extractValue: true,
	}) as string;

	let partitionKeyField: string | undefined = undefined;
	try {
		const responseData = (await azureCosmosDbApiRequest.call(
			this,
			'GET',
			`/colls/${container}`,
		)) as IContainer;
		partitionKeyField = responseData.partitionKey?.paths[0]?.replace('/', '');
	} catch (error) {
		if ((error as NodeApiError).httpCode === '404') {
			(error as NodeApiError).message = ErrorMap.Container.NotFound.message;
			(error as NodeApiError).description = ErrorMap.Container.NotFound.description;
		}
		throw error;
	}

	if (!partitionKeyField) {
		throw new NodeOperationError(this.getNode(), 'Partition key not found', {
			description: 'Failed to determine the partition key for this collection',
		});
	}

	return partitionKeyField;
}

export async function simplifyData(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const simple = this.getNodeParameter('simple') as boolean;

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
		const simplifiedData = simplifyFields(item.json);
		return { json: simplifiedData } as INodeExecutionData;
	});
}

export async function validateQueryParameters(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const query = this.getNodeParameter('query', '') as string;
	const queryOptions = this.getNodeParameter('options.queryOptions') as IDataObject;

	const parameterNames = query.replace(/\$(\d+)/g, '@param$1').match(/@\w+/g) ?? [];

	const queryParamsString = queryOptions?.queryParameters as string;
	const parameterValues = queryParamsString
		? queryParamsString.split(',').map((param) => param.trim())
		: [];

	if (parameterNames.length !== parameterValues.length) {
		throw new NodeOperationError(this.getNode(), 'Empty parameter value provided', {
			description: 'Please provide non-empty values for the query parameters',
		});
	}

	requestOptions.body = {
		...(requestOptions.body as IDataObject),
		parameters: parameterNames.map((name, index) => ({
			name,
			value: parameterValues[index],
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

	const partitionKey = await getPartitionKey.call(this);

	if (typeof customProperties === 'string') {
		try {
			customProperties = jsonParse(customProperties);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'Invalid JSON format in "Item Contents"', {
				description: 'Ensure the "Item Contents" field contains a valid JSON object',
			});
		}
	}

	let partitionKeyValue: string = '';

	if (operation === 'create') {
		if (!customProperties.hasOwnProperty(partitionKey) || !customProperties[partitionKey]) {
			throw new NodeOperationError(this.getNode(), "Partition key not found in 'Item Contents'", {
				description: `Partition key '${partitionKey}' must be present and have a valid, non-empty value in 'Item Contents'`,
			});
		}
		partitionKeyValue = customProperties[partitionKey] as string;
	} else if (operation === 'update') {
		if (partitionKey === 'id') {
			partitionKeyValue = this.getNodeParameter('item', undefined, {
				extractValue: true,
			}) as string;
		} else {
			partitionKeyValue = this.getNodeParameter('additionalFields.partitionKey') as string;
			if (!partitionKeyValue) {
				throw new NodeOperationError(
					this.getNode(),
					`Partition key "${partitionKey}" is required for update`,
					{
						description: `Please provide a valid value for partition key '${partitionKey}'`,
					},
				);
			}
		}
		(requestOptions.body as IDataObject)[partitionKey] = partitionKeyValue;
	} else if (operation === 'delete' || operation === 'get') {
		if (partitionKey === 'id') {
			partitionKeyValue = this.getNodeParameter('item', undefined, {
				extractValue: true,
			}) as string;
		} else {
			partitionKeyValue = this.getNodeParameter('additionalFields.partitionKey') as string;
		}
	}

	if (!partitionKeyValue) {
		throw new NodeOperationError(this.getNode(), 'Partition key value is missing or empty', {
			description: `Provide a value for partition key "${partitionKey}" in "Partition Key" field`,
		});
	}

	requestOptions.headers = {
		...requestOptions.headers,
		[HeaderConstants.X_MS_DOCUMENTDB_PARTITIONKEY]: `["${partitionKeyValue}"]`,
	};

	return requestOptions;
}

export function processJsonInput<T>(
	jsonData: T,
	inputName?: string,
	fallbackValue: T | undefined = undefined,
) {
	let values;
	const input = inputName ? `'${inputName}' ` : '';

	if (typeof jsonData === 'string') {
		try {
			values = jsonParse(jsonData, { fallbackValue });
		} catch (error) {
			throw new OperationalError(`Input ${input} must contain a valid JSON`, { level: 'warning' });
		}
	} else if (typeof jsonData === 'object') {
		values = jsonData;
	} else {
		throw new OperationalError(`Input ${input} must contain a valid JSON`, { level: 'warning' });
	}

	return values;
}

export const untilContainerSelected = { container: [''] };

export const untilItemSelected = { item: [''] };
