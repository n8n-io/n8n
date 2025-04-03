import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError, updateDisplayOptions } from 'n8n-workflow';

import { containerResourceLocator, itemResourceLocator } from '../../helpers/resourceLocators';
import { processJsonInput, untilContainerSelected, untilItemSelected } from '../../helpers/utils';

const properties: INodeProperties[] = [
	containerResourceLocator,
	itemResourceLocator,
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
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const rawCustomProperties = this.getNodeParameter('customProperties') as IDataObject;
						const customProperties = processJsonInput(rawCustomProperties, 'Item Contents');
						if (
							Object.keys(customProperties).length === 0 ||
							Object.values(customProperties).every(
								(val) => val === undefined || val === null || val === '',
							)
						) {
							throw new NodeOperationError(this.getNode(), 'Item contents are empty', {
								description:
									'Ensure the "Item Contents" field contains at least one valid property.',
							});
						}
						requestOptions.body = {
							...(requestOptions.body as IDataObject),
							...customProperties,
						};
						return requestOptions;
					},
				],
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
