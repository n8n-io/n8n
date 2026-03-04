import type { INodeProperties } from 'n8n-workflow';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Create Persona',
				value: 'createPersona',
				description: 'Create a new persona',
				action: 'Create persona',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get a list of users/personas',
				action: 'Get many users',
			},
			{
				name: 'Mark as Active',
				value: 'markAsActive',
				description: 'Mark a user as active',
				action: 'Mark user as active',
			},
			{
				name: 'Mark as Inactive',
				value: 'markAsInactive',
				description: 'Mark a user as inactive',
				action: 'Mark user as inactive',
			},
		],
		default: 'createPersona',
	},
];

export const userFields: INodeProperties[] = [
	// ----------------------------------
	//         user:createPersona
	// ----------------------------------
	{
		displayName: 'Persona ID',
		name: 'personaId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., Admin',
		description: 'The persona ID (objectTypeID) for the new persona',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['createPersona'],
			},
		},
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'json',
		default: '{}',
		description: 'The content for the persona as JSON',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['createPersona'],
			},
		},
	},

	// ----------------------------------
	//         user:getMany
	// ----------------------------------
	{
		displayName: 'Data Page Name',
		name: 'dataPageName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'UserList',
		description: 'The name of the data page to query',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getMany'],
			},
		},
	},
	{
		displayName: 'Fields to Select',
		name: 'fields',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		placeholder: 'Add Field',
		description:
			'Fields to include in the response. If not specified, defaults to BusinessID, Name, Status, Description, ID, and @class.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				name: 'fieldValues',
				displayName: 'Field',
				values: [
					{
						displayName: 'Field Name',
						name: 'field',
						type: 'string',
						default: '',
						placeholder: 'e.g., BusinessID',
						description: 'Name of the field to select',
					},
				],
			},
		],
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		placeholder: '61',
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getMany'],
			},
		},
		typeOptions: {
			minValue: 1,
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Page Number',
				name: 'pageNumber',
				type: 'number',
				default: 1,
				description: 'Page number for pagination',
				typeOptions: {
					minValue: 1,
				},
			},
		],
	},

	// ----------------------------------
	//         user:markAsActive
	// ----------------------------------
	{
		displayName: 'Object ID',
		name: 'objectId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the user object to mark as active',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['markAsActive'],
			},
		},
	},
	{
		displayName: 'If-Match',
		name: 'ifMatch',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., w/"2" or W/"3"',
		description:
			'The ETag value from a prior GET response (e.g. w/"2" or W/"3"). Automatically normalised for the If-Match header.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['markAsActive'],
			},
		},
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		required: false,
		default: '',
		placeholder: 'e.g., User account reactivated',
		description: 'Reason for marking the user as active (optional)',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['markAsActive'],
			},
		},
	},

	// ----------------------------------
	//         user:markAsInactive
	// ----------------------------------
	{
		displayName: 'Object ID',
		name: 'objectId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the user object to mark as inactive',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['markAsInactive'],
			},
		},
	},
	{
		displayName: 'If-Match',
		name: 'ifMatch',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., w/"2" or W/"3"',
		description:
			'The ETag value from a prior GET response (e.g. w/"2" or W/"3"). Automatically normalised for the If-Match header.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['markAsInactive'],
			},
		},
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		required: false,
		default: '',
		placeholder: 'e.g., User no longer needed',
		description: 'Reason for marking the user as inactive (optional)',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['markAsInactive'],
			},
		},
	},
];
