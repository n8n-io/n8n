import { INodeProperties } from 'n8n-workflow';

export const incidentNoteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['incidentNote'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a incident note',
				action: 'Create an incident note',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: "Get many incident's notes",
				action: 'Get many incident notes',
			},
		],
		default: 'create',
	},
];

export const incidentNoteFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                incidentNote:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Incident ID',
		name: 'incidentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['incidentNote'],
				operation: ['create'],
			},
		},
		description: 'Unique identifier for the incident',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['incidentNote'],
				operation: ['create'],
			},
		},
		description: 'The note content',
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
				resource: ['incidentNote'],
				operation: ['create'],
			},
		},
		description: 'The email address of a valid user associated with the account making the request',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 incidentNote:getAll                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Incident ID',
		name: 'incidentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['incidentNote'],
				operation: ['getAll'],
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
				operation: ['getAll'],
				resource: ['incidentNote'],
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
				operation: ['getAll'],
				resource: ['incidentNote'],
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
];
