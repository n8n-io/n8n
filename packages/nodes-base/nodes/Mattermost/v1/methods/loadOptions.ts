import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../transport';

// Get all the available channels
export async function getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const endpoint = 'channels';
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

// Get all the channels in a team
export async function getChannelsInTeam(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const teamId = this.getCurrentNodeParameter('teamId');
	const endpoint = `users/me/teams/${teamId}/channels`;
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

		const channelTypes: IDataObject = {
			'D': 'direct',
			'G': 'group',
			'O': 'public',
			'P': 'private',
		};

		name = `${data.display_name} (${channelTypes[data.type as string]})`;

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

export async function getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const endpoint = 'users/me/teams';
	const responseData = await apiRequest.call(this, 'GET', endpoint, {});

	if (responseData === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}

	const returnData: INodePropertyOptions[] = [];
	let name: string;
	for (const data of responseData) {

		if (data.delete_at !== 0) {
			continue;
		}

		name = `${data.display_name} (${data.type === 'O' ? 'public' : 'private'})`;

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

export async function getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const endpoint = 'users';
	const responseData = await apiRequest.call(this, 'GET', endpoint, {});

	if (responseData === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}

	const returnData: INodePropertyOptions[] = [];
	for (const data of responseData) {

		if (data.delete_at !== 0) {
			continue;
		}

		returnData.push({
			name: data.username,
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

