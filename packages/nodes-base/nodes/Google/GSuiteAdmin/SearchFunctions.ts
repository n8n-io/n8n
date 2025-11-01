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

	const responseData = await googleApiRequestAllItems.call(
		this,
		'users',
		'GET',
		'/directory/v1/users',
		{},
		qs,
	);

	if (!Array.isArray(responseData)) {
		return { results: [] };
	}

	const results: INodeListSearchItems[] = responseData.map(
		(user: { name?: { fullName?: string }; id: string }) => ({
			name: user.name?.fullName ?? user.id,
			value: user.id,
		}),
	);

	return { results };
}

export async function searchGroups(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const qs: IDataObject = {
		customer: 'my_customer',
	};

	const responseData = await googleApiRequestAllItems.call(
		this,
		'groups',
		'GET',
		'/directory/v1/groups',
		{},
		qs,
	);

	if (!Array.isArray(responseData)) {
		return { results: [] };
	}

	const results: INodeListSearchItems[] = responseData.map(
		(group: { name?: string; email?: string; id: string }) => ({
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

	const responseData = await googleApiRequest.call(
		this,
		'GET',
		'/directory/v1/customer/my_customer/devices/chromeos/',
		{},
		qs,
	);

	if (!Array.isArray(responseData?.chromeosdevices)) {
		return { results: [] };
	}

	const results: INodeListSearchItems[] = responseData.chromeosdevices.map(
		(device: { deviceId: string; serialNumber?: string }) => ({
			name: device.serialNumber || device.deviceId || 'Unknown Device',
			value: device.deviceId,
		}),
	);

	return { results };
}
