import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../transport';

// Get all the available campaigns
export async function getCampaigns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
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

