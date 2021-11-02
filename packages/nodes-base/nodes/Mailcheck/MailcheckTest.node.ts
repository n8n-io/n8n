import {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
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
					// Transform request before it gets send
					preSend: async function (this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>  {
						requestOptions.qs = (requestOptions.qs || {}) as IDataObject;
						// if something special is required it is possible to write custom code and get from parameter
						requestOptions.qs.sender = this.getNodeParameter('sender');
						return requestOptions;
					},
					// Transform the received data
					postReceive: async function (this: IExecuteSingleFunctions, item: IDataObject | IDataObject[]): Promise<IDataObject | IDataObject[] | null> {
						if (!Array.isArray(item)) {
							item.success = true;
						}

						return item;
					},
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
					property: 'toEmail', // Simple set
					value: '={{$value.toUpperCase()}}', // Change value that gets send via an expression
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

						],
					},
				],
			},

			// Test fixed collection0: multipleValues=false
			{
				displayName: 'Custom Properties0 (single)',
				name: 'customPropertiesSingle0',
				placeholder: 'Add Custom Property',
				description: 'Adds a custom property to set also values which have not been predefined.',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Property',
						values: [

							// To set: { single-name: 'value' }
							{
								displayName: 'Property Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the property to set.',
							},
							{
								displayName: 'Property Value',
								name: 'value',
								type: 'string',
								default: '',
								requestProperty: {
									property: '=single-{{$self.name}}',
								},
								description: 'Value of the property to set.',
							},
						],
					},
				],
			},

			// Test fixed collection1: multipleValues=false
			{
				displayName: 'Custom Properties1 (single)',
				name: 'customPropertiesSingle1',
				placeholder: 'Add Custom Property',
				description: 'Adds a custom property to set also values which have not been predefined.',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Property',
						values: [
							// To set: { single-customValues: { name: 'name', value: 'value'} }
							{
								displayName: 'Property Name',
								name: 'name',
								type: 'string',
								default: '',
								requestProperty: {
									property: '=single-customValues.name',
								},
								description: 'Name of the property to set.',
							},
							{
								displayName: 'Property Value',
								name: 'value',
								type: 'string',
								default: '',
								requestProperty: {
									property: '=single-customValues.value',
								},
								description: 'Value of the property to set.',
							},
						],
					},
				],
			},

			// Test fixed collection: multipleValues=true
			{
				displayName: 'Custom Properties (multi)',
				name: 'customPropertiesMulti',
				placeholder: 'Add Custom Property',
				description: 'Adds a custom property to set also values which have not been predefined.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'property0',
						displayName: 'Property0',
						values: [

							// To set: { name0: 'value0', name1: 'value1' }
							{
								displayName: 'Property Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the property to set.',
							},
							{
								displayName: 'Property Value',
								name: 'value',
								type: 'string',
								default: '',
								requestProperty: {
									property: '={{$self.name}}',
								},
								description: 'Value of the property to set.',
							},
						],
					},


					{
						name: 'property1',
						displayName: 'Property1',
						values: [
							// To set: { customValues: [ { name: 'name0', value: 'value0'}, { name: 'name1', value: 'value1'} ]}
							{
								displayName: 'Property Name',
								name: 'name',
								type: 'string',
								default: '',
								requestProperty: {
									property: '=customValues[{{$index}}].name',
								},
								description: 'Name of the property to set.',
							},
							{
								displayName: 'Property Value',
								name: 'value',
								type: 'string',
								default: '',
								requestProperty: {
									property: '=customValues[{{$index}}].value',
								},
								description: 'Value of the property to set.',
							},
						],
					},

				],
			},

		],
	};

}
