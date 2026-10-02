import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { getSubfolders, microsoftApiRequestAllItems } from '../transport';

// loadOptions context throughout this file: the transport's trailing `0` is its
// fallback read (getNodeParameter's 2nd arg here is a fallback, not an item index).

export async function getCategoriesNames(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const categories = await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		'/outlook/masterCategories',
		0,
	);
	for (const category of categories) {
		returnData.push({
			name: category.displayName as string,
			value: category.displayName as string,
		});
	}
	return returnData;
}

export async function getFolders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const response = await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		'/mailFolders',
		0,
		{},
	);
	const folders = await getSubfolders.call(this, response, 0, true);
	for (const folder of folders) {
		returnData.push({
			name: folder.displayName as string,
			value: folder.id as string,
		});
	}
	return returnData;
}

export async function getCalendarGroups(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const calendars = await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		'/calendarGroups',
		0,
		{},
	);
	for (const calendar of calendars) {
		returnData.push({
			name: calendar.name as string,
			value: calendar.id as string,
		});
	}
	return returnData;
}
