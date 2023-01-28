import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { sortLoadOptions } from '../helpers/utils';
import { googleApiRequest } from '../transport';

export async function getDimensions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const { items: dimensions } = await googleApiRequest.call(
		this,
		'GET',
		'',
		{},
		{},
		'https://www.googleapis.com/analytics/v3/metadata/ga/columns',
	);

	for (const dimesion of dimensions) {
		if (dimesion.attributes.type === 'DIMENSION' && dimesion.attributes.status !== 'DEPRECATED') {
			returnData.push({
				name: dimesion.attributes.uiName,
				value: dimesion.id,
				description: dimesion.attributes.description,
			});
		}
	}
	return sortLoadOptions(returnData);
}

export async function getMetrics(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const { items: metrics } = await googleApiRequest.call(
		this,
		'GET',
		'',
		{},
		{},
		'https://www.googleapis.com/analytics/v3/metadata/ga/columns',
	);

	for (const metric of metrics) {
		if (metric.attributes.type === 'METRIC' && metric.attributes.status !== 'DEPRECATED') {
			returnData.push({
				name: metric.attributes.uiName,
				value: metric.id,
				description: metric.attributes.description,
			});
		}
	}
	return sortLoadOptions(returnData);
}

export async function getViews(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const { items } = await googleApiRequest.call(
		this,
		'GET',
		'',
		{},
		{},
		'https://www.googleapis.com/analytics/v3/management/accounts/~all/webproperties/~all/profiles',
	);

	for (const item of items) {
		returnData.push({
			name: item.name,
			value: item.id,
			description: item.websiteUrl,
		});
	}

	return sortLoadOptions(returnData);
}

export async function getProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const { accounts } = await googleApiRequest.call(
		this,
		'GET',
		'',
		{},
		{},
		'https://analyticsadmin.googleapis.com/v1alpha/accounts',
	);

	for (const acount of accounts || []) {
		const { properties } = await googleApiRequest.call(
			this,
			'GET',
			'',
			{},
			{ filter: `parent:${acount.name}` },
			'https://analyticsadmin.googleapis.com/v1alpha/properties',
		);

		if (properties && properties.length > 0) {
			for (const property of properties) {
				const name = property.displayName;
				const value = property.name.split('/')[1] || property.name;
				returnData.push({ name, value });
			}
		}
	}
	return sortLoadOptions(returnData);
}

export async function getDimensionsGA4(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const propertyId = this.getNodeParameter('propertyId', undefined, {
		extractValue: true,
	}) as string;
	const { dimensions } = await googleApiRequest.call(
		this,
		'GET',
		`/v1beta/properties/${propertyId}/metadata`,
		{},
		{ fields: 'dimensions' },
	);

	for (const dimesion of dimensions) {
		returnData.push({
			name: dimesion.uiName as string,
			value: dimesion.apiName as string,
			description: dimesion.description as string,
		});
	}
	return sortLoadOptions(returnData);
}

export async function getMetricsGA4(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const propertyId = this.getNodeParameter('propertyId', undefined, {
		extractValue: true,
	}) as string;
	const { metrics } = await googleApiRequest.call(
		this,
		'GET',
		`/v1beta/properties/${propertyId}/metadata`,
		{},
		{ fields: 'metrics' },
	);

	for (const metric of metrics) {
		returnData.push({
			name: metric.uiName as string,
			value: metric.apiName as string,
			description: metric.description as string,
		});
	}
	return sortLoadOptions(returnData);
}
