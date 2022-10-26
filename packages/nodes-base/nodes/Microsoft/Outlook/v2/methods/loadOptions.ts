// Get all the categories to display them to user so that he can

import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { microsoftApiRequestAllItems } from '../transport';

// select them easily
async function getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
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
