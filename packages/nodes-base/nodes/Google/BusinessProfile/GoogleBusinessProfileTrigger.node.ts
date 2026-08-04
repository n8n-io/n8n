import {
	NodeApiError,
	NodeConnectionTypes,
	type IPollFunctions,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { googleApiRequest, searchAccounts, searchLocations } from './GenericFunctions';

export class GoogleBusinessProfileTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Business Profile Trigger',
		name: 'googleBusinessProfileTrigger',
		icon: 'file:googleBusinessProfile.svg',
		group: ['trigger'],
		version: 1,
		description:
			'Fetches reviews from Google Business Profile and starts the workflow on specified polling intervals.',
		subtitle: '={{"Google Business Profile Trigger"}}',
		defaults: {
			name: 'Google Business Profile Trigger',
		},
		credentials: [
			{
				name: 'googleBusinessProfileOAuth2Api',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
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
				default: { mode: 'list', value: '' },
				description: 'The Google Business Profile account',
				displayOptions: { show: { event: ['reviewAdded'] } },
				modes: [
					{
						displayName: 'From list',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchAccounts',
							searchable: true,
						},
					},
					{
						displayName: 'By name',
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
						placeholder: 'e.g. accounts/0123456789',
					},
				],
			},
			{
				displayName: 'Location',
				name: 'location',
				required: true,
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				description: 'The specific location or business associated with the account',
				displayOptions: { show: { event: ['reviewAdded'] } },
				modes: [
					{
						displayName: 'From list',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchLocations',
							searchable: true,
						},
					},
					{
						displayName: 'By name',
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
						placeholder: 'e.g. locations/0123456789',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			searchAccounts,
			searchLocations,
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const nodeStaticData = this.getWorkflowStaticData('node');
		let responseData;
		const qs: IDataObject = {};

		const account = (this.getNodeParameter('account') as { value: string; mode: string }).value;
		const location = (this.getNodeParameter('location') as { value: string; mode: string }).value;

		const manualMode = this.getMode() === 'manual';
		if (manualMode) {
			qs.pageSize = 1; // In manual mode we only want to fetch the latest review
		} else {
			qs.pageSize = 50; // Maximal page size for the get reviews endpoint
		}

		try {
			responseData = (await googleApiRequest.call(
				this,
				'GET',
				`/${account}/${location}/reviews`,
				{},
				qs,
			)) as { reviews: IDataObject[]; totalReviewCount: number; nextPageToken?: string };

			if (manualMode) {
				responseData = responseData.reviews;
			} else {
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
			}

			if (Array.isArray(responseData) && responseData.length) {
				return [this.helpers.returnJsonArray(responseData)];
			}

			return null;
		} catch (error) {
			throw new NodeApiError(this.getNode(), error);
		}
	}
}
