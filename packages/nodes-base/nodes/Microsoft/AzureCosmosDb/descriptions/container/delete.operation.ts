import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { containerResourceLocator } from '../../helpers/resourceLocators';

const properties: INodeProperties[] = [containerResourceLocator];

const displayOptions = {
	show: {
		resource: ['container'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
