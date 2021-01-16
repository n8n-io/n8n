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
						name: 'My Account',
						value: 'myAccount',
					},
					{
						name: 'Submission',
						value: 'submission',
					},
				],
				default: 'myAccount',
				description: 'Resource to consume',
			},

			// ----------------------------------
			//      My Account operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'myAccount',
						],
					},
				},
				options: [
					{
						name: 'Get identity',
						value: 'getIdentity',
						description: 'Return the identity of the logged-in user',
					},
					{
						name: 'Get blocked users',
						value: 'getBlockedUsers',
						description: 'Return the identity of the logged-in user',
					},
					{
						name: 'Get friends',
						value: 'getFriends',
						description: 'Return a list of friends for the logged-in user',
					},
					{
						name: 'Get karma',
						value: 'getKarma',
						description: 'Return a breakdown of subreddit karma',
					},
					{
						name: 'Get preferences',
						value: 'getPrefs',
						description: 'Return the preference settings of the logged-in user',
					},
					{
						name: 'Get trophies',
						value: 'getTrophies',
						description: 'Return a list of trophies for the logged-in user',
					},
				],
				default: 'getIdentity',
				description: 'Operation to perform',
			},

			// ----------------------------------
			//       Submission operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
					},
				},
				options: [
					{
						name: 'Post',
						value: 'post',
						description: 'Post a submission to a subreddit',
					},
				],
				default: 'post',
				description: 'Operation to perform',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				description: 'Title of the submission, up to 300 characters long',
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
						operation: [
							'post',
						],
					},
				},
			},
			{
				displayName: 'Subreddit',
				name: 'subreddit',
				type: 'string',
				required: true,
				default: '',
				description: 'Subreddit to post the submission to',
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
						operation: [
							'post',
						],
					},
				},
			},
			{
				displayName: 'Kind',
				name: 'kind',
				type: 'options',
				options: [
					{
						name: 'Text Post',
						value: 'self',
					},
					{
						name: 'Link Post',
						value: 'link',
					},
					{
						name: 'Image Post',
						value: 'image',
					},
					{
						name: 'Video Post',
						value: 'video',
					},
					{
						name: 'Video GIF Post',
						value: 'videogif',
					},
				],
				default: 'text',
				description: 'The kind of the submission to be posted',
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
						operation: [
							'post',
						],
					},
				},
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
				description: 'URL of the content of the submission',
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
						operation: [
							'post',
						],
						kind: [
							'link',
							'image',
							'video',
							'videogif',
						],
					},
				},
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				default: '',
				description: 'Text content of the submission (Markdown supported)',
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
						operation: [
							'post',
						],
						kind: [
							'self',
						],
					},
				},
			},
			{
				displayName: 'Resubmit',
				name: 'resubmit',
				type: 'boolean',
				default: false,
				description: 'If toggled on, the URL will be submitted even if<br>it was already submitted to the subreddit before.<br>Otherwise, a resubmission will trigger an error.',
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
						operation: [
							'post',
						],
						kind: [
							'link',
							'image',
							'video',
							'videogif',
						],
					},
				},
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

			if (resource === 'myAccount') {

				if (operation === 'getIdentity') {

					responseData = await redditApiRequest.call(this, 'GET', 'me');
					responseData = responseData.features;

				} else if (operation === 'getBlockedUsers') {

					responseData = await redditApiRequest.call(this, 'GET', 'me/blocked');

				} else if (operation === 'getFriends') {

					responseData = await redditApiRequest.call(this, 'GET', 'me/friends');

				} else if (operation === 'getKarma') {

					responseData = await redditApiRequest.call(this, 'GET', 'me/karma');

				} else if (operation === 'getPrefs') {

					responseData = await redditApiRequest.call(this, 'GET', 'me/prefs');

				} else if (operation === 'getTrophies') {

					responseData = await redditApiRequest.call(this, 'GET', 'me/trophies');

				}

			} else if (resource === 'post') {

				if (operation === 'submit') {

					const body: IDataObject = {
						title: this.getNodeParameter('title', i),
						sr: this.getNodeParameter('subreddit', i),
						kind: this.getNodeParameter('kind', i),
					};

					body.kind === 'self'
						? body.text = this.getNodeParameter('text', i)
						: body.url = this.getNodeParameter('url', i);

					const resubmit = this.getNodeParameter('resubmit', i);

					if (resubmit) {
						body.resubmit = true;
					}

					responseData = await redditApiRequest.call(this, 'POST', 'submit', body);

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}