import {
	type IExecuteSingleFunctions,
	ApplicationError,
	type IDataObject,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
} from 'n8n-workflow';

import { makeAzureCosmosDbRequest } from './azureCosmosDbRequest';
import { formatResults } from './helpers';

async function fetchData(
	this: ILoadOptionsFunctions,
	url: string,
	key: 'DocumentCollections' | 'Documents',
): Promise<IDataObject[]> {
	try {
		const opts: IHttpRequestOptions = { method: 'GET', url };
		const responseData = await makeAzureCosmosDbRequest.call(this, opts);

		const data = responseData[key] as IDataObject;

		return Array.isArray(data) ? data : [];
	} catch (error) {
		throw new ApplicationError(`Error fetching data from Azure Cosmos DB: ${error.message}`);
	}
}

export async function searchContainers(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const collections = await fetchData.call(this, '/colls', 'DocumentCollections');
	return { results: formatResults(collections, filter) };
}

export async function searchItems(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const collectionId = (this.getNodeParameter('collId') as IDataObject).value as string;
	if (!collectionId) {
		throw new ApplicationError('Container is required to search items');
	}

	const items = await fetchData.call(this, `/colls/${collectionId}/docs`, 'Documents');
	return { results: formatResults(items, filter) };
}

export async function fetchPartitionKeyField(
	this: ILoadOptionsFunctions | IExecuteSingleFunctions,
): Promise<INodeListSearchResult> {
	const collectionId = (this.getNodeParameter('collId') as IDataObject).value as string;

	if (!collectionId) {
		throw new ApplicationError('Container is required to search items');
	}

	const responseData = await makeAzureCosmosDbRequest.call(this, {
		method: 'GET',
		url: `/colls/${collectionId}`,
	});
	let partitionKeyField = '';

	if (
		responseData?.partitionKey &&
		typeof responseData.partitionKey === 'object' &&
		!Array.isArray(responseData.partitionKey) &&
		'paths' in responseData.partitionKey
	) {
		const partitionKey = responseData.partitionKey;
		if (Array.isArray(partitionKey.paths)) {
			partitionKeyField = partitionKey.paths[0]?.replace('/', '') || '';
		}
	}

	return {
		results: partitionKeyField ? [{ name: partitionKeyField, value: partitionKeyField }] : [],
	};
}
