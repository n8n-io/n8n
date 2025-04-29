import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import {
	untilContainerSelected,
	untilItemSelected,
	validateCustomProperties,
} from '../../helpers/utils';
import { containerResourceLocator, itemResourceLocator } from '../common';

const properties: INodeProperties[] = [
	{ ...containerResourceLocator, description: 'Select the container you want to use' },
	{ ...itemResourceLocator, description: 'Select the item to be updated' },
	{
		displayName: 'Item Contents',
		name: 'customProperties',
		default: '{}',
		description: 'The item contents as a JSON object',
		displayOptions: {
			hide: {
				...untilContainerSelected,
				...untilItemSelected,
			},
		},
		required: true,
		routing: {
			send: {
				preSend: [validateCustomProperties],
			},
		},
		type: 'json',
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
				type: 'string',
				hint: 'Only required if a custom partition key is set for the container',
				default: '',
			},
		],
		placeholder: 'Add Partition Key',
		type: 'collection',
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
