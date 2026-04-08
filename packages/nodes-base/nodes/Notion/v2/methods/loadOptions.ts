import moment from 'moment-timezone';
import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import {
	extractPageId,
	getBlockTypesOptions,
	notionApiRequest,
	notionApiRequestAllItems,
} from '../../shared/GenericFunctions';

export async function getDatabaseProperties(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const databaseId = this.getCurrentNodeParameter('databaseId', {
		extractValue: true,
	}) as string;
	const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
	for (const key of Object.keys(properties as IDataObject)) {
		//remove parameters that cannot be set from the API.
		if (
			![
				'created_time',
				'last_edited_time',
				'created_by',
				'last_edited_by',
				'formula',
				'rollup',
			].includes(properties[key].type as string)
		) {
			returnData.push({
				name: `${key}`,
				value: `${key}|${properties[key].type}`,
			});
		}
	}
	returnData.sort((a, b) => {
		if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
			return -1;
		}
		if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
			return 1;
		}
		return 0;
	});
	return returnData;
}

export async function getFilterProperties(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const databaseId = this.getCurrentNodeParameter('databaseId', {
		extractValue: true,
	}) as string;
	const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
	for (const key of Object.keys(properties as IDataObject)) {
		returnData.push({
			name: `${key}`,
			value: `${key}|${properties[key].type}`,
		});
	}
	returnData.sort((a, b) => {
		if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
			return -1;
		}
		if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
			return 1;
		}
		return 0;
	});
	return returnData;
}

export async function getBlockTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return getBlockTypesOptions();
}

export async function getPropertySelectValues(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const [name, type] = (this.getCurrentNodeParameter('&key') as string).split('|');
	const databaseId = this.getCurrentNodeParameter('databaseId', {
		extractValue: true,
	}) as string;
	const resource = this.getCurrentNodeParameter('resource') as string;
	const operation = this.getCurrentNodeParameter('operation') as string;
	const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
	if (resource === 'databasePage') {
		if (['multi_select', 'select', 'status'].includes(type) && operation === 'getAll') {
			return properties[name][type].options.map((option: IDataObject) => ({
				name: option.name,
				value: option.name,
			}));
		} else if (
			['multi_select', 'select', 'status'].includes(type) &&
			['create', 'update'].includes(operation)
		) {
			return properties[name][type].options.map((option: IDataObject) => ({
				name: option.name,
				value: option.name,
			}));
		}
	}
	return properties[name][type].options.map((option: IDataObject) => ({
		name: option.name,
		value: option.id,
	}));
}

export async function getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const users = await notionApiRequestAllItems.call(this, 'results', 'GET', '/users');
	for (const user of users) {
		if (user.type === 'person') {
			returnData.push({
				name: user.name,
				value: user.id,
			});
		}
	}
	return returnData;
}

export async function getDatabaseIdFromPage(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const pageId = extractPageId(
		this.getCurrentNodeParameter('pageId', { extractValue: true }) as string,
	);
	const {
		parent: { database_id: databaseId },
	} = await notionApiRequest.call(this, 'GET', `/pages/${pageId}`);
	const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
	for (const key of Object.keys(properties as IDataObject)) {
		//remove parameters that cannot be set from the API.
		if (
			![
				'created_time',
				'last_edited_time',
				'created_by',
				'last_edited_by',
				'formula',
				'rollup',
			].includes(properties[key].type as string)
		) {
			returnData.push({
				name: `${key}`,
				value: `${key}|${properties[key].type}`,
			});
		}
	}
	returnData.sort((a, b) => {
		if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
			return -1;
		}
		if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
			return 1;
		}
		return 0;
	});
	return returnData;
}

export async function getDatabaseOptionsFromPage(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const pageId = extractPageId(
		this.getCurrentNodeParameter('pageId', { extractValue: true }) as string,
	);
	const [name, type] = (this.getCurrentNodeParameter('&key') as string).split('|');
	const {
		parent: { database_id: databaseId },
	} = await notionApiRequest.call(this, 'GET', `/pages/${pageId}`);
	const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
	return properties[name][type].options.map((option: IDataObject) => ({
		name: option.name,
		value: option.name,
	}));
}

// Get all the timezones to display them to user so that they can
// select them easily
export async function getTimezones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	for (const timezone of moment.tz.names()) {
		const timezoneName = timezone;
		const timezoneId = timezone;
		returnData.push({
			name: timezoneName,
			value: timezoneId,
		});
	}
	returnData.unshift({
		name: 'Default',
		value: 'default',
		description: 'Timezone set in n8n',
	});
	return returnData;
}
