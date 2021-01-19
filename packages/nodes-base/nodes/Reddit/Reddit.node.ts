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
	handleListing,
	redditApiRequest,
} from './GenericFunctions';

import {
	allRedditFields,
	allRedditOperations,
} from './AllRedditDescription';

import {
	myAccountFields,
	myAccountOperations,
} from './MyAccountDescription';

import {
	submissionFields,
	submissionOperations,
} from './SubmissionDescription';

import {
	subredditFields,
	subredditOperations,
} from './SubredditDescription';

import {
	userFields,
	userOperations,
} from './UserDescription';

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
				displayOptions: {
					show: {
						resource: [
							'myAccount',
							'submission',
						],
					},
					hide: {
						operation: [
							'search',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'All Reddit',
						value: 'allReddit',
					},
					{
						name: 'My Account',
						value: 'myAccount',
					},
					{
						name: 'Submission',
						value: 'submission',
					},
					{
						name: 'Subreddit',
						value: 'subreddit',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'myAccount',
				description: 'Resource to consume',
			},

			// allReddit
			...allRedditOperations,
			...allRedditFields,

			// myAccount
			...myAccountOperations,
			...myAccountFields,

			// submission
			...submissionOperations,
			...submissionFields,

			// subreddit
			...subredditOperations,
			...subredditFields,

			// user
			...userOperations,
			...userFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

		if (resource === 'allReddit') {

			if (operation === 'get') {

				const information = this.getNodeParameter('information', i) as string;

				if (information === 'trending') {

					const endpoint = 'api/trending_subreddits.json';
					responseData = await redditApiRequest.call(this, 'GET', endpoint, {}, {});

				} else {

					const endpoint = 'best.json';
					responseData = await handleListing.call(this, i, endpoint);

				}
			}

		} else if (resource === 'myAccount') {

				if (operation === 'get') {

					const endpoints: {[key: string]: string} = {
						identity: 'me',
						blockedUsers: 'me/blocked',
						friends: 'me/friends',
						karma: 'me/karma',
						prefs: 'me/prefs',
						trophies: 'me/trophies',
					};

					const details = this.getNodeParameter('details', i) as string;
					responseData = await redditApiRequest.call(this, 'GET', `api/v1/${endpoints[details]}`, {}, {});

					if (details === 'identity') {
						responseData = responseData.features;
					}

				}

			} else if (resource === 'submission') {

				if (operation === 'post') {

					const qs: IDataObject = {
						title: this.getNodeParameter('title', i),
						sr: this.getNodeParameter('subreddit', i),
						kind: this.getNodeParameter('kind', i),
					};

					qs.kind === 'self'
						? qs.text = this.getNodeParameter('text', i)
						: qs.url = this.getNodeParameter('url', i);

					if (qs.url) {
						qs.resubmit = this.getNodeParameter('resubmit', i);
					}

					responseData = await redditApiRequest.call(this, 'POST', 'api/submit', qs, {});

				} else if (operation === 'comment') {

					const qs: IDataObject = {
						thing_id: this.getNodeParameter('target', i),
						text: this.getNodeParameter('text', i),
					};

					responseData = await redditApiRequest.call(this, 'POST', 'api/comment', qs, {});

				} else if (operation === 'search') {

					const subreddit = this.getNodeParameter('subreddit', i);

					const qs: IDataObject = {
						q: this.getNodeParameter('keyword', i),
						restrict_sr: 'on',
					};

					const endpoint = `r/${subreddit}/search.json`;

					responseData = await redditApiRequest.call(this, 'GET', endpoint, qs, {});

				}

			} else if (resource === 'subreddit') {

				if (operation === 'get') {

					const qs: IDataObject = {};

					const content = this.getNodeParameter('content', i) as string;
					const subreddit = this.getNodeParameter('subreddit', i);

					if (['about', 'rules', 'sidebar', 'sticky'].includes(content)) {

						const endpoint = `r/${subreddit}/about/${content}.json`;
						responseData = await redditApiRequest.call(this, 'GET', endpoint, qs, {});

						if (content === 'rules') {
							responseData = responseData.rules;
						}

					} else if (['top', 'hot', 'new', 'rising'].includes(content)) {

						const endpoint = `r/${subreddit}/${content}.json`;
						responseData = await handleListing.call(this, i, endpoint);

					}

				} else if (operation === 'search') {

					const endpoint = `api/search_reddit_names.json`;
					const qs: IDataObject = {
						query: this.getNodeParameter('keyword', i),
					};

					responseData = await redditApiRequest.call(this, 'GET', endpoint, qs, {});

				}

			} else if (resource === 'user') {

				if (operation === 'get') {

					const username = this.getNodeParameter('username', i) as string;
					const details = this.getNodeParameter('details', i) as string;
					const endpoint = `user/${username}/${details}.json`;

					responseData = ['about', 'gilded'].includes(details)
						? await redditApiRequest.call(this, 'GET', endpoint, {}, {})
						: await handleListing.call(this, i, endpoint);

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
