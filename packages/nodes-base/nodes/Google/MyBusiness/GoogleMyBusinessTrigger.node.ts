import {
	NodeApiError,
	NodeConnectionType,
	type IPollFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type INodeListSearchItems,
	type INodeListSearchResult,
	NodeOperationError,
} from 'n8n-workflow';
import { googleApiRequest } from './GenericFunctions';

export class GoogleMyBusinessTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google My Business Trigger',
		name: 'googleMyBusinessTrigger',
		icon: 'file:googleMyBusines.svg',
		group: ['trigger'],
		version: 1,
		description:
			'Fetches reviews from Google My Business and starts the workflow on specified polling intervals.',
		subtitle: '={{"Google My Business Trigger"}}',
		defaults: {
			name: 'Google My Business Trigger',
		},
		credentials: [
			{
				name: 'googleMyBusinessOAuth2Api',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				required: true,
				type: 'options',
				noDataExpression: true,
				default: 'reviewAdded',
				options: [
					{
						name: 'Review Added',
						value: 'reviewAdded',
					},
				],
			},
			{
				displayName: 'Account',
				name: 'account',
				required: true,
				type: 'resourceLocator',
				default: '',
				description: 'The Google My Business account name',
				displayOptions: { show: { event: ['reviewAdded'] } },
				modes: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						hint: 'Enter the account name',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: 'accounts/[0-9]+',
									errorMessage: 'The name must start with "accounts/"',
								},
							},
						],
						placeholder: 'accounts/012345678901234567890',
					},
					{
						displayName: 'List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchAccounts',
							searchable: true,
						},
					},
				],
			},
			{
				displayName: 'Location',
				name: 'location',
				required: true,
				type: 'resourceLocator',
				default: '',
				description: 'The specific location or business associated with the account',
				displayOptions: { show: { event: ['reviewAdded'] } },
				modes: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						hint: 'Enter the location name',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: 'locations/[0-9]+',
									errorMessage: 'The name must start with "locations/"',
								},
							},
						],
						placeholder: 'locations/012345678901234567',
					},
					{
						displayName: 'List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchLocations',
							searchable: true,
						},
					},
				],
			},
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
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		if (this.getMode() === 'manual') {
			throw new NodeOperationError(
				this.getNode(),
				'This trigger node is meant to be used only for pooling and does not support manual executions.',
			);
		}

		const nodeStaticData = this.getWorkflowStaticData('node');
		let responseData;

		// const event = this.getNodeParameter('event') as string; // Currently there is only one event
		const account = (this.getNodeParameter('account') as { value: string; mode: string }).value;
		const location = (this.getNodeParameter('location') as { value: string; mode: string }).value;

		try {
			responseData = (await googleApiRequest.call(
				this,
				'GET',
				`/${account}/${location}/reviews`,
				{},
				{
					pageSize: 50, // Maximal page size for this endpoint
				},
			)) as { reviews: IDataObject[]; totalReviewCount: number; nextPageToken?: string };

			// During the first execution there is no delta
			if (!nodeStaticData.totalReviewCountLastTimeChecked) {
				nodeStaticData.totalReviewCountLastTimeChecked = responseData.totalReviewCount;
				return null;
			}

			// When count did't change the node shouldn't trigger
			if (
				!responseData?.reviews?.length ||
				nodeStaticData?.totalReviewCountLastTimeChecked === responseData?.totalReviewCount
			) {
				return null;
			}

			const numNewReviews =
				// @ts-ignore
				responseData.totalReviewCount - nodeStaticData.totalReviewCountLastTimeChecked;
			nodeStaticData.totalReviewCountLastTimeChecked = responseData.totalReviewCount;

			// By default the reviews will be sorted by updateTime in descending order
			// Return only the delta reviews since last pooling
			responseData = responseData.reviews.slice(0, numNewReviews);

			if (Array.isArray(responseData) && responseData.length) {
				return [this.helpers.returnJsonArray(responseData)];
			}

			return null;
		} catch (error) {
			throw new NodeApiError(this.getNode(), error);
		}
	}
}
