import {
	INodeTypeDescription,
} from 'n8n-workflow';

/**
 * Options to be displayed
 */
export const nodeDescription: INodeTypeDescription = {
	displayName: 'MongoDbTrigger',
	name: 'mongoDbTrigger',
	icon: 'file:mongodb.svg',
	group: ['transform'],
	version: 1,
	description: 'Watch for change events in a collection',
	defaults: {
		name: 'MongoDbTrigger',
		color: '#1A82e2',
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
			displayName: 'Connection String',
			name: 'connectionString',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			required: true,
			default: '',
			description: 'MongoDb Database',
		},
		{
			displayName: 'Collection',
			name: 'collection',
			type: 'string',
			required: true,
			default: '',
			description: 'MongoDb Collection',
		},
		{
			displayName: 'Pipeline',
			name: 'pipeline',
			type: 'fixedCollection',
			placeholder: 'Pipeline Options',
			default: {},
			options: [
				{
					displayName: 'Match',
					name: 'match',
					values: [
						{
							displayName: 'Item',
							name: 'matchItem',
							type: 'json',
							default: '',
						},
						{
							displayName: 'Value',
							name: 'matchValue',
							type: 'string',
							default: '',
						},
					],
				},
				{
					displayName: 'Project',
					name: 'project',
					values: [
						{
							displayName: 'Item',
							name: 'projectItem',
							type: 'json',
							default: '',
						},
						{
							displayName: 'Value',
							name: 'projectValue',
							type: 'string',
							default: '',
						},
					],
				},
			],
		},
	],
};
