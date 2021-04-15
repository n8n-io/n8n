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
			color: '#21b573',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'formstackApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
			},
			{
				name: 'formstackOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
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
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
				description: 'The resource to operate on.',
			},
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
