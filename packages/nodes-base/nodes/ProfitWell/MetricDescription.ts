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
				displayName: 'Plan Name or ID',
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
						name: 'Active Customers',
						value: 'active_customers',
						description: 'Number of paying customers',
					},
					{
						name: 'Churned Customers',
						value: 'churned_customers',
						description: 'Number of paying customers who churned',
					},
					{
						name: 'Churned Recurring Revenue',
						value: 'churned_recurring_revenue',
						description: 'MRR lost to churn (voluntary and delinquent)',
					},
					{
						name: 'Cumulative Net New MRR',
						value: 'cumulative_net_new_mrr',
						description:
							'New + Upgrades - Downgrades - Churn MRR, cumulative for the month up through the given day',
					},
					{
						name: 'Cumulative New Trialing Customers',
						value: 'cumulative_new_trialing_customers',
						description:
							'Number of new trialing customers, cumulative for the month up through the given day',
					},
					{
						name: 'Downgraded Customers',
						value: 'downgraded_customers',
						description: 'Number of existing customers who net downgraded',
					},
					{
						name: 'Downgraded Recurring Revenue',
						value: 'downgraded_recurring_revenue',
						description: 'How much downgrades and plan length decreases affect your MRR',
					},
					{
						name: 'Future Churn MRR',
						value: 'future_churn_mrr',
						description:
							'MRR that will be lost when users who are currently cancelled actually churn',
					},
					{
						name: 'New Customers',
						value: 'new_customers',
						description: 'Number of new, paying customers you have',
					},
					{
						name: 'New Recurring Revenue',
						value: 'new_recurring_revenue',
						description: 'MRR from new users',
					},
					{
						name: 'Reactivated Customers',
						value: 'reactivated_customers',
						description: 'Number of customers who have reactivated',
					},
					{
						name: 'Reactivated Recurring Revenue',
						value: 'reactivated_recurring_revenue',
						description: 'How much MRR comes from reactivated customers',
					},
					{
						name: 'Recurring Revenue',
						value: 'recurring_revenue',
						description: "Your company's MRR",
					},
					{
						name: 'Upgraded Customers',
						value: 'upgraded_customers',
						description: 'Number of existing customers who net upgraded',
					},
					{
						name: 'Upgraded Recurring Revenue',
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
						name: 'Active Customers',
						value: 'active_customers',
						description: 'Number of paying customers',
					},
					{
						name: 'Active Trialing Customers',
						value: 'active_trialing_customers',
						description: 'Number of trialing customers',
					},
					{
						name: 'Average Revenue Per User',
						value: 'average_revenue_per_user',
						description: 'ARPU',
					},
					{
						name: 'Churned Customers',
						value: 'churned_customers',
						description: 'Number of paying customers who churned',
					},
					{
						name: 'Churned Customers Cancellations',
						value: 'churned_customers_cancellations',
						description: 'Number of customers who churned by cancelling their subscription(s)',
					},
					{
						name: 'Churned Customers Delinquent',
						value: 'churned_customers_delinquent',
						description: 'Number of customers who churned because they failed to pay you',
					},
					{
						name: 'Churned Recurring Revenue',
						value: 'churned_recurring_revenue',
						description: 'Revenue lost to churn (voluntary and delinquent)',
					},
					{
						name: 'Churned Recurring Revenue Cancellations',
						value: 'churned_recurring_revenue_cancellations',
						description:
							'Revenue lost to customers who churned by cancelling their subscription(s)',
					},
					{
						name: 'Churned Recurring Revenue Delinquent',
						value: 'churned_recurring_revenue_delinquent',
						description: 'Revenue lost to customers who churned delinquent',
					},
					{
						name: 'Churned Trialing Customers',
						value: 'churned_trialing_customers',
						description: 'Number of trialling customers who churned',
					},
					{
						name: 'Converted Customers',
						value: 'converted_customers',
						description: 'Number of customers who converted from trialing to active',
					},
					{
						name: 'Converted Recurring Revenue',
						value: 'converted_recurring_revenue',
						description: 'How much MRR comes from users who converted from trialing to active',
					},
					{
						name: 'Customer Churn Cancellations Rate',
						value: 'customers_churn_cancellations_rate',
						description:
							'Percentage of paying customers who churned by cancelling their subscription(s)',
					},
					{
						name: 'Customer Churn Delinquent Rate',
						value: 'customers_churn_delinquent_rate',
						description:
							'Percentage of paying customers who churned because they failed to pay you',
					},
					{
						name: 'Customer Churn Rate',
						value: 'customers_churn_rate',
						description: 'Percentage of paying customers who churned',
					},
					{
						name: 'Customer Conversion Rate',
						value: 'customer_conversion_rate',
						description: 'Percent of trialing customers who converted',
					},
					{
						name: 'Customer Retention Rate',
						value: 'customers_retention_rate',
						description: 'Percent of customers active last month who are still active this month',
					},
					{
						name: 'Downgrade Customers',
						value: 'downgraded_customers',
						description: 'Number of existing customers who net downgraded',
					},
					{
						name: 'Downgrade Rate',
						value: 'downgrade_rate',
						description: 'Downgrade revenue as a percent of existing revenue',
					},
					{
						name: 'Downgrade Recurring Revenue',
						value: 'downgraded_recurring_revenue',
						description: 'How much downgrades and plan length decreases affect your MRR',
					},
					{
						name: 'Existing Customers',
						value: 'existing_customers',
						description: 'Number of paying customers you had at the start of the given month',
					},
					{
						name: 'Existing Recurring Revenue',
						value: 'existing_recurring_revenue',
						description: "Your company's MRR at the start of the given month",
					},
					{
						name: 'Existing Trialing Customers',
						value: 'existing_trialing_customers',
						description: 'Number of trialing customers who existed at the start of the month',
					},
					{
						name: 'Growth_Rate',
						value: 'growth_rate',
						description: "Rate at which your company's MRR has grown over the previous month",
					},
					{
						name: 'Lifetime Value',
						value: 'lifetime_value',
						description: 'Average LTV, as calculated at the end of the given period',
					},
					{
						name: 'New Customers',
						value: 'new_customers',
						description: 'Number of new, paying customers you have',
					},
					{
						name: 'New Recurring Revenue',
						value: 'new_recurring_revenue',
						description: 'MRR from new users',
					},
					{
						name: 'New Trailing Customers',
						value: 'new_trialing_customers',
						description: 'Number of new trialing customers',
					},
					{
						name: 'Plan Changed Rate',
						value: 'plan_change_rate',
						description: 'Net change in revenue as a percentage of existing revenue',
					},
					{
						name: 'Plan Changed Recurring Revenue',
						value: 'plan_changed_recurring_revenue',
						description: 'Net change in revenue for this plan',
					},
					{
						name: 'Reactivated Customers',
						value: 'reactivated_customers',
						description: 'Number of customers who have reactivated',
					},
					{
						name: 'Reactivated Recurring Revenue',
						value: 'reactivated_recurring_revenue',
						description: 'How much MRR comes from reactivated customers',
					},
					{
						name: 'Recurring Revenue',
						value: 'recurring_revenue',
						description: "Your company's MRR",
					},
					{
						name: 'Revenue Churn Cancellations Rate',
						value: 'revenue_churn_cancellations_rate',
						description: "Voluntary churn revenue as a percent of the month's starting revenue",
					},
					{
						name: 'Revenue Churn Delinquent_ Rate',
						value: 'revenue_churn_delinquent_rate',
						description: "Delinquent churn revenue as a percent of the month's starting revenue",
					},
					{
						name: 'Revenue Churn Rate',
						value: 'revenue_churn_rate',
						description: 'Revenue lost to churn as a percentage of existing revenue',
					},
					{
						name: 'Revenue Retention Rate',
						value: 'revenue_retention_rate',
						description:
							'Percent of revenue coming from existing customers that was retained by the end of the month',
					},
					{
						name: 'Upgrade Rate',
						value: 'upgrade_rate',
						description: 'Upgrade revenue as a percent of existing revenue',
					},
					{
						name: 'Upgraded Customers',
						value: 'upgraded_customers',
						description: 'Number of existing customers who net upgraded',
					},
					{
						name: 'Upgraded Recurring Revenue',
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
