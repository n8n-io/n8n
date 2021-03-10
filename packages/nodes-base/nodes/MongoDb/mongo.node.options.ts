import {
	INodeTypeDescription,
} from 'n8n-workflow';

/**
 * Options to be displayed
 */
export const nodeDescription: INodeTypeDescription = {
	displayName: 'MongoDB',
	name: 'mongoDb',
	icon: 'file:mongoDb.svg',
	group: ['input'],
	version: 1,
	description: 'Find, insert and update documents in MongoDB.',
	defaults: {
		name: 'MongoDB',
		color: '#13AA52',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'mongoDb',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			options: [
				{
					name: 'Delete',
					value: 'delete',
					description: 'Delete documents.',
				},
				{
					name: 'Find',
					value: 'find',
					description: 'Find documents.',
				},
				{
					name: 'Insert',
					value: 'insert',
					description: 'Insert documents.',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Update documents.',
				},
			],
			default: 'find',
			description: 'The operation to perform.',
		},

		{
			displayName: 'Collection',
			name: 'collection',
			type: 'string',
			required: true,
			default: '',
			description: 'MongoDB Collection',
		},

		// ----------------------------------
		//         delete
		// ----------------------------------
		{
			displayName: 'Delete Query (JSON format)',
			name: 'query',
			type: 'json',
			typeOptions: {
				rows: 5,
			},
			displayOptions: {
				show: {
					operation: [
						'delete',
					],
				},
			},
			default: '{}',
			placeholder: `{ "birth": { "$gt": "1950-01-01" } }`,
			required: true,
			description: 'MongoDB Delete query.',
		},

		// ----------------------------------
		//         find
		// ----------------------------------
		{
			displayName: 'Query (JSON format)',
			name: 'query',
			type: 'json',
			typeOptions: {
				rows: 5,
			},
			displayOptions: {
				show: {
					operation: [
						'find',
					],
				},
			},
			default: '{}',
			placeholder: `{ "birth": { "$gt": "1950-01-01" } }`,
			required: true,
			description: 'MongoDB Find query.',
		},

		// ----------------------------------
		//         insert
		// ----------------------------------
		{
			displayName: 'Fields',
			name: 'fields',
			type: 'string',
			displayOptions: {
				show: {
					operation: [
						'insert',
					],
				},
			},
			default: '',
			placeholder: 'name,description',
			description:
				'Comma separated list of the fields to be included into the new document.',
		},

		// ----------------------------------
		//         update
		// ----------------------------------
		{
			displayName: 'Update Key',
			name: 'updateKey',
			type: 'string',
			displayOptions: {
				show: {
					operation: [
						'update',
					],
				},
			},
			default: 'id',
			required: true,
			description:
				'Name of the property which decides which rows in the database should be updated. Normally that would be "id".',
		},
		{
			displayName: 'Fields',
			name: 'fields',
			type: 'string',
			displayOptions: {
				show: {
					operation: [
						'update',
					],
				},
			},
			default: '',
			placeholder: 'name,description',
			description:
				'Comma separated list of the fields to be included into the new document.',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			displayOptions: {
				show: {
					operation: [
						'update',
						'insert',
					],
				},
			},
			placeholder: 'Add Option',
			default: {},
			options: [
				{
					displayName: 'Date Fields',
					name: 'dateFields',
					type: 'string',
					default: '',
					description: 'Comma separeted list of fields that will be parse as Mongo Date type.',
				},
			],
		},
	],
};
