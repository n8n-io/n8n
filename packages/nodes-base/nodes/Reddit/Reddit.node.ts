import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	redditApiRequest,
	redditApiRequestAllItems,
} from './GenericFunctions';

export class Reddit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Reddit',
		name: 'reddit',
		icon: 'file:reddit.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Reddit API',
		defaults: {
			name: 'Reddit',
			color: '#ff5700',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'redditOAuth2Api',
				required: true,
			},
		],
		properties: [
			// ----------------------------------
			//         Resources
			// ----------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Account',
						value: 'account',
					},
				],
				default: 'account',
				description: 'Resource to consume',
			},

			// ----------------------------------
			//         Operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'account',
						],
					},
				},
				options: [
					{
						name: 'Get myself',
						value: 'getMyself',
						description: 'Return the identity of the logged-in user',
					},
					{
						name: 'Get blocked users',
						value: 'getMyBlockedUsers',
						description: 'Return the identity of the logged-in user',
					},
					{
						name: 'Get my friends',
						value: 'getMyFriends',
						description: 'Return a list of friends for the logged-in user',
					},
					{
						name: 'Get my karma',
						value: 'getMyKarma',
						description: 'Return a breakdown of subreddit karma',
					},
					{
						name: 'Get my preferences',
						value: 'getMyPrefs',
						description: 'Return the preference settings of the logged-in user',
					},
					{
						name: 'Get my trophies',
						value: 'getMyTrophies',
						description: 'Return a list of trophies for the logged-in user',
					},
				],
				default: 'getMyself',
				description: 'Operation to perform',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

			if (resource === 'account') {

				if (operation === 'getMyself') {

					responseData = await redditApiRequest.call(this, 'GET', 'me');
					responseData = responseData.features;

				} else if (operation === 'getMyBlockedUsers') {

					responseData = await redditApiRequest.call(this, 'GET', 'me/blocked');

				} else if (operation === 'getMyFriends') {

					responseData = await redditApiRequest.call(this, 'GET', 'me/friends');

				} else if (operation === 'getMyKarma') {

					responseData = await redditApiRequest.call(this, 'GET', 'me/karma');

				} else if (operation === 'getMyPrefs') {

					responseData = await redditApiRequest.call(this, 'GET', 'me/prefs');

				} else if (operation === 'getMyTrophies') {

					responseData = await redditApiRequest.call(this, 'GET', 'me/trophies');

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}