import {
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import {
	NODE_SETTINGS,
	POSTBIN_VALUES,
	RESOURCES,
} from './NodeConstants'

import {
	binOperations,
	binFields,
} from './BinDescription';

import {
	requestOperations,
	requestFields,
} from './RequestDescription';

export class PostBin implements INodeType {
	description: INodeTypeDescription = {
		displayName: POSTBIN_VALUES.DISPLAY_NAME,
		name: 'postBin',
		icon: 'file:postbin.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Consume PostBin API',
		defaults: {
			name: POSTBIN_VALUES.DISPLAY_NAME,
			color: POSTBIN_VALUES.BRAND_COLOR
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [],
		requestDefaults: {
			baseURL: NODE_SETTINGS.BASE_URL
		},
		properties: [
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: RESOURCES.BIN.name,
						value: RESOURCES.BIN.value
					},
					{
						name: RESOURCES.REQUEST.name,
						value: RESOURCES.REQUEST.value
					}
				],
				default: RESOURCES.BIN.value,
				required: true,
				description: 'Bin to work with'
			},
			...binOperations,
			...requestOperations,
			...binFields,
			...requestFields,
		]
	};
}
