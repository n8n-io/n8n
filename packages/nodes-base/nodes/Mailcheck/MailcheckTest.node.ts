import {
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class MailcheckTest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mailcheck TEST',
		name: 'mailcheckTest',
		icon: 'file:mailcheck.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Mailcheck API',
		defaults: {
			name: 'Mailcheck Test',
			color: '#4f44d7',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mailcheckApi',
				required: true,
			},
		],
		// TODO: Think about some pre-send manipulation (to make it possible to define parameters
		//       differently in UI than send) and receive-transformation (to simplifiy)
		requestDefaults: {
			baseURL: 'http://example.com',
			url: '',
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Email',
						value: 'email',
					},
				],
				default: 'email',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
					},
				},
				options: [
					{
						name: 'Check',
						value: 'check',
					},
				],
				request: {
					method: 'POST',
					url: '/singleEmail:check',
				},
				default: 'check',
			},
			{
				displayName: 'Sender',
				name: 'sender',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
					},
				},
				requestProperty: {
					// If no "property" defined use n8n internal property name
				},
				default: '',
				description: 'Email address to check.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
					},
				},
				requestProperty: {
					// TODO: If not defined could by default be the name of the property
					property: 'toEmail', // Simple set
				},
				default: '',
				description: 'Email address to check.',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
					},
				},
				requestProperty: {
					property: 'message.text', // Set on lower level with dot-notation
				},
				default: '',
				description: 'The message.',
			},

			// Test collection
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Deal ID',
						name: 'deal_id',
						type: 'number',
						default: 0,
						requestProperty: {
							property: 'dealId',
							type: 'query',
						},
						description: 'ID of the deal this activity will be associated with',
					},
					{
						displayName: 'Due Date',
						name: 'due_date',
						type: 'dateTime',
						default: '',
						requestProperty: {
							type: 'query',
						},
						description: 'Due Date to activity be done YYYY-MM-DD',
					},
					{
						displayName: 'Lower Level',
						name: 'lowerLevel',
						type: 'collection',
						placeholder: 'Add Field',
						default: {},
						options: [
							{
								displayName: 'Deal ID',
								name: 'deal_id',
								type: 'number',
								default: 0,
								requestProperty: {
									property: 'dealId2',
									type: 'query',
								},
								description: 'ID of the deal this activity will be associated with',
							},
							{
								displayName: 'Due Date',
								name: 'due_date',
								type: 'dateTime',
								default: '',
								requestProperty: {
									property: 'due_date2',
									type: 'query',
								},
								description: 'Due Date to activity be done YYYY-MM-DD',
							},

							// // Test fixed collection
							// {
							// 	displayName: 'Custom Properties',
							// 	name: 'customProperties',
							// 	placeholder: 'Add Custom Property',
							// 	description: 'Adds a custom property to set also values which have not been predefined.',
							// 	type: 'fixedCollection',
							// 	typeOptions: {
							// 		multipleValues: true,
							// 	},
							// 	default: {},
							// 	options: [
							// 		{
							// 			name: 'property',
							// 			displayName: 'Property',
							// 			values: [
							// 				{
							// 					displayName: 'Property Name',
							// 					name: 'name',
							// 					type: 'string',
							// 					default: '',
							// 					description: 'Name of the property to set.',
							// 				},
							// 				{
							// 					displayName: 'Property Value',
							// 					name: 'value',
							// 					type: 'string',
							// 					default: '',
							// 					description: 'Value of the property to set.',
							// 				},
							// 			],
							// 		},
							// 	],
							// },

						],
					},
				],
			},



		],
	};

}
