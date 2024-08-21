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
		// ToDo: Test the requests
		requestDefaults: {
			baseURL: 'https://mybusiness.googleapis.com/v4',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: '={{"Bearer " + $credentials.accessToken}}',
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
		// ToDo: Test the loadOptions functions
		loadOptions: {
			async getPosts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const account = this.getNodeParameter('account');
				const location = this.getNodeParameter('location');
				const posts = await googleApiRequestAllItems.call(
					this,
					'localPosts',
					'GET',
					`/${account}/${location}/localPosts`,
				);
				for (const post of posts) {
					returnData.push({
						name: post.name,
						value: post.name,
					});
				}
				return returnData;
			},
			async getReviews(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const account = this.getNodeParameter('account');
				const location = this.getNodeParameter('location');
				const reviews = await googleApiRequestAllItems.call(
					this,
					'reviews',
					'GET',
					`/${account}/${location}/reviews`,
				);
				for (const review of reviews) {
					returnData.push({
						name: review.name,
						value: review.name,
					});
				}
				return returnData;
			},
		},
	};
}
