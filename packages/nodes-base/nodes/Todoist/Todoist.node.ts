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
	mandrillApiRequest,
	getToEmailArray,
	getGoogleAnalyticsDomainsArray,
	getTags,
	validateJSON
} from './GenericFunctions';

export class Todoist implements INodeType {

	//https://mandrillapp.com/api/docs/messages.JSON.html#method=send-template

	description: INodeTypeDescription = {
		displayName: 'Todoist',
		name: 'todoist',
		icon: 'file:todoist.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Todoist API',
		defaults: {
			name: 'Todoist',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'todoistApi',
				required: true,
			}
        ],
        //multiOptions
		properties: [
			{
				displayName: 'Testing',
				name: 'testing',
				placeholder: 'blabla',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'label',
						displayName: 'label',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'options',
                                default: '',
                                options: [
                                    {
                                        name: 'Message',
                                        value: 'message',
                                        description: 'Send a message.',
                                    },
                                ],
							},
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	};

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {

		
	}
}
