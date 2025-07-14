import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { searchAccounts, searchLocations, searchPosts, searchReviews } from './GenericFunctions';
import { postFields, postOperations } from './PostDescription';
import { reviewFields, reviewOperations } from './ReviewDescription';

export class GoogleBusinessProfile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Business Profile',
		name: 'googleBusinessProfile',
		icon: 'file:googleBusinessProfile.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google Business Profile API',
		defaults: {
			name: 'Google Business Profile',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		hints: [
			{
				message: 'Please select a parameter in the options to modify the post',
				displayCondition:
					'={{$parameter["resource"] === "post" && $parameter["operation"] === "update" && Object.keys($parameter["additionalOptions"]).length === 0}}',
				whenToDisplay: 'always',
				location: 'outputPane',
				type: 'warning',
			},
		],
		credentials: [
			{
				name: 'googleBusinessProfileOAuth2Api',
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
		listSearch: {
			searchAccounts,
			searchLocations,
			searchReviews,
			searchPosts,
		},
	};
}
