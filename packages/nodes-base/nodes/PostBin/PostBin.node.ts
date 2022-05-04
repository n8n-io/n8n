import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import {
	binOperations,
	binFields
} from './BinDescription';

import {
	requestOperations,
	requestFields
} from './RequestDescription';

export class PostBin implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PostBin',
		name: 'postBin',
		icon: 'file:postbin.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Consume PostBin API',
		defaults: {
			name: 'PostBin',
			color: '#4dc0b5'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Bin',
						value: 'bin'
					},
					{
						name: 'Request',
						value: 'request'
					}
				],
				default: 'bin',
				required: true,
				description: 'Bin to work with'
			},
			...binOperations,
			...requestOperations,
			...binFields,
			...requestFields,
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [[]];
	}
}
