import {
	INodeProperties,
} from 'n8n-workflow';

export const incidentNoteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'incidentNote',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a incident note',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: `Get all incident's notes`,
			},
		],
		default: 'create',
		description: 'The operation to perform.',
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
				resource: [
					'incidentNote',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Unique identifier for the incident.',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incidentNote',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The note content',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incidentNote',
				],
				operation: [
					'create',
				],
			},
		},
		description: `The email address of a valid user associated with the account making the request.`,
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
				resource: [
					'incidentNote',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Unique identifier for the incident.',
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
					'incidentNote',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
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
					'incidentNote',
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
		description: 'How many results to return.',
	},
];
