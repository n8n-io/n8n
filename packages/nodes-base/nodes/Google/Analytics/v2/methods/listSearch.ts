import { ILoadOptionsFunctions, INodeListSearchItems, INodeListSearchResult } from 'n8n-workflow';
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
			`https://analyticsadmin.googleapis.com/v1alpha/properties`,
		);

		if (properties && properties.length > 0) {
			for (const property of properties) {
				returnData.push({
					name: property.displayName,
					value: property.name,
				});
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
			name: item.name,
			value: item.id,
			description: item.websiteUrl,
		});
	}

	return {
		results: sortLoadOptions(returnData),
	};
}
