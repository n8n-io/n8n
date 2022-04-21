import {
	INodeTypeDescription,
} from 'n8n-workflow';

/**
 * Options to be displayed
 */
export const nodeDescription: INodeTypeDescription = {
	displayName: 'MongoDB Trigger',
	name: 'mongoDbTrigger',
	icon: 'file:mongodb.svg',
	group: ['trigger'],
	version: 1,
	description: 'Watch for change events in a collection',
	defaults: {
		name: 'MongoDB Trigger',
		color: '#1A82e2',
	},
	inputs: [],
	outputs: ['main'],
	credentials: [
		{
			name: 'mongoDb',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Change Stream',
					value: 'changeStream',
					description: 'Subscribe to all data changes on a single collection',
				},
			],
			default: 'changeStream',
			description: 'The Resource to operate on',
		},
		{
			displayName: 'Change streams allow applications to access real-time data changes, read more <a href="https://www.mongodb.com/docs/manual/changeStreams/" target="_blank">here</a> . <br>MongoDB chain streams option is available in replica sets setup only, but not in a standalone installation. However, you can update your standalone installation to a single node replica set by following those <a href="https://onecompiler.com/posts/3vchuyxuh/enabling-replica-set-in-mongodb-with-just-one-node" target="_blank">steps</a>.',
			name: 'mongoNotice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					resource: [
						'changeStream',
					],
				},
			},
		},
		{
			displayName: 'Collection',
			name: 'collection',
			type: 'string',
			required: true,
			default: '',
			description: 'Enter the name of the MongoDB\'s collection',
			displayOptions: {
				show: {
					resource: [
						'changeStream',
					],
				},
			},
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			displayOptions: {
				show: {
					resource: [
						'changeStream',
					],
				},
			},
			placeholder: 'Add Option',
			default: {},
			options: [
				{
					displayName: 'Include Full Document',
					name: 'includeFullDocument',
					type: 'boolean',
					default: false,
					description: 'Whether to include a copy of the entire document alongside with a delta describing the changes to the document',
				},
				{
					displayName: 'Change Events',
					name: 'changeEvents',
					type: 'multiOptions',
					description: 'The type of events that will trigger node, if none selected will be triggered by all',
					hint: 'Learn more about change events <a href="https://www.mongodb.com/docs/manual/changeStreams/" target="_blank">here</a>',
					options: [
						{
							name: 'Delete',
							value: 'delete',
						},
						{
							name: 'Invalidate',
							value: 'invalidate',
						},
						{
							name: 'Insert',
							value: 'insert',
						},
						{
							name: 'Rename',
							value: 'rename',
						},
						{
							name: 'Replace',
							value: 'replace',
						},
						{
							name: 'Update',
							value: 'update',
						},
					],
					default: [],
				},
			],
		},
	],
};
