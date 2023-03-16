import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { googleApiRequest, googleApiRequestAllItems } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'View Name or ID',
		name: 'viewId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getViews',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['userActivity'],
				operation: ['search'],
			},
		},
		placeholder: '123456',
		description:
			'The view from Google Analytics. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		hint: "If there's nothing here, try changing the 'Property type' field above",
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['userActivity'],
				operation: ['search'],
			},
		},
		placeholder: '123456',
		description: 'ID of a user',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['search'],
				resource: ['userActivity'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['search'],
				resource: ['userActivity'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['search'],
				resource: ['userActivity'],
			},
		},
		options: [
			{
				displayName: 'Activity Types',
				name: 'activityTypes',
				type: 'multiOptions',
				options: [
					{
						name: 'Ecommerce',
						value: 'ECOMMERCE',
					},
					{
						name: 'Event',
						value: 'EVENT',
					},
					{
						name: 'Goal',
						value: 'GOAL',
					},
					{
						name: 'Pageview',
						value: 'PAGEVIEW',
					},
					{
						name: 'Screenview',
						value: 'SCREENVIEW',
					},
				],
				description: 'Type of activites requested',
				default: [],
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	//https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/userActivity/search
	const viewId = this.getNodeParameter('viewId', index);
	const userId = this.getNodeParameter('userId', index);
	const returnAll = this.getNodeParameter('returnAll', 0);
	const additionalFields = this.getNodeParameter('additionalFields', index);

	let responseData;

	const body: IDataObject = {
		viewId,
		user: {
			userId,
		},
	};

	if (additionalFields.activityTypes) {
		Object.assign(body, { activityTypes: additionalFields.activityTypes });
	}

	const method = 'POST';
	const endpoint = '/v4/userActivity:search';

	if (returnAll) {
		responseData = await googleApiRequestAllItems.call(this, 'sessions', method, endpoint, body);
	} else {
		body.pageSize = this.getNodeParameter('limit', 0);
		responseData = await googleApiRequest.call(this, method, endpoint, body);
		responseData = responseData.sessions;
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject[]),
		{ itemData: { item: index } },
	);

	return executionData;
}
