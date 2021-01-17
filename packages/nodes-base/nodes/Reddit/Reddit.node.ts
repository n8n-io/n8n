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

import {
	myAccountFields,
	myAccountOperations,
} from './MyAccountDescription';

import {
	submissionFields,
	submissionOperations,
} from './SubmissionDescription';

import {
	listingFields,
	listingOperations,
} from './ListingDescription';

import {
	snakeCase,
} from 'change-case';

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
					{
						name: 'Listing',
						value: 'listing',
					},
				],
				default: 'myAccount',
				description: 'Resource to consume',
			},

			// myAccount
			...myAccountOperations,
			...myAccountFields,

			// submission
			...submissionOperations,
			...submissionFields,

			// listing
			...listingOperations,
			...listingFields,
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

				if (operation === 'get') {

					const details = this.getNodeParameter('details', i) as string;

					const endpoints: {[key: string]: string} = {
						identity: 'me',
						blockedUsers: 'me/blocked',
						friends: 'me/friends',
						karma: 'me/karma',
						prefs: 'me/prefs',
						trophies: 'me/trophies',
					};

					responseData = await redditApiRequest.call(this, 'GET', endpoints[details], {}, {}, false);

					if (details === 'identity') {
						responseData = responseData.features;
					}

				}

			} else if (resource === 'submission') {

				if (operation === 'post') {

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

					responseData = await redditApiRequest.call(this, 'POST', 'submit', {}, body, false);

				}

			} else if (resource === 'listing') {

				if (operation === 'get') {

					const type = this.getNodeParameter('type', i) as string;

					if (type === 'trending') {

						const endpoint = 'api/trending_subreddits.json';
						responseData = await redditApiRequest.call(this, 'GET', endpoint, {}, {}, true);

					} else if (type === 'best') {

						const returnAll = this.getNodeParameter('returnAll', i);

						if (returnAll) {

							const endpoint = 'best.json';
							responseData = await redditApiRequestAllItems.call(this, 'GET', endpoint, {}, {}, true);

						} else {

							const qs: IDataObject = {
								limit: this.getNodeParameter('limit', i),
							};
							const endpoint = 'best.json';
							responseData = await redditApiRequestAllItems.call(this, 'GET', endpoint, qs, {}, true);
							responseData = responseData.splice(0, qs.limit);

						}
					}

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
