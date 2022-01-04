import {
	INodeTypeDescription,
} from 'n8n-workflow';

/**
 * Options to be displayed
 */
export const nodeDescription: INodeTypeDescription = {
	displayName: 'MongoDb Change Stream Trigger',
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
			displayName: 'Collection',
			name: 'collection',
			type: 'string',
			required: true,
			default: '',
			description: 'MongoDb Collection',
		},
		{
			displayName: 'Get Full Document',
			name: 'getFullDocument',
			type: 'boolean',
			default: false,
			description: 'Get JSON of full document or only changed fields',
		},
	],
};
