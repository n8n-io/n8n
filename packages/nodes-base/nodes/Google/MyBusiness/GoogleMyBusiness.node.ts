import type {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { postFields, postOperations } from './PostDescription';
import { reviewFields, reviewOperations } from './ReviewDescription';
import { googleApiRequestAllItems } from './GenericFunctions';

export class GoogleMyBusiness implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google My Business',
		name: 'googleMyBusiness',
		icon: 'file:googleMyBusines.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google My Business API',
		defaults: {
			name: 'Google My Business',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleMyBusinessOAuth2Api',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://mybusiness.googleapis.com/v4',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
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
						name: 'Review',
						value: 'review',
					},
				],
				default: 'post',
			},
			...postOperations,
			...postFields,
			...reviewOperations,
			...reviewFields,
		],
	};

	methods = {
		loadOptions: {
			async getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const accounts = await googleApiRequestAllItems.call(
					this,
					'accounts',
					'GET',
					'',
					{},
					{},
					100,
					'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
				);
				for (const account of accounts) {
					returnData.push({
						name: account.name as string,
						value: account.name as string,
					});
				}
				return returnData;
			},
			async getLocations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const account = this.getNodeParameter('account') as string;
				const locations = await googleApiRequestAllItems.call(
					this,
					'locations',
					'GET',
					'',
					{},
					{},
					100,
					`https://mybusinessaccountmanagement.googleapis.com/v1/${account}/locations`,
				);
				for (const location of locations) {
					returnData.push({
						name: location.name as string,
						value: location.name as string,
					});
				}
				return returnData;
			},
			async getPosts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const account = this.getNodeParameter('account') as string;
				const location = this.getNodeParameter('location') as string;
				const posts = await googleApiRequestAllItems.call(
					this,
					'localPosts',
					'GET',
					`/${account}/${location}/localPosts`,
				);
				for (const post of posts) {
					returnData.push({
						name: post.name as string,
						value: post.name as string,
					});
				}
				return returnData;
			},
			async getReviews(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const account = this.getNodeParameter('account') as string;
				const location = this.getNodeParameter('location') as string;
				const reviews = await googleApiRequestAllItems.call(
					this,
					'reviews',
					'GET',
					`/${account}/${location}/reviews`,
					{},
					{},
					50,
				);
				for (const review of reviews) {
					returnData.push({
						name: review.name as string,
						value: review.name as string,
					});
				}
				return returnData;
			},
		},
	};
}
