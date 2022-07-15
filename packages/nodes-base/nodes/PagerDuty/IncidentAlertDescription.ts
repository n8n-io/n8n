import {
	INodeProperties,
} from 'n8n-workflow';

export const incidentAlertOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'incidentAlert',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get single alert for an incident',
				action: 'Get single alert for an incident',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all alerts for an incident',
				action: 'Get all alerts for an incident',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an incident alert',
				action: 'Update an incident alert',
			},
		],
		default: 'getAll',
	},
];

export const incidentAlertFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                               incidentAlert:get                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Incident ID',
		name: 'incidentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incidentAlert',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Unique identifier for the incident',
	},
	{
		displayName: 'Alert ID',
		name: 'alertId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incidentAlert',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Unique identifier for the incident alert',
	},
/* -------------------------------------------------------------------------- */
/*                              incidentAlert:getAll                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Incident ID',
		name: 'incidentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incidentAlert',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Unique identifier for the incident',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'incidentAlert',
				],
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
				operation: [
					'getAll',
				],
				resource: [
					'incidentAlert',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
/* -------------------------------------------------------------------------- */
/*                            incidentAlert:update                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Incident ID',
		name: 'incidentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incidentAlert',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Unique identifier for the incident',
	},
	{
		displayName: 'Alert ID',
		name: 'alertId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incidentAlert',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Unique identifier for the incident alert',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incidentAlert',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'The email address of a valid user associated with the account making the request',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'incidentAlert',
				],
				operation: [
					'update',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Triggered',
						value: 'triggered',
					},
					{
						name: 'Resolved',
						value: 'resolved',
					},
				],
				default: '',
				description: 'The new status of the alert',
			},
			{
				displayName: 'Parent Incident ID',
				name: 'newIncidentId',
				type: 'string',
				default: '',
				description: 'Unique identifier for the parent incident to assign the alert to',
			},
		],
	},
];
