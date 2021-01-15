import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	microsoftApiRequest,
	microsoftApiRequestAllItems,
} from './GenericFunctions';

import {
	channelFields,
	channelOperations,
} from './ChannelDescription';

import {
	channelMessageFields,
	channelMessageOperations,
} from './ChannelMessageDescription';

export class MicrosoftTeams implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Teams',
		name: 'microsoftTeams',
		icon: 'file:teams.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Microsoft Teams API',
		defaults: {
			name: 'Microsoft Teams',
			color: '#555cc7',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftTeamsOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Channel',
						value: 'channel',
					},
					{
						name: 'Channel Message (Beta)',
						value: 'channelMessage',
					},
				],
				default: 'channel',
				description: 'The resource to operate on.',
			},
			// CHANNEL
			...channelOperations,
			...channelFields,
			/// MESSAGE
			...channelMessageOperations,
			...channelMessageFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the team's channels to display them to user so that he can
			// select them easily
			async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const teamId = this.getCurrentNodeParameter('teamId') as string;
				const { value } = await microsoftApiRequest.call(this, 'GET', `/v1.0/teams/${teamId}/channels`);
				for (const channel of value) {
					const channelName = channel.displayName;
					const channelId = channel.id;
					returnData.push({
						name: channelName,
						value: channelId,
					});
				}
				return returnData;
			},
			// Get all the teams to display them to user so that he can
			// select them easily
			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { value } = await microsoftApiRequest.call(this, 'GET', '/v1.0/me/joinedTeams');
				for (const team of value) {
					const teamName = team.displayName;
					const teamId = team.id;
					returnData.push({
						name: teamName,
						value: teamId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'channel') {
				//https://docs.microsoft.com/en-us/graph/api/channel-post?view=graph-rest-beta&tabs=http
				if (operation === 'create') {
					const teamId = this.getNodeParameter('teamId', i) as string;
					const name = this.getNodeParameter('name', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const body: IDataObject = {
						displayName: name,
					};
					if (options.description) {
						body.description = options.description as string;
					}
					if (options.type) {
						body.membershipType = options.type as string;
					}
					responseData = await microsoftApiRequest.call(this, 'POST', `/v1.0/teams/${teamId}/channels`, body);
				}
				//https://docs.microsoft.com/en-us/graph/api/channel-delete?view=graph-rest-beta&tabs=http
				if (operation === 'delete') {
					const teamId = this.getNodeParameter('teamId', i) as string;
					const channelId = this.getNodeParameter('channelId', i) as string;
					responseData = await microsoftApiRequest.call(this, 'DELETE', `/v1.0/teams/${teamId}/channels/${channelId}`);
					responseData = { success: true };
				}
				//https://docs.microsoft.com/en-us/graph/api/channel-get?view=graph-rest-beta&tabs=http
				if (operation === 'get') {
					const teamId = this.getNodeParameter('teamId', i) as string;
					const channelId = this.getNodeParameter('channelId', i) as string;
					responseData = await microsoftApiRequest.call(this, 'GET', `/v1.0/teams/${teamId}/channels/${channelId}`);
				}
				//https://docs.microsoft.com/en-us/graph/api/channel-list?view=graph-rest-beta&tabs=http
				if (operation === 'getAll') {
					const teamId = this.getNodeParameter('teamId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll) {
						responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/v1.0/teams/${teamId}/channels`);
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/v1.0/teams/${teamId}/channels`, {});
						responseData = responseData.splice(0, qs.limit);
					}
				}
				//https://docs.microsoft.com/en-us/graph/api/channel-patch?view=graph-rest-beta&tabs=http
				if (operation === 'update') {
					const teamId = this.getNodeParameter('teamId', i) as string;
					const channelId = this.getNodeParameter('channelId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const body: IDataObject = {};
					if (updateFields.name) {
						body.displayName = updateFields.name as string;
					}
					if (updateFields.description) {
						body.description = updateFields.description as string;
					}
					responseData = await microsoftApiRequest.call(this, 'PATCH', `/v1.0/teams/${teamId}/channels/${channelId}`, body);
					responseData = { success: true };
				}
			}
			if (resource === 'channelMessage') {
				//https://docs.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-beta&tabs=http
				if (operation === 'create') {
					const teamId = this.getNodeParameter('teamId', i) as string;
					const channelId = this.getNodeParameter('channelId', i) as string;
					const messageType = this.getNodeParameter('messageType', i) as string;
					const message = this.getNodeParameter('message', i) as string;
					const body: IDataObject = {
						body: {
							contentType: messageType,
							content: message,
						},
					};
					responseData = await microsoftApiRequest.call(this, 'POST', `/beta/teams/${teamId}/channels/${channelId}/messages`, body);
				}
				//https://docs.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-beta&tabs=http
				if (operation === 'getAll') {
					const teamId = this.getNodeParameter('teamId', i) as string;
					const channelId = this.getNodeParameter('channelId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll) {
						responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/beta/teams/${teamId}/channels/${channelId}/messages`);
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/beta/teams/${teamId}/channels/${channelId}/messages`, {});
						responseData = responseData.splice(0, qs.limit);
					}
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
