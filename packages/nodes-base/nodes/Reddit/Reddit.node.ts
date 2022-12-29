import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

import { handleListing, redditApiRequest } from './GenericFunctions';

import { postCommentFields, postCommentOperations } from './PostCommentDescription';

import { postFields, postOperations } from './PostDescription';

import { profileFields, profileOperations } from './ProfileDescription';

import { subredditFields, subredditOperations } from './SubredditDescription';

import { userFields, userOperations } from './UserDescription';

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
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'redditOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						resource: ['postComment', 'post', 'profile'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Post',
						value: 'post',
					},
					{
						name: 'Post Comment',
						value: 'postComment',
					},
					{
						name: 'Profile',
						value: 'profile',
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
				default: 'post',
			},
			...postCommentOperations,
			...postCommentFields,
			...profileOperations,
			...profileFields,
			...subredditOperations,
			...subredditFields,
			...postOperations,
			...postFields,
			...userOperations,
			...userFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let responseData;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				// *********************************************************************
				//         post
				// *********************************************************************

				if (resource === 'post') {
					if (operation === 'create') {
						// ----------------------------------
						//         post: create
						// ----------------------------------

						// https://www.reddit.com/dev/api/#POST_api_submit

						const qs: IDataObject = {
							title: this.getNodeParameter('title', i),
							sr: this.getNodeParameter('subreddit', i),
							kind: this.getNodeParameter('kind', i),
						};

						qs.kind === 'self'
							? (qs.text = this.getNodeParameter('text', i))
							: (qs.url = this.getNodeParameter('url', i));

						if (qs.url) {
							qs.resubmit = this.getNodeParameter('resubmit', i);
						}

						responseData = await redditApiRequest.call(this, 'POST', 'api/submit', qs);

						responseData = responseData.json.data;
					} else if (operation === 'delete') {
						// ----------------------------------
						//         post: delete
						// ----------------------------------

						// https://www.reddit.com/dev/api/#POST_api_del

						const postTypePrefix = 't3_';

						const qs: IDataObject = {
							id: postTypePrefix + this.getNodeParameter('postId', i),
						};

						await redditApiRequest.call(this, 'POST', 'api/del', qs);

						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------
						//         post: get
						// ----------------------------------

						const subreddit = this.getNodeParameter('subreddit', i);
						const postId = this.getNodeParameter('postId', i) as string;
						const endpoint = `r/${subreddit}/comments/${postId}.json`;

						responseData = await redditApiRequest.call(this, 'GET', endpoint, {});
						responseData = responseData[0].data.children[0].data;
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         post: getAll
						// ----------------------------------

						// https://www.reddit.com/dev/api/#GET_hot
						// https://www.reddit.com/dev/api/#GET_new
						// https://www.reddit.com/dev/api/#GET_rising
						// https://www.reddit.com/dev/api/#GET_{sort}

						const subreddit = this.getNodeParameter('subreddit', i);
						let endpoint = `r/${subreddit}.json`;

						const { category } = this.getNodeParameter('filters', i) as { category: string };
						if (category) {
							endpoint = `r/${subreddit}/${category}.json`;
						}

						responseData = await handleListing.call(this, i, endpoint);
					} else if (operation === 'search') {
						// ----------------------------------
						//         post: search
						// ----------------------------------

						// https://www.reddit.com/dev/api/#GET_search

						const location = this.getNodeParameter('location', i);

						const qs = {
							q: this.getNodeParameter('keyword', i),
							restrict_sr: location === 'subreddit',
						} as IDataObject;

						const { sort } = this.getNodeParameter('additionalFields', i);

						if (sort) {
							qs.sort = sort;
						}

						let endpoint = '';

						if (location === 'allReddit') {
							endpoint = 'search.json';
						} else {
							const subreddit = this.getNodeParameter('subreddit', i);
							endpoint = `r/${subreddit}/search.json`;
						}

						responseData = await handleListing.call(this, i, endpoint, qs);

						const returnAll = this.getNodeParameter('returnAll', 0);

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', 0);
							responseData = responseData.splice(0, limit);
						}
					}
				} else if (resource === 'postComment') {
					// *********************************************************************
					//        postComment
					// *********************************************************************

					if (operation === 'create') {
						// ----------------------------------
						//        postComment: create
						// ----------------------------------

						// https://www.reddit.com/dev/api/#POST_api_comment

						const postTypePrefix = 't3_';

						const qs: IDataObject = {
							text: this.getNodeParameter('commentText', i),
							thing_id: postTypePrefix + this.getNodeParameter('postId', i),
						};

						responseData = await redditApiRequest.call(this, 'POST', 'api/comment', qs);
						responseData = responseData.json.data.things[0].data;
					} else if (operation === 'getAll') {
						// ----------------------------------
						//        postComment: getAll
						// ----------------------------------

						// https://www.reddit.com/r/{subrreddit}/comments/{postId}.json

						const subreddit = this.getNodeParameter('subreddit', i);
						const postId = this.getNodeParameter('postId', i) as string;
						const endpoint = `r/${subreddit}/comments/${postId}.json`;

						responseData = await handleListing.call(this, i, endpoint);
					} else if (operation === 'delete') {
						// ----------------------------------
						//        postComment: delete
						// ----------------------------------

						// https://www.reddit.com/dev/api/#POST_api_del

						const commentTypePrefix = 't1_';

						const qs: IDataObject = {
							id: commentTypePrefix + this.getNodeParameter('commentId', i),
						};

						await redditApiRequest.call(this, 'POST', 'api/del', qs);

						responseData = { success: true };
					} else if (operation === 'reply') {
						// ----------------------------------
						//        postComment: reply
						// ----------------------------------

						// https://www.reddit.com/dev/api/#POST_api_comment

						const commentTypePrefix = 't1_';

						const qs: IDataObject = {
							text: this.getNodeParameter('replyText', i),
							thing_id: commentTypePrefix + this.getNodeParameter('commentId', i),
						};

						responseData = await redditApiRequest.call(this, 'POST', 'api/comment', qs);
						responseData = responseData.json.data.things[0].data;
					}
				} else if (resource === 'profile') {
					// *********************************************************************
					//         profile
					// *********************************************************************

					if (operation === 'get') {
						// ----------------------------------
						//         profile: get
						// ----------------------------------

						// https://www.reddit.com/dev/api/#GET_api_v1_me
						// https://www.reddit.com/dev/api/#GET_api_v1_me_karma
						// https://www.reddit.com/dev/api/#GET_api_v1_me_prefs
						// https://www.reddit.com/dev/api/#GET_api_v1_me_trophies
						// https://www.reddit.com/dev/api/#GET_prefs_{where}

						const endpoints: { [key: string]: string } = {
							identity: 'me',
							blockedUsers: 'me/blocked',
							friends: 'me/friends',
							karma: 'me/karma',
							prefs: 'me/prefs',
							trophies: 'me/trophies',
						};

						const details = this.getNodeParameter('details', i) as string;
						const endpoint = `api/v1/${endpoints[details]}`;
						let username;

						if (details === 'saved') {
							({ name: username } = await redditApiRequest.call(this, 'GET', 'api/v1/me', {}));
						}

						responseData =
							details === 'saved'
								? await handleListing.call(this, i, `user/${username}/saved.json`)
								: await redditApiRequest.call(this, 'GET', endpoint, {});

						if (details === 'identity') {
							responseData = responseData.features;
						} else if (details === 'friends') {
							responseData = responseData.data.children;
							if (!responseData.length) {
								throw new NodeApiError(this.getNode(), responseData);
							}
						} else if (details === 'karma') {
							responseData = responseData.data;
							if (!responseData.length) {
								throw new NodeApiError(this.getNode(), responseData);
							}
						} else if (details === 'trophies') {
							responseData = responseData.data.trophies.map((trophy: IDataObject) => trophy.data);
						}
					}
				} else if (resource === 'subreddit') {
					// *********************************************************************
					//        subreddit
					// *********************************************************************

					if (operation === 'get') {
						// ----------------------------------
						//        subreddit: get
						// ----------------------------------

						// https://www.reddit.com/dev/api/#GET_r_{subreddit}_about
						// https://www.reddit.com/dev/api/#GET_r_{subreddit}_about_rules

						const subreddit = this.getNodeParameter('subreddit', i);
						const content = this.getNodeParameter('content', i) as string;
						const endpoint = `r/${subreddit}/about/${content}.json`;

						responseData = await redditApiRequest.call(this, 'GET', endpoint, {});

						if (content === 'rules') {
							responseData = responseData.rules;
						} else if (content === 'about') {
							responseData = responseData.data;
						}
					} else if (operation === 'getAll') {
						// ----------------------------------
						//        subreddit: getAll
						// ----------------------------------

						// https://www.reddit.com/dev/api/#GET_api_trending_subreddits
						// https://www.reddit.com/dev/api/#POST_api_search_subreddits
						// https://www.reddit.com/r/subreddits.json

						const filters = this.getNodeParameter('filters', i);

						if (filters.trending) {
							const returnAll = this.getNodeParameter('returnAll', 0);
							const endpoint = 'api/trending_subreddits.json';
							responseData = await redditApiRequest.call(this, 'GET', endpoint, {});
							responseData = responseData.subreddit_names.map((name: string) => ({ name }));
							if (!returnAll) {
								const limit = this.getNodeParameter('limit', 0);
								responseData = responseData.splice(0, limit);
							}
						} else if (filters.keyword) {
							const qs: IDataObject = {};
							qs.query = filters.keyword;

							const endpoint = 'api/search_subreddits.json';
							responseData = await redditApiRequest.call(this, 'POST', endpoint, qs);

							const returnAll = this.getNodeParameter('returnAll', 0);

							if (!returnAll) {
								const limit = this.getNodeParameter('limit', 0);
								responseData = responseData.subreddits.splice(0, limit);
							}
						} else {
							const endpoint = 'r/subreddits.json';
							responseData = await handleListing.call(this, i, endpoint);
						}
					}
				} else if (resource === 'user') {
					// *********************************************************************
					//           user
					// *********************************************************************

					if (operation === 'get') {
						// ----------------------------------
						//           user: get
						// ----------------------------------

						// https://www.reddit.com/dev/api/#GET_user_{username}_{where}

						const username = this.getNodeParameter('username', i) as string;
						const details = this.getNodeParameter('details', i) as string;
						const endpoint = `user/${username}/${details}.json`;

						responseData =
							details === 'about'
								? await redditApiRequest.call(this, 'GET', endpoint, {})
								: await handleListing.call(this, i, endpoint);

						if (details === 'about') {
							responseData = responseData.data;
						}
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
