import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeTypeDescription,
	INodePropertyOptions,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import {
	apiRequest,
} from './GenericFunctions';


export class Mattermost implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mattermost',
		name: 'mattermost',
		icon: 'file:mattermost.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to Mattermost',
		defaults: {
			name: 'Mattermost',
			color: '#0058CC',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mattermostApi',
				required: true,
			}
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
						name: 'Message',
						value: 'message',
					},
				],
				default: 'message',
				description: 'The resource to operate on.',
			},



			// ----------------------------------
			//         operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'channel',
						],
					},
				},
				options: [
					{
						name: 'Add User',
						value: 'addUser',
						description: 'Add a user to a channel',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new channel',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'message',
						],
					},
				},
				options: [
					{
						name: 'Post',
						value: 'post',
						description: 'Post a message into a channel',
					},
				],
				default: 'post',
				description: 'The operation to perform.',
			},



			// ----------------------------------
			//         channel
			// ----------------------------------

			// ----------------------------------
			//         channel:create
			// ----------------------------------
			{
				displayName: 'Team ID',
				name: 'teamId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTeams',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create'
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The Mattermost Team.',
			},
			{
				displayName: 'Display Name',
				name: 'displayName',
				type: 'string',
				default: '',
				placeholder: 'Announcements',
				displayOptions: {
					show: {
						operation: [
							'create'
						],
						resource: [
							'channel',
						],
					},
				},
				required: true,
				description: 'The non-unique UI name for the channel.',
			},
			{
				displayName: 'Name',
				name: 'channel',
				type: 'string',
				default: '',
				placeholder: 'announcements',
				displayOptions: {
					show: {
						operation: [
							'create'
						],
						resource: [
							'channel',
						],
					},
				},
				required: true,
				description: 'The unique handle for the channel, will be present in the channel URL.',
			},

			// ----------------------------------
			//         channel:addUser
			// ----------------------------------
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'addUser'
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The ID of the channel to invite user to.',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'addUser'
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The ID of the user to invite into channel.',
			},



			// ----------------------------------
			//         message
			// ----------------------------------

			// ----------------------------------
			//         message:post
			// ----------------------------------
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'post'
						],
						resource: [
							'message',
						],
					},
				},
				description: 'The ID of the channel to post to.',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				displayOptions: {
					show: {
						operation: [
							'post'
						],
						resource: [
							'message',
						],
					},
				},
				description: 'The text to send.',
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available workspaces to display them to user so that he can
			// select them easily
			async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = 'channels';
				const responseData = await apiRequest.call(this, 'GET', endpoint, {});

				if (responseData === undefined) {
					throw new Error('No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				let name: string;
				for (const data of responseData) {
					if (data.delete_at !== 0) {
						continue;
					}

					name = `${data.name} (${data.type === 'O' ? 'public' : 'private'})`;

					returnData.push({
						name,
						value: data.id,
					});
				}

				return returnData;
			},



			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = 'teams';
				const responseData = await apiRequest.call(this, 'GET', endpoint, {});

				if (responseData === undefined) {
					throw new Error('No data got returned');
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

				return returnData;
			},
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = 'users';
				const responseData = await apiRequest.call(this, 'GET', endpoint, {});

				if (responseData === undefined) {
					throw new Error('No data got returned');
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

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const credentials = this.getCredentials('mattermostApi');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		let operation: string;
		let resource: string;
		let requestMethod = 'POST';

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		for (let i = 0; i < items.length; i++) {
			let endpoint = '';
			body = {};
			qs = {};

			resource = this.getNodeParameter('resource', i) as string;
			operation = this.getNodeParameter('operation', i) as string;

			if (resource === 'channel') {
				if (operation === 'create') {
					// ----------------------------------
					//         channel:create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = 'channels';

					body.team_id = this.getNodeParameter('teamId', i) as string;
					body.displayName = this.getNodeParameter('displayName', i) as string;
					body.name = this.getNodeParameter('channel', i) as string;
					// TODO: Make type configurable
					body.type = 'O';

				} else if (operation === 'addUser') {
					// ----------------------------------
					//         channel:addUser
					// ----------------------------------

					requestMethod = 'POST';

					const channelId = this.getNodeParameter('channelId', i) as string;
					body.user_id = this.getNodeParameter('userId', i) as string;

					endpoint = `channels/${channelId}/members`;

				}
			} else if (resource === 'message') {
				if (operation === 'post') {
					// ----------------------------------
					//         message:post
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = 'posts';

					body.channel_id = this.getNodeParameter('channelId', i) as string;
					body.message = this.getNodeParameter('message', i) as string;

				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
			returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
