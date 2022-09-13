import { INodeProperties } from 'n8n-workflow';

export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file',
				action: 'Delete a file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file',
				action: 'Download a file',
			},
		],
		default: 'download',
	},
];

export const fileFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                file:download                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download', 'delete'],
			},
		},
		description: 'The table identifier',
	},
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download', 'delete'],
			},
		},
		description: 'The unique identifier of the record',
	},
	{
		displayName: 'Field ID',
		name: 'fieldId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download', 'delete'],
			},
		},
		description: 'The unique identifier of the field',
	},
	{
		displayName: 'Version Number',
		name: 'versionNumber',
		type: 'number',
		default: 1,
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download', 'delete'],
			},
		},
		description: 'The file attachment version number',
	},
	{
		displayName: 'Binary Property',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download'],
			},
		},
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		description: 'Object property name which holds binary data',
		required: true,
	},
];
