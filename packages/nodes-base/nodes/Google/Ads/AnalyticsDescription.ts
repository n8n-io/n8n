import {
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties
} from 'n8n-workflow';

export const analyticsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'analytics',
				],
			},
		},
		options: [
			{
				name: 'Get Analytics for campaign',
				value: 'getAnalyticsForCampaign',
				description: 'Returns analytics regarding a campaign.',
				routing: {
					request: {
						method: 'POST',
						url: '={{"/v9/customers/" + $parameter["clientCustomerId"].toString().replace(/-/g, "") + "/googleAds:search"}}',
						body: {
							query: '={{ "SELECT metrics.average_cost, metrics.average_page_views, metrics.active_view_ctr, metrics.active_view_cpm, metrics.clicks, metrics.content_impression_share, metrics.impressions, campaign.id FROM campaign where segments.date DURING LAST_30_DAYS and campaign.id = " + $parameter["campaignId"] + (["allTime", undefined, ""].includes($parameter.additionalOptions?.dateRange) ? "" : " and segments.date DURING " + $parameter.additionalOptions.dateRange) }}',
						},
						headers: {
							'login-customer-id': '={{$parameter["managerCustomerId"].toString().replace(/-/g, "")}}',
							'content-type': 'application/x-www-form-urlencoded',
						},
					},
					output: {
						postReceive: [
							// @ts-ignore
							function(
								this: IExecuteSingleFunctions,
								_items: INodeExecutionData[],
								response: GoogleAdsAnalyticsResponse,
							): INodeExecutionData[] {
								return response.body.results.map((campaignMetric) => {
									return {
										json: {
											id: campaignMetric.campaign.id,
											...campaignMetric.metrics,
										},
									};
								});
							},
						],
					},
				},
			},
			{
				name: 'Get Analytics for all campaigns',
				value: 'getAnalytics',
				description: 'Returns analytics regarding all campaigns.',
				routing: {
					request: {
						method: 'POST',
						url: '={{"/v9/customers/" + $parameter["clientCustomerId"].toString().replace(/-/g, "") + "/googleAds:search"}}',
						body: {
							query: '={{ "SELECT metrics.average_cost, metrics.average_page_views, metrics.active_view_ctr, metrics.active_view_cpm, metrics.clicks, metrics.content_impression_share, metrics.impressions, campaign.id FROM campaign" + (["allTime", undefined, ""].includes($parameter.additionalOptions?.dateRange) ? "" : " where segments.date DURING " + $parameter.additionalOptions.dateRange) }}',
						},
						headers: {
							'login-customer-id': '={{$parameter["managerCustomerId"].toString().replace(/-/g, "")}}',
							'content-type': 'application/x-www-form-urlencoded',
						},
					},
					output: {
						postReceive: [
							// @ts-ignore
							function(
								this: IExecuteSingleFunctions,
								_items: INodeExecutionData[],
								response: GoogleAdsAnalyticsResponse,
							): INodeExecutionData[] {
								return response.body.results.map((campaignMetric) => {
									return {
										json: {
											id: campaignMetric.campaign.id,
											...campaignMetric.metrics,
										},
									};
								});
							},
						],
					},
				},
			},
		],
		default: 'getAnalyticsForCampaign',
		description: 'The operation to perform.',
	},
];

export const analyticsFields: INodeProperties[] = [
	{
		displayName: 'Manager Customer ID',
		name: 'managerCustomerId',
		type: 'string',
		required: true,
		placeholder: '9998887777',
		displayOptions: {
			show: {
				resource: [
					'analytics',
				],
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
				resource: [
					'analytics',
				],
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
				resource: [
					'analytics',
				],
				operation: [
					'getAnalyticsForCampaign',
				],
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
				resource: [
					'analytics',
				],
			},
		},
		default: {},
		description: 'Additional options for analytics reports',
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Date range',
				name: 'dateRange',
				description: 'Filters statistics by period',
				type: 'options',
				options: [
					{
						name: 'All time',
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
						name: 'Last 7 days',
						value: 'LAST_7_DAYS',
						description: 'Last 7 days, not including today',
					},
					{
						name: 'Last business week',
						value: 'LAST_BUSINESS_WEEK',
						description: 'The 5 day business week, Monday through Friday, of the previous business week',
					},
					{
						name: 'This month',
						value: 'THIS_MONTH',
						description: 'All days in the current month.',
					},
					{
						name: 'Last month',
						value: 'LAST_MONTH',
						description: 'All days in the previous month',
					},
					{
						name: 'Last 14 days',
						value: 'LAST_14_DAYS',
						description: 'The last 14 days not including today',
					},
					{
						name: 'Last 30 days',
						value: 'LAST_30_DAYS',
						description: 'The last 30 days not including today',
					},
				],
				default: 'allTime',
			},
		],
	},
];

type GoogleAdsAnalyticsResponse = IN8nHttpFullResponse & {
	body: {
		results: Array<{ campaign: {id: number}, metrics: IDataObject }>
	}
};

