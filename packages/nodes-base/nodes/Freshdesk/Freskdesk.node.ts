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
	freshdeskApiRequest
} from './GenericFunctions';

import moment = require('moment');
import _ = require('lodash')

export class Freshdesk implements INodeType {

	description: INodeTypeDescription = {
		displayName: 'Freshdesk',
		name: 'freshdesk',
		icon: 'file:freshdesk.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Freshdesk API',
		defaults: {
			name: 'Freshdesk',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'freshdeskApi',
				required: true,
			}
        ],
		properties: [
        ]
    };
    

    methods = {
		loadOptions: {
        }
    };
    
	// async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {



    // }
}
