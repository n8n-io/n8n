import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { microsoftApiRequestAllItems } from '../transport';

export async function getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const categories = await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		'/outlook/masterCategories',
	);
	for (const category of categories) {
		returnData.push({
			name: category.displayName as string,
			value: category.id as string,
		});
	}
	return returnData;
}

export async function getFolders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const folders = await microsoftApiRequestAllItems.call(this, 'value', 'GET', '/mailFolders', {});
	for (const folder of folders) {
		returnData.push({
			name: folder.displayName as string,
			value: folder.id as string,
		});
	}
	return returnData;
}
