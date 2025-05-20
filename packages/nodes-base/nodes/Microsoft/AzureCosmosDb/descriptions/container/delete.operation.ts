import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { containerResourceLocator } from '../common';

const properties: INodeProperties[] = [
	{ ...containerResourceLocator, description: 'Select the container you want to delete' },
];

const displayOptions = {
	show: {
		resource: ['container'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
