import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';

import { directMessageOperations, directMessageFields } from './DirectMessageDescription';
import { listOperations, listFields } from './ListDescription';
import { tweetFields, tweetOperations } from './TweetDescription';
import { userOperations, userFields } from './UserDescription';

import ISO6391 from 'iso-639-1';
import { twitterApiRequest } from './GenericFunctions';

export class TwitterV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDecription: INodeTypeBaseDescription) {
		this.description = {
			...baseDecription,
			version: 2,
			description:
				'Post, like, and search tweets, send messages, search users, and add users to lists',
			subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
			defaults: {
				name: 'Twitter',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'twitterOAuth2Api',
					required: true,
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
							name: 'Direct Message',
							value: 'directMessage',
							description: 'Send a direct message to a user',
						},
						{
							name: 'List',
							value: 'list',
							description: 'Add a user to a list',
						},
						{
							name: 'Tweet',
							value: 'tweet',
							description: 'Create, like, search, or delete a Tweet',
						},
						{
							name: 'User',
							value: 'user',
							description: 'Search users by username',
						},
					],
					default: 'tweet',
				},
				// DIRECT MESSAGE
				...directMessageOperations,
				...directMessageFields,
				// LIST
				...listOperations,
				...listFields,
				// TWEET
				...tweetOperations,
				...tweetFields,
				// USER
				...userOperations,
				...userFields,
			],
		};
	}

	methods = {
		loadOptions: {
			// Get all the available languages to display them to user so that they can
			// select them easily
			async getLanguages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const languages = ISO6391.getAllNames();
				for (const language of languages) {
					const languageName = language;
					const languageId = ISO6391.getCode(language);
					returnData.push({
						name: languageName,
						value: languageId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'user') {
					if (operation === 'searchUser') {
						const me = this.getNodeParameter('me', i, false) as boolean;
						if (me) {
							responseData = await twitterApiRequest.call(this, 'GET', '/users/me', {});
						} else {
							const user = this.getNodeParameter('user', i, undefined, { extractValue: true });
							responseData = await twitterApiRequest.call(
								this,
								'GET',
								`/users/by/username/${user}`,
								{},
							);
						}
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = {
						json: {
							error: (error as JsonObject).message,
						},
					};
					returnData.push(executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
