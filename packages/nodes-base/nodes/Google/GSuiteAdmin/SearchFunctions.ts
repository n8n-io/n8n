import type {
	ILoadOptionsFunctions,
	IDataObject,
	INodeListSearchResult,
	INodeListSearchItems,
} from 'n8n-workflow';

import { googleApiRequest, googleApiRequestAllItems } from './GenericFunctions';

export async function searchUsers(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const qs: IDataObject = {
		customer: 'my_customer',
	};

	// Perform the API request to list all users
	const responseData = await googleApiRequestAllItems.call(
		this,
		'users',
		'GET',
		'/directory/v1/users',
		{},
		qs,
	);

	// Handle cases where no users are found
	if (!responseData || responseData.length === 0) {
		return { results: [] };
	}

	//Map the API response
	const results: INodeListSearchItems[] = responseData.map(
		(user: { name?: { fullName?: string }; id?: string }) => ({
			name: user.name?.fullName,
			value: user.id,
		}),
	);

	return { results };
}

export async function searchGroups(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const qs: IDataObject = {
		customer: 'my_customer',
	};

	// Perform the API request to list all groups
	const responseData = await googleApiRequestAllItems.call(
		this,
		'groups',
		'GET',
		'/directory/v1/groups',
		{},
		qs,
	);

	if (!responseData || responseData.length === 0) {
		return { results: [] };
	}

	//Map the API response
	const results: INodeListSearchItems[] = responseData.map(
		(group: { name?: string; email?: string; id?: string }) => ({
			name: group.name || group.email || 'Unnamed Group',
			value: group.id,
		}),
	);

	return { results };
}

export async function searchDevices(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const qs: IDataObject = {
		customerId: 'my_customer',
	};

	// Perform the API request to list all ChromeOS devices
	const responseData = await googleApiRequest.call(
		this,
		'GET',
		'/directory/v1/customer/my_customer/devices/chromeos/',
		{},
		qs,
	);

	if (!responseData || !responseData.chromeosdevices || responseData.chromeosdevices.length === 0) {
		return { results: [] };
	}

	// Map the API response
	const results: INodeListSearchItems[] = responseData.chromeosdevices.map(
		(device: { deviceId?: string; serialNumber?: string }) => ({
			name: device.serialNumber || 'Unknown Device',
			value: device.deviceId,
		}),
	);

	return { results };
}
