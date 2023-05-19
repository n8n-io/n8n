import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { sortLoadOptions } from '../helpers/utils';
import { googleApiRequest } from '../transport';

export async function searchProperties(
	this: ILoadOptionsFunctions,
): Promise<INodeListSearchResult> {
	const returnData: INodeListSearchItems[] = [];

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
				const url = `https://analytics.google.com/analytics/web/#/p${value}/`;
				returnData.push({ name, value, url });
			}
		}
	}
	return {
		results: sortLoadOptions(returnData),
	};
}

export async function searchViews(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const returnData: INodeListSearchItems[] = [];
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
			name: `${item.name} [${item.websiteUrl}]`,
			value: item.id,
			url: `https://analytics.google.com/analytics/web/#/report-home/a${item.accountId}w${item.internalWebPropertyId}p${item.id}`,
		});
	}

	return {
		results: sortLoadOptions(returnData),
	};
}
