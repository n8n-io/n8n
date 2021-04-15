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
import { getForms } from './GenericFunctions';

export class FormstackTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Formstack Trigger',
		name: 'formstackTrigger',
		icon: 'file:formstack.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow on a Formstack form submission.',
		defaults: {
			name: 'Formstack Trigger',
			color: '#ebfaf2', //  21b573
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'formstackApi',
				required: true,
			},
		],
		webhooks: [
			// {
			// 	name: 'default',
			// 	httpMethod: 'POST',
			// 	responseMode: 'onReceived',
			// 	path: 'formstack-webhook',
			// },
		],
		properties: [
			{
				displayName: 'Form',
				name: 'formId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getForms',
				},
				options: [],
				default: '',
				required: true,
				description: 'Form which should trigger workflow on submission.',
			},
		],
	};

	methods = {
		loadOptions: {
			getForms,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [[]];
	}
}
