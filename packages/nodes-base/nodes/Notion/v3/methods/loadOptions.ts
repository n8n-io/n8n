import moment from 'moment-timezone';
import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { extractPageId, getBlockTypesOptions } from '../../shared/GenericFunctions';
import { splitPropertyKey } from '../helpers/utils';
import {
	getDataSourceProperties,
	isDataObject,
	notionApiRequestAllItemsV3,
	notionApiRequestV3,
} from '../transport';

const READ_ONLY_PROPERTY_TYPES = [
	'created_time',
	'last_edited_time',
	'created_by',
	'last_edited_by',
	'formula',
	'rollup',
];

async function getSelectedDataSourceProperties(
	this: ILoadOptionsFunctions,
	parameterName = 'dataSourceId',
) {
	const dataSourceId = this.getCurrentNodeParameter(parameterName, {
		extractValue: true,
	}) as string;

	if (!dataSourceId) {
		throw new Error('No data source ID selected');
	}

	return await getDataSourceProperties.call(this, dataSourceId);
}

function mapPropertiesToOptions(
	properties: IDataObject | undefined,
	options: { includeReadOnly: boolean },
) {
	if (!properties) {
		return [];
	}

	const returnData: INodePropertyOptions[] = [];
	for (const key of Object.keys(properties)) {
		const property = properties[key];
		if (!isDataObject(property) || typeof property.type !== 'string') continue;
		if (!options.includeReadOnly && READ_ONLY_PROPERTY_TYPES.includes(property.type)) continue;

		returnData.push({
			name: key,
			value: `${key}|${property.type}`,
		});
	}
	return returnData.sort((a, b) => a.name.localeCompare(b.name));
}

function mapSelectOptions(options: unknown[]): INodePropertyOptions[] {
	return options.filter(isDataObject).flatMap((option) => {
		if (typeof option.name !== 'string') return [];

		return {
			name: option.name,
			value: option.name,
		};
	});
}

export async function getDataSourcePropertiesOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const properties = await getSelectedDataSourceProperties.call(this);
	return mapPropertiesToOptions(properties, { includeReadOnly: false });
}

export async function getFilterProperties(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const properties = await getSelectedDataSourceProperties.call(this);
	return mapPropertiesToOptions(properties, { includeReadOnly: true });
}

export async function getBlockTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return getBlockTypesOptions();
}

export async function getPropertySelectValues(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const key = this.getCurrentNodeParameter('&key') as string | undefined;
	if (!key) {
		return [];
	}
	const { name, type } = splitPropertyKey(key);
	const properties = await getSelectedDataSourceProperties.call(this);
	const property = properties?.[name];
	if (
		!isDataObject(property) ||
		!isDataObject(property[type]) ||
		!Array.isArray(property[type].options)
	) {
		return [];
	}

	return mapSelectOptions(property[type].options);
}

export async function getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const users = await notionApiRequestAllItemsV3.call(this, 'results', 'GET', '/users');
	for (const user of users) {
		if (isDataObject(user) && user.type === 'person') {
			returnData.push({
				name: user.name as string,
				value: user.id as string,
			});
		}
	}
	return returnData;
}

async function getParentDataSourceIdFromPage(
	this: ILoadOptionsFunctions,
): Promise<string | undefined> {
	const pageId = extractPageId(
		this.getCurrentNodeParameter('pageId', { extractValue: true }) as string,
	);
	const page = await notionApiRequestV3.call(this, 'GET', `/pages/${pageId}`);
	if (!isDataObject(page) || !isDataObject(page.parent)) {
		return undefined;
	}

	const parent = page.parent;
	return typeof parent.data_source_id === 'string' ? parent.data_source_id : undefined;
}

export async function getDataSourcePropertiesFromPage(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const dataSourceId = await getParentDataSourceIdFromPage.call(this);

	if (!dataSourceId) {
		return [];
	}

	const properties = await getDataSourceProperties.call(this, dataSourceId);
	return mapPropertiesToOptions(properties, { includeReadOnly: false });
}

export async function getDataSourceOptionsFromPage(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const key = this.getCurrentNodeParameter('&key') as string | undefined;
	if (!key) {
		return [];
	}
	const { name, type } = splitPropertyKey(key);
	const dataSourceId = await getParentDataSourceIdFromPage.call(this);
	if (!dataSourceId) return [];

	const properties = await getDataSourceProperties.call(this, dataSourceId);
	const property = properties[name];
	if (
		!isDataObject(property) ||
		!isDataObject(property[type]) ||
		!Array.isArray(property[type].options)
	) {
		return [];
	}
	return mapSelectOptions(property[type].options);
}

export async function getTimezones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	for (const timezone of moment.tz.names()) {
		returnData.push({
			name: timezone,
			value: timezone,
		});
	}
	returnData.unshift({
		name: 'Default',
		value: 'default',
		description: 'Timezone set in n8n',
	});
	return returnData;
}
