import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

export class Squarespace implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Squarespace',
		name: 'squarespace',
		icon: 'file:squarespace.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Squarespace API',
		defaults: {
			name: 'Squarespace',
			color: '#222222',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'squarespaceApi',
				required: true,
			},
		],
		properties: [
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [[]];
	}
}
