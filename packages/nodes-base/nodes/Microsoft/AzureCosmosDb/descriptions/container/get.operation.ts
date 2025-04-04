import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { containerResourceLocator } from '../../helpers/resourceLocators';

const properties: INodeProperties[] = [
	containerResourceLocator,
	{
		displayName: 'Simplify',
		name: 'simple',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
		type: 'boolean',
	},
];

const displayOptions = {
	show: {
		resource: ['container'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
