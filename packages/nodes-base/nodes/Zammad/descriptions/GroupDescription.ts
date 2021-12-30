import {
	INodeProperties,
} from 'n8n-workflow';

export const groupsDescription: INodeProperties[] = [
	// ----------------------------------
	//           operations
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				api: [
					'rest',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an entry',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an entry',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an entry',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all entries',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an entry',
			},
		],
		default: 'create',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'group',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The name of the group',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
					'get',
					'delete',
				],
				resource: [
					'group',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The ID of the group',
	},
	{
		displayName: 'Additional Fields',
		name: 'optionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'group',
				],
				api: [
					'rest',
				],
			},
		},
		default: {},
		description: 'Additional optional fields of the group',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Active?',
				name: 'active',
				type: 'boolean',
				default: false,
				description: 'Whether the group is active',
			},
			{
				displayName: 'Assignment Timeout',
				name: 'assignment_timeout',
				type: 'number',
				default: 0,
				description: 'The groups Assignment Timeout',
			},
			{
				displayName: 'Email Address ID',
				name: 'email_address_id',
				type: 'number',
				default: 0,
				description: 'The groups email address ID',
			},
			{
				displayName: 'Followup Assignment?',
				name: 'follow_up_assignment',
				type: 'boolean',
				default: false,
				description: 'Whether follow-ups should be assigned',
			},
			{
				displayName: 'Followup Possible?',
				name: 'follow_up_possible',
				type: 'string',
				default: 'yes',
				description: 'If follow up is possible with this group. Is string value as required by API.',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				description: 'The note of the group',
			},
			{
				displayName: 'Signature ID',
				name: 'signature_id',
				type: 'number',
				default: 0,
				description: 'The groups gignature ID',
			},
		],
	},
];
