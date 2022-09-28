import { IExecuteFunctions } from 'n8n-core';

import { uiProperties } from './properties';

import {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { handleExecute } from './GenericFunctions';

import { OptionsWithUri } from 'request';

export class FoxyApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FoxyApi',
		name: 'foxyApi',
		icon: 'file:foxyLogo.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Foxy API',
		defaults: {
			name: 'FoxyApi',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'foxyJwtApi',
				required: true,
			},
		],
		properties: uiProperties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const that = this;
		const response = await handleExecute(that);
		return [this.helpers.returnJsonArray(response)];
	}
}
