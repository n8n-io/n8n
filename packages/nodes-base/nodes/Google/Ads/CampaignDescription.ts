import { IDataObject } from 'n8n-workflow';
import {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

export const campaignOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['campaign'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many campaigns linked to the specified account',
				routing: {
					request: {
						method: 'POST',
						url: '={{"/v9/customers/" + $parameter["clientCustomerId"].toString().replace(/-/g, "")  + "/googleAds:search"}}',
						body: {
							query:
								'={{ "' +
								'select ' +
								'campaign.id, ' +
								'campaign.name, ' +
								'campaign_budget.amount_micros, ' +
								'campaign_budget.period,' +
								'campaign.status,' +
								'campaign.optimization_score,' +
								'campaign.advertising_channel_type,' +
								'campaign.advertising_channel_sub_type,' +
								'metrics.impressions,' +
								'metrics.interactions,' +
								'metrics.interaction_rate,' +
								'metrics.average_cost,' +
								'metrics.cost_micros,' +
								'metrics.conversions,' +
								'metrics.cost_per_conversion,' +
								'metrics.conversions_from_interactions_rate,' +
								'metrics.video_views,' +
								'metrics.average_cpm,' +
								'metrics.ctr ' +
								'from campaign ' +
								'where campaign.id > 0 ' + // create a dummy where clause so we can append more conditions
								'" + (["allTime", undefined, ""].includes($parameter.additionalOptions?.dateRange) ? "" : " and segments.date DURING " + $parameter.additionalOptions.dateRange) + " ' +
								'" + (["all", undefined, ""].includes($parameter.additionalOptions?.campaignStatus) ? "" : " and campaign.status = \'" + $parameter.additionalOptions.campaignStatus + "\'") + "' +
								'" }}',
						},
						headers: {
							'login-customer-id':
								'={{$parameter["managerCustomerId"].toString().replace(/-/g, "")}}',
						},
					},
					output: {
						postReceive: [processCampaignSearchResponse],
					},
				},
				action: 'Get many campaigns',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific campaign',
				routing: {
					request: {
						method: 'POST',
						url: '={{"/v9/customers/" + $parameter["clientCustomerId"].toString().replace(/-/g, "") + "/googleAds:search"}}',
						returnFullResponse: true,
						body: {
							query:
								'={{ "' +
								'select ' +
								'campaign.id, ' +
								'campaign.name, ' +
								'campaign_budget.amount_micros, ' +
								'campaign_budget.period,' +
								'campaign.status,' +
								'campaign.optimization_score,' +
								'campaign.advertising_channel_type,' +
								'campaign.advertising_channel_sub_type,' +
								'metrics.impressions,' +
								'metrics.interactions,' +
								'metrics.interaction_rate,' +
								'metrics.average_cost,' +
								'metrics.cost_micros,' +
								'metrics.conversions,' +
								'metrics.cost_per_conversion,' +
								'metrics.conversions_from_interactions_rate,' +
								'metrics.video_views,' +
								'metrics.average_cpm,' +
								'metrics.ctr ' +
								'from campaign ' +
								'where campaign.id = " + $parameter["campaignId"].toString().replace(/-/g, "")' +
								'}}',
						},
						headers: {
							'login-customer-id':
								'={{$parameter["managerCustomerId"].toString().replace(/-/g, "")}}',
							'content-type': 'application/x-www-form-urlencoded',
						},
					},
					output: {
						postReceive: [processCampaignSearchResponse],
					},
				},
				action: 'Get a campaign',
			},
		],
		default: 'getAll',
	},
];

export const campaignFields: INodeProperties[] = [
	{
		displayName: 'Manager Customer ID',
		name: 'managerCustomerId',
		type: 'string',
		required: true,
		placeholder: '9998887777',
		displayOptions: {
			show: {
				resource: ['campaign'],
			},
		},
		default: '',
	},
	{
		displayName: 'Client Customer ID',
		name: 'clientCustomerId',
		type: 'string',
		required: true,
		placeholder: '6665554444',
		displayOptions: {
			show: {
				resource: ['campaign'],
			},
		},
		default: '',
	},
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['campaign'],
			},
		},
		default: '',
		description: 'ID of the campaign',
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['getAll'],
			},
		},
		default: {},
		description: 'Additional options for fetching campaigns',
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Date Range',
				name: 'dateRange',
				description: 'Filters statistics by period',
				type: 'options',
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'All Time',
						value: 'allTime',
						description: 'Fetch statistics for all period',
					},
					{
						name: 'Today',
						value: 'TODAY',
						description: 'Today only',
					},
					{
						name: 'Yesterday',
						value: 'YESTERDAY',
						description: 'Yesterday only',
					},
					{
						name: 'Last 7 Days',
						value: 'LAST_7_DAYS',
						description: 'Last 7 days, not including today',
					},
					{
						name: 'Last Business Week',
						value: 'LAST_BUSINESS_WEEK',
						description:
							'The 5 day business week, Monday through Friday, of the previous business week',
					},
					{
						name: 'This Month',
						value: 'THIS_MONTH',
						description: 'All days in the current month',
					},
					{
						name: 'Last Month',
						value: 'LAST_MONTH',
						description: 'All days in the previous month',
					},
					{
						name: 'Last 14 Days',
						value: 'LAST_14_DAYS',
						description: 'The last 14 days not including today',
					},
					{
						name: 'Last 30 Days',
						value: 'LAST_30_DAYS',
						description: 'The last 30 days not including today',
					},
				],
				default: 'allTime',
			},
			{
				displayName: 'Show Campaigns by Status',
				name: 'campaignStatus',
				description: 'Filters campaigns by status',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'all',
						description: 'Fetch all campaigns regardless of status',
					},
					{
						name: 'Enabled',
						value: 'ENABLED',
						description: 'Filter only active campaigns',
					},
					{
						name: 'Paused',
						value: 'PAUSED',
						description: 'Filter only paused campaigns',
					},
					{
						name: 'Removed',
						value: 'REMOVED',
						description: 'Filter only removed campaigns',
					},
				],
				default: 'all',
			},
		],
	},
];

function processCampaignSearchResponse(
	this: IExecuteSingleFunctions,
	_inputData: INodeExecutionData[],
	responseData: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const results = (responseData.body as IDataObject).results as GoogleAdsCampaignElement;

	return Promise.resolve(
		results.map((result) => {
			return {
				json: {
					...result.campaign,
					...result.metrics,
					...result.campaignBudget,
				},
			};
		}),
	);
}

type GoogleAdsCampaignElement = [
	{
		campaign: object;
		metrics: object;
		campaignBudget: object;
	},
];
