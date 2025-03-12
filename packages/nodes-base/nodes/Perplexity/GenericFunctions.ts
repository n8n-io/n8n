import type {
	ICredentialDataDecryptedObject,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}
	return data;
}

export function getBaseUrl(credentials: ICredentialDataDecryptedObject): string {
	const baseUrl = credentials.baseUrl as string;
	console.log('baseUrl', baseUrl);
	return baseUrl ? baseUrl.replace(/\/$/, '') : 'https://api.perplexity.ai';
}

export async function getModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const models: INodePropertyOptions[] = [
		{
			name: 'R1-1776',
			value: 'r1-1776',
		},
		{
			name: 'Sonar',
			value: 'sonar',
		},
		{
			name: 'Sonar Deep Research',
			value: 'sonar-deep-research',
		},
		{
			name: 'Sonar Pro',
			value: 'sonar-pro',
		},
		{
			name: 'Sonar Reasoning',
			value: 'sonar-reasoning',
		},
		{
			name: 'Sonar Reasoning Pro',
			value: 'sonar-reasoning-pro',
		},
	];

	const filteredModels = filter
		? models.filter((model) => model.name.toLowerCase().includes(filter.toLowerCase()))
		: models;

	return {
		results: filteredModels,
	};
}
