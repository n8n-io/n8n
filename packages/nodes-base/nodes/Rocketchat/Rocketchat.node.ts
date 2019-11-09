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
import {
	rocketchatApiRequest
} from './GenericFunctions';


export class Rocketchat implements INodeType {

	description: INodeTypeDescription = {
		displayName: 'Rocketchat',
		name: 'Rocketchat',
		icon: 'file:Rocketchat.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Rocketchat API',
		defaults: {
			name: 'Rocketchat',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'rocketchatApi',
				required: true,
			}
        ],
		properties: [
			
        ]
	};

	methods = {
	
    };

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
        return {
            json: {}
        };
    }
}
