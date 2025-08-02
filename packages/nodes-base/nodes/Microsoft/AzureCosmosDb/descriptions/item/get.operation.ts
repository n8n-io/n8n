import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { untilContainerSelected, untilItemSelected } from '../../helpers/utils';
import { containerResourceLocator, itemResourceLocator } from '../common';

const properties: INodeProperties[] = [
	{ ...containerResourceLocator, description: 'Select the container you want to use' },
	{ ...itemResourceLocator, description: 'Select the item you want to retrieve' },
	{
		displayName: 'Simplify',
		name: 'simple',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: {
			hide: {
				...untilContainerSelected,
				...untilItemSelected,
			},
		},
		type: 'boolean',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		default: {},
		displayOptions: {
			hide: {
				...untilContainerSelected,
				...untilItemSelected,
			},
		},
		options: [
			{
				displayName: 'Partition Key',
				name: 'partitionKey',
				default: '',
				hint: 'Only required if a custom partition key is set for the container',
				type: 'string',
			},
		],
		placeholder: 'Add Partition Key',
		type: 'collection',
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
