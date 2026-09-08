import type { INodeProperties } from 'n8n-workflow';

export const metricOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['metric'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description:
					'Retrieve financial metric broken down by day for either the current month or the last',
				action: 'Get a metric',
			},
		],
		default: 'get',
	},
];

export const metricFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                metric:get                                  */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{
				name: 'Daily',
				value: 'daily',
				description:
					'Retrieve financial metric broken down by day for either the current month or the last',
			},
			{
				name: 'Monthly',
				value: 'monthly',
				description: 'Retrieve all monthly financial metric for your company',
			},
		],
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['metric'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Month',
		name: 'month',
		type: 'string',
		default: '',
		placeholder: 'YYYY-MM',
		required: true,
		displayOptions: {
			show: {
				resource: ['metric'],
				operation: ['get'],
				type: ['daily'],
			},
		},
		description: 'Can only be the current or previous month. Format should be YYYY-MM.',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['metric'],
				operation: ['get'],
			},
		},
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		displayOptions: {
			show: {
				resource: ['metric'],
				operation: ['get'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Plan name or ID',
				name: 'plan_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPlanIds',
				},
				default: '',
				description:
					'Only return the metric for this Plan ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Metrics',
				name: 'dailyMetrics',
				type: 'multiOptions',
				displayOptions: {
					show: {
						'/type': ['daily'],
					},
				},
				options: [
					{
						name: 'Active customers',
						value: 'active_customers',
						description: 'Number of paying customers',
					},
					{
						name: 'Churned customers',
						value: 'churned_customers',
						description: 'Number of paying customers who churned',
					},
					{
						name: 'Churned recurring revenue',
						value: 'churned_recurring_revenue',
						description: 'MRR lost to churn (voluntary and delinquent)',
					},
					{
						name: 'Cumulative net new MRR',
						value: 'cumulative_net_new_mrr',
						description:
							'New + Upgrades - Downgrades - Churn MRR, cumulative for the month up through the given day',
					},
					{
						name: 'Cumulative new trialing customers',
						value: 'cumulative_new_trialing_customers',
						description:
							'Number of new trialing customers, cumulative for the month up through the given day',
					},
					{
						name: 'Downgraded customers',
						value: 'downgraded_customers',
						description: 'Number of existing customers who net downgraded',
					},
					{
						name: 'Downgraded recurring revenue',
						value: 'downgraded_recurring_revenue',
						description: 'How much downgrades and plan length decreases affect your MRR',
					},
					{
						name: 'Future churn MRR',
						value: 'future_churn_mrr',
						description:
							'MRR that will be lost when users who are currently cancelled actually churn',
					},
					{
						name: 'New customers',
						value: 'new_customers',
						description: 'Number of new, paying customers you have',
					},
					{
						name: 'New recurring revenue',
						value: 'new_recurring_revenue',
						description: 'MRR from new users',
					},
					{
						name: 'Reactivated customers',
						value: 'reactivated_customers',
						description: 'Number of customers who have reactivated',
					},
					{
						name: 'Reactivated recurring revenue',
						value: 'reactivated_recurring_revenue',
						description: 'How much MRR comes from reactivated customers',
					},
					{
						name: 'Recurring revenue',
						value: 'recurring_revenue',
						description: "Your company's MRR",
					},
					{
						name: 'Upgraded customers',
						value: 'upgraded_customers',
						description: 'Number of existing customers who net upgraded',
					},
					{
						name: 'Upgraded recurring revenue',
						value: 'upgraded_recurring_revenue',
						description: 'How much upgrades and plan length increases affect your MRR',
					},
				],
				default: [],
				description:
					'Comma-separated list of metric trends to return (the default is to return all metric)',
			},
			{
				displayName: 'Metrics',
				name: 'monthlyMetrics',
				type: 'multiOptions',
				displayOptions: {
					show: {
						'/type': ['monthly'],
					},
				},
				options: [
					{
						name: 'Active customers',
						value: 'active_customers',
						description: 'Number of paying customers',
					},
					{
						name: 'Active trialing customers',
						value: 'active_trialing_customers',
						description: 'Number of trialing customers',
					},
					{
						name: 'Average revenue per user',
						value: 'average_revenue_per_user',
						description: 'ARPU',
					},
					{
						name: 'Churned customers',
						value: 'churned_customers',
						description: 'Number of paying customers who churned',
					},
					{
						name: 'Churned customers cancellations',
						value: 'churned_customers_cancellations',
						description: 'Number of customers who churned by cancelling their subscription(s)',
					},
					{
						name: 'Churned customers delinquent',
						value: 'churned_customers_delinquent',
						description: 'Number of customers who churned because they failed to pay you',
					},
					{
						name: 'Churned recurring revenue',
						value: 'churned_recurring_revenue',
						description: 'Revenue lost to churn (voluntary and delinquent)',
					},
					{
						name: 'Churned recurring revenue cancellations',
						value: 'churned_recurring_revenue_cancellations',
						description:
							'Revenue lost to customers who churned by cancelling their subscription(s)',
					},
					{
						name: 'Churned recurring revenue delinquent',
						value: 'churned_recurring_revenue_delinquent',
						description: 'Revenue lost to customers who churned delinquent',
					},
					{
						name: 'Churned trialing customers',
						value: 'churned_trialing_customers',
						description: 'Number of trialling customers who churned',
					},
					{
						name: 'Converted customers',
						value: 'converted_customers',
						description: 'Number of customers who converted from trialing to active',
					},
					{
						name: 'Converted recurring revenue',
						value: 'converted_recurring_revenue',
						description: 'How much MRR comes from users who converted from trialing to active',
					},
					{
						name: 'Customer churn cancellations rate',
						value: 'customers_churn_cancellations_rate',
						description:
							'Percentage of paying customers who churned by cancelling their subscription(s)',
					},
					{
						name: 'Customer churn delinquent rate',
						value: 'customers_churn_delinquent_rate',
						description:
							'Percentage of paying customers who churned because they failed to pay you',
					},
					{
						name: 'Customer churn rate',
						value: 'customers_churn_rate',
						description: 'Percentage of paying customers who churned',
					},
					{
						name: 'Customer conversion rate',
						value: 'customer_conversion_rate',
						description: 'Percent of trialing customers who converted',
					},
					{
						name: 'Customer retention rate',
						value: 'customers_retention_rate',
						description: 'Percent of customers active last month who are still active this month',
					},
					{
						name: 'Downgrade customers',
						value: 'downgraded_customers',
						description: 'Number of existing customers who net downgraded',
					},
					{
						name: 'Downgrade rate',
						value: 'downgrade_rate',
						description: 'Downgrade revenue as a percent of existing revenue',
					},
					{
						name: 'Downgrade recurring revenue',
						value: 'downgraded_recurring_revenue',
						description: 'How much downgrades and plan length decreases affect your MRR',
					},
					{
						name: 'Existing customers',
						value: 'existing_customers',
						description: 'Number of paying customers you had at the start of the given month',
					},
					{
						name: 'Existing recurring revenue',
						value: 'existing_recurring_revenue',
						description: "Your company's MRR at the start of the given month",
					},
					{
						name: 'Existing trialing customers',
						value: 'existing_trialing_customers',
						description: 'Number of trialing customers who existed at the start of the month',
					},
					{
						name: 'Growth_Rate',
						value: 'growth_rate',
						description: "Rate at which your company's MRR has grown over the previous month",
					},
					{
						name: 'Lifetime value',
						value: 'lifetime_value',
						description: 'Average LTV, as calculated at the end of the given period',
					},
					{
						name: 'New customers',
						value: 'new_customers',
						description: 'Number of new, paying customers you have',
					},
					{
						name: 'New recurring revenue',
						value: 'new_recurring_revenue',
						description: 'MRR from new users',
					},
					{
						name: 'New trailing customers',
						value: 'new_trialing_customers',
						description: 'Number of new trialing customers',
					},
					{
						name: 'Plan changed rate',
						value: 'plan_change_rate',
						description: 'Net change in revenue as a percentage of existing revenue',
					},
					{
						name: 'Plan changed recurring revenue',
						value: 'plan_changed_recurring_revenue',
						description: 'Net change in revenue for this plan',
					},
					{
						name: 'Reactivated customers',
						value: 'reactivated_customers',
						description: 'Number of customers who have reactivated',
					},
					{
						name: 'Reactivated recurring revenue',
						value: 'reactivated_recurring_revenue',
						description: 'How much MRR comes from reactivated customers',
					},
					{
						name: 'Recurring revenue',
						value: 'recurring_revenue',
						description: "Your company's MRR",
					},
					{
						name: 'Revenue churn cancellations rate',
						value: 'revenue_churn_cancellations_rate',
						description: "Voluntary churn revenue as a percent of the month's starting revenue",
					},
					{
						name: 'Revenue Churn Delinquent_ Rate',
						value: 'revenue_churn_delinquent_rate',
						description: "Delinquent churn revenue as a percent of the month's starting revenue",
					},
					{
						name: 'Revenue churn rate',
						value: 'revenue_churn_rate',
						description: 'Revenue lost to churn as a percentage of existing revenue',
					},
					{
						name: 'Revenue retention rate',
						value: 'revenue_retention_rate',
						description:
							'Percent of revenue coming from existing customers that was retained by the end of the month',
					},
					{
						name: 'Upgrade rate',
						value: 'upgrade_rate',
						description: 'Upgrade revenue as a percent of existing revenue',
					},
					{
						name: 'Upgraded customers',
						value: 'upgraded_customers',
						description: 'Number of existing customers who net upgraded',
					},
					{
						name: 'Upgraded recurring revenue',
						value: 'upgraded_recurring_revenue',
						description: 'How much upgrades and plan length increases affect your MRR',
					},
				],
				default: [],
				description:
					'Comma-separated list of metric trends to return (the default is to return all metric)',
			},
		],
	},
];
