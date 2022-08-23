/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { INodeTypeDescription } from 'n8n-workflow';

/**
 * Options to be displayed
 */
export const nodeDescription: INodeTypeDescription = {
	displayName: 'MongoDB',
	name: 'mongoDb',
	icon: 'file:mongodb.svg',
	group: ['input'],
	version: 1,
	description: 'Find, insert and update documents in MongoDB',
	defaults: {
		name: 'MongoDB',
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
			noDataExpression: true,
			options: [
				{
					name: 'Aggregate',
					value: 'aggregate',
					description: 'Aggregate documents',
					action: 'Aggregate documents',
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Delete documents',
					action: 'Delete documents',
				},
				{
					name: 'Find',
					value: 'find',
					description: 'Find documents',
					action: 'Find documents',
				},
				{
					name: 'Insert',
					value: 'insert',
					description: 'Insert documents',
					action: 'Insert documents',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Update documents',
					action: 'Update documents',
				},
			],
			default: 'find',
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
		//         aggregate
		// ----------------------------------
		{
			displayName: 'Query',
			name: 'query',
			type: 'json',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
			displayOptions: {
				show: {
					operation: ['aggregate'],
				},
			},
			default: '',
			placeholder: `[{ "$match": { "$gt": "1950-01-01" }, ... }]`,
			hint: 'Learn more about aggregation pipeline <a href="https://docs.mongodb.com/manual/core/aggregation-pipeline/">here</a>',
			required: true,
			description: 'MongoDB aggregation pipeline query in JSON format',
		},

		// ----------------------------------
		//         delete
		// ----------------------------------
		{
			displayName: 'Delete Query (JSON Format)',
			name: 'query',
			type: 'json',
			typeOptions: {
				rows: 5,
			},
			displayOptions: {
				show: {
					operation: ['delete'],
				},
			},
			default: '{}',
			placeholder: `{ "birth": { "$gt": "1950-01-01" } }`,
			required: true,
			description: 'MongoDB Delete query',
		},

		// ----------------------------------
		//         find
		// ----------------------------------
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			displayOptions: {
				show: {
					operation: ['find'],
				},
			},
			default: {},
			placeholder: 'Add options',
			description: 'Add query options',
			options: [
				{
					displayName: 'Limit',
					name: 'limit',
					type: 'number',
					typeOptions: {
						minValue: 1,
					},
					default: 0,
					// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-limit
					description:
						'Use limit to specify the maximum number of documents or 0 for unlimited documents',
				},
				{
					displayName: 'Skip',
					name: 'skip',
					type: 'number',
					default: 0,
					description: 'The number of documents to skip in the results set',
				},
				{
					displayName: 'Sort (JSON Format)',
					name: 'sort',
					type: 'json',
					typeOptions: {
						rows: 2,
					},
					default: '{}',
					placeholder: '{ "field": -1 }',
					description: 'A JSON that defines the sort order of the result set',
				},
			],
		},
		{
			displayName: 'Query (JSON Format)',
			name: 'query',
			type: 'json',
			typeOptions: {
				rows: 5,
			},
			displayOptions: {
				show: {
					operation: ['find'],
				},
			},
			default: '{}',
			placeholder: `{ "birth": { "$gt": "1950-01-01" } }`,
			required: true,
			description: 'MongoDB Find query',
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
					operation: ['insert'],
				},
			},
			default: '',
			placeholder: 'name,description',
			description: 'Comma-separated list of the fields to be included into the new document',
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
					operation: ['update'],
				},
			},
			default: 'id',
			required: true,
			// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
			description:
				'Name of the property which decides which rows in the database should be updated. Normally that would be "id".',
		},
		{
			displayName: 'Fields',
			name: 'fields',
			type: 'string',
			displayOptions: {
				show: {
					operation: ['update'],
				},
			},
			default: '',
			placeholder: 'name,description',
			description: 'Comma-separated list of the fields to be included into the new document',
		},
		{
			displayName: 'Upsert',
			name: 'upsert',
			type: 'boolean',
			displayOptions: {
				show: {
					operation: ['update'],
				},
			},
			default: false,
			description: 'Whether to perform an insert if no documents match the update key',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			displayOptions: {
				show: {
					operation: ['update', 'insert'],
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
					description: 'Comma separeted list of fields that will be parse as Mongo Date type',
				},
				{
					displayName: 'Use Dot Notation',
					name: 'useDotNotation',
					type: 'boolean',
					default: false,
					description: 'Whether to use dot notation to access date fields',
				},
			],
		},
	],
};
