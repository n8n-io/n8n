import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../transport';

import {
	simplify
} from './simplify';

// List all the accessible customers
export async function getAccessibleCustomers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	// https://developers.google.com/google-ads/api/rest/auth

	const endpoint = '/customers:listAccessibleCustomers';

	const responseData = await apiRequest.call(this, 'GET', endpoint, {});

	if (responseData === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}

	const returnData: INodePropertyOptions[] = [];
	for (const data of responseData.resourceNames) {
		returnData.push({
			name: data,
			value: data,
		});
	}
	returnData.sort((a, b) => {
		if (a.name < b.name) { return -1; }
		if (a.name > b.name) { return 1; }
		return 0;
	});
	return returnData;
}

// Get all the available campaigns
export async function getCampaigns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const endpoint = '/channels';
	const responseData = await apiRequest.call(this, 'GET', endpoint, {});

	if (responseData === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}

	const returnData: INodePropertyOptions[] = [];
	let name: string;
	for (const data of responseData) {
		if (data.delete_at !== 0 || (!data.display_name || !data.name)) {
			continue;
		}

		name = `${data.team_display_name} - ${data.display_name || data.name} (${data.type === 'O' ? 'public' : 'private'})`;

		returnData.push({
			name,
			value: data.id,
		});
	}

	returnData.sort((a, b) => {
		if (a.name < b.name) { return -1; }
		if (a.name > b.name) { return 1; }
		return 0;
	});

	return returnData;
}

// Get all the available user list IDs
export async function getUserListIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	// https://developers.google.com/google-ads/api/rest/common/search

	const customerId = this.getNodeParameter('customerId') as string;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `/${customerId}/googleAds:search`;

	const form = {
		query: `SELECT user_list.id FROM user_list ORDER BY user_list.id DESC`,
	};

	let responseData = await apiRequest.call(this, requestMethod, endpoint, form, qs);
	responseData = simplify(responseData);

	const reformattedResponseData = [];
	for(let i = 0; i < responseData.length; i++) {
		// tslint:disable-next-line:no-any
		reformattedResponseData.push({id: responseData[i]['userList']['id']} as any);
	}

	const returnData: INodePropertyOptions[] = [];
	for (const data of reformattedResponseData) {
		returnData.push({
			name: data.id,
			value: data.id,
		});
	}
	returnData.sort((a, b) => {
		if (a.name < b.name) { return -1; }
		if (a.name > b.name) { return 1; }
		return 0;
	});
	return returnData;
}

// Get all the available user list resource names
export async function getUserListResourceNames(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	// https://developers.google.com/google-ads/api/rest/common/search

	const customerId = this.getNodeParameter('customerId') as string;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = `/${customerId}/googleAds:search`;

	const form = {
		query: `SELECT user_list.resource_name FROM user_list`,
	};

	let responseData = await apiRequest.call(this, requestMethod, endpoint, form, qs);
	responseData = simplify(responseData);

	const reformattedResponseData = [];
	for(let i = 0; i < responseData.length; i++) {
		// tslint:disable-next-line:no-any
		reformattedResponseData.push({resourceName: responseData[i]['userList']['resourceName']} as any);
	}

	const returnData: INodePropertyOptions[] = [];
	for (const data of reformattedResponseData) {
		returnData.push({
			name: data.resourceName,
			value: data.resourceName,
		});
	}
	returnData.sort((a, b) => {
		if (a.name < b.name) { return -1; }
		if (a.name > b.name) { return 1; }
		return 0;
	});
	return returnData;
}

