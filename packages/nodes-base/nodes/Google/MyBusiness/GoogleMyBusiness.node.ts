import {
	NodeConnectionType,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeListSearchItems,
	type INodeListSearchResult,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { postFields, postOperations } from './PostDescription';
import { reviewFields, reviewOperations } from './ReviewDescription';
import { googleApiRequest } from './GenericFunctions';

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
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
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
		listSearch: {
			// Docs can be found here:
			// https://developers.google.com/my-business/reference/accountmanagement/rest/v1/accounts/list
			async searchAccounts(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const query: IDataObject = {};
				if (paginationToken) {
					query.pageToken = paginationToken;
				}

				const responseData: IDataObject = await googleApiRequest.call(
					this,
					'GET',
					'',
					{},
					{
						pageSize: 20,
						...query,
					},
					'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
				);

				const accounts = responseData.accounts as Array<{ name: string }>;

				const results: INodeListSearchItems[] = accounts
					.map((a) => ({
						name: a.name,
						value: a.name,
					}))
					.filter((a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()))
					.sort((a, b) => {
						if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
						if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
						return 0;
					});

				return { results, paginationToken: responseData.nextPageToken };
			},
			// Docs can be found here:
			// https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list
			async searchLocations(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const query: IDataObject = {};
				if (paginationToken) {
					query.pageToken = paginationToken;
				}

				const account = (this.getNodeParameter('account') as IDataObject).value as string;

				const responseData: IDataObject = await googleApiRequest.call(
					this,
					'GET',
					'',
					{},
					{
						readMask: 'name',
						pageSize: 100,
						...query,
					},
					`https://mybusinessbusinessinformation.googleapis.com/v1/${account}/locations`,
				);

				const locations = responseData.locations as Array<{ name: string }>;

				const results: INodeListSearchItems[] = locations
					.map((a) => ({
						name: a.name,
						value: a.name,
					}))
					.filter((a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()))
					.sort((a, b) => {
						if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
						if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
						return 0;
					});

				return { results, paginationToken: responseData.nextPageToken };
			},
			async searchReviews(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const query: IDataObject = {};
				if (paginationToken) {
					query.pageToken = paginationToken;
				}

				const account = (this.getNodeParameter('account') as IDataObject).value as string;
				const location = (this.getNodeParameter('location') as IDataObject).value as string;

				const responseData: IDataObject = await googleApiRequest.call(
					this,
					'GET',
					`/${account}/${location}/reviews`,
					{},
					{
						pageSize: 50,
						...query,
					},
				);

				const reviews = responseData.reviews as Array<{ name: string }>;

				const results: INodeListSearchItems[] = reviews
					.map((a) => ({
						name: a.name,
						value: a.name,
					}))
					.filter((a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()))
					.sort((a, b) => {
						if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
						if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
						return 0;
					});

				return { results, paginationToken: responseData.nextPageToken };
			},
			async searchPosts(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const query: IDataObject = {};
				if (paginationToken) {
					query.pageToken = paginationToken;
				}

				const account = (this.getNodeParameter('account') as IDataObject).value as string;
				const location = (this.getNodeParameter('location') as IDataObject).value as string;

				const responseData: IDataObject = await googleApiRequest.call(
					this,
					'GET',
					`/${account}/${location}/localPosts`,
					{},
					{
						pageSize: 100,
						...query,
					},
				);

				const localPosts = responseData.localPosts as Array<{ name: string }>;

				const results: INodeListSearchItems[] = localPosts
					.map((a) => ({
						name: a.name,
						value: a.name,
					}))
					.filter((a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()))
					.sort((a, b) => {
						if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
						if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
						return 0;
					});

				return { results, paginationToken: responseData.nextPageToken };
			},
		},
	};
}
