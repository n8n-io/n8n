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

export class ZenHub implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'ZenHub',
			name: 'zenHub',
			icon: 'file:zenHub.svg',
			group: ['transform'],
			version: 1,
			description: 'Consume ZenHub API',
			defaults: {
					name: 'ZenHub',
					color: '#5d60ba',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
			],
			properties: [
				{
					displayName: 'Repository ID',
					name: 'repoId',
					type: 'string',
					required: true,
					description: ''
				}
			],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
			return [[]];
	}
}
