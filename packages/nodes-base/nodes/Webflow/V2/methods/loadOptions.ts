import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { webflowApiRequest } from '../transport';

export async function getSites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const response = await webflowApiRequest.call(this, 'GET', '/sites');

	for (const site of response.body.sites) {
		returnData.push({
			name: site.displayName,
			value: site.id,
		});
	}
	return returnData;
}
export async function getCollections(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const siteId = this.getCurrentNodeParameter('siteId');
	const response = await webflowApiRequest.call(this, 'GET', `/sites/${siteId}/collections`);

	for (const collection of response.body.collections) {
		returnData.push({
			name: collection.displayName,
			value: collection.id,
		});
	}
	return returnData;
}
export async function getFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const collectionId = this.getCurrentNodeParameter('collectionId');
	const response = await webflowApiRequest.call(this, 'GET', `/collections/${collectionId}`);

	for (const field of response.body.fields) {
		returnData.push({
			name: `${field.displayName} (${field.type}) ${field.isRequired ? ' (required)' : ''}`,
			value: field.slug,
		});
	}
	return returnData;
}
