import {
	INodeProperties,
 } from 'n8n-workflow';

export const historyAndNotesOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'history_and_notes',
				],
			},
		},
		options: [
			{
				name: 'Update',
				value: 'update',
				description: 'Add Notes to a document',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get Notes',
			},
		],
		default: 'update',
		description: 'Allows you to retrieve the history of changes to a single existing document. Allows you add notes against a single existing document',
	},
] as INodeProperties[];

export const historyAndNotesFields = [
	{
		displayName: 'Organization ID',
		name: 'organizationId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTenants',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'history_and_notes',
				],
				operation: [
					'get',
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Endpoint',
		name: 'endpoint',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'history_and_notes',
				],
				operation: [
					'get',
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Guid',
		name: 'guid',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'history_and_notes',
				],
				operation: [
					'get',
					'update',
				],
			},
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                history and notes:create                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Details',
		name: 'details',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'history_and_notes',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
		description: 'The note to be recorded against a single document. Max Length 250 characters.',
	},
] as INodeProperties[];
