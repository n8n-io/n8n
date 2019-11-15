import {
	IExecuteSingleFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

export class Intercom implements INodeType {

	description: INodeTypeDescription = {
		displayName: 'Intercom',
		name: 'intercom',
		icon: 'file:intercom.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume intercom API',
		defaults: {
			name: 'Intercom',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'intercomApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Lead',
						value: 'lead',
						description: '',
					},
				],
				default: '',
				description: 'Resource to consume.',
			},
		],
	};

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {

		return {
			json: {},
		};
	}
}
