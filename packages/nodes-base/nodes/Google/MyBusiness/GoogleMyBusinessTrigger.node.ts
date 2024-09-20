import {
	NodeApiError,
	NodeConnectionType,
	type IPollFunctions,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { googleApiRequest, searchAccounts, searchLocations } from './GenericFunctions';

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
				description: 'The Google My Business account',
				displayOptions: { show: { event: ['reviewAdded'] } },
				modes: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						hint: 'Enter the account ID',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: 'accounts/[0-9]+',
									errorMessage: 'The ID must start with "accounts/"',
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
						displayName: 'ID',
						name: 'is',
						type: 'string',
						hint: 'Enter the location ID',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: 'locations/[0-9]+',
									errorMessage: 'The ID must start with "locations/"',
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
			searchAccounts,
			searchLocations,
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
