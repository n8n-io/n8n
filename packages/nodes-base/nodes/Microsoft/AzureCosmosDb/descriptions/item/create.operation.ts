import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { processJsonInput, untilContainerSelected } from '../../helpers/utils';
import { containerResourceLocator } from '../common';

const properties: INodeProperties[] = [
	{ ...containerResourceLocator, description: 'Select the container you want to use' },
	{
		displayName: 'Item Contents',
		name: 'customProperties',
		default: '{\n\t"id": "replace_with_new_document_id"\n}',
		description: 'The item contents as a JSON object',
		displayOptions: {
			hide: {
				...untilContainerSelected,
			},
		},
		hint: 'The item requires an ID and partition key value if a custom key is set',
		required: true,
		routing: {
			send: {
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const rawCustomProperties = this.getNodeParameter('customProperties') as IDataObject;
						const customProperties = processJsonInput(
							rawCustomProperties,
							'Item Contents',
							undefined,
							['id'],
						);
						requestOptions.body = customProperties;
						return requestOptions;
					},
				],
			},
		},
		type: 'json',
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
