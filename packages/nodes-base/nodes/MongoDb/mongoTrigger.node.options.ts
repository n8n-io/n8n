import {
	INodeTypeDescription,
} from 'n8n-workflow';

/**
 * Options to be displayed
 */
export const nodeDescription: INodeTypeDescription = {
	displayName: 'MongoDb Trigger',
	name: 'mongoDbTrigger',
	icon: 'file:mongodb.svg',
	group: ['trigger'],
	version: 1,
	description: 'Watch for change events in a collection',
	defaults: {
		name: 'MongoDb Trigger',
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
			displayName: 'Collection',
			name: 'collection',
			type: 'string',
			required: true,
			default: '',
			description: 'Enter the name of the MongoDB\'s collection',
		},
		{
			displayName: 'Include Full Document',
			name: 'includeFullDocument',
			type: 'boolean',
			default: false,
			description: 'Whether to include a copy of the entire document alongside with a delta describing the changes to the document',
		},
	],
};
