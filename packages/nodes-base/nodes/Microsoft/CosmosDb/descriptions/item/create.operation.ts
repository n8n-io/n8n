import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { processJsonInput, untilContainerSelected } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the container you want to use',
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'containerId',
				hint: 'Enter the container ID',
				placeholder: 'e.g. UsersContainer',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The container ID must follow the allowed pattern',
						},
					},
				],
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
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
						const customProperties = processJsonInput(rawCustomProperties, 'Item Contents');
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
