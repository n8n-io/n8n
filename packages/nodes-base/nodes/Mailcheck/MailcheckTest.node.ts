import {
	IDataObject,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeType,
	INodeTypeDescription,
	IRequestOptionsFromParameters,
} from 'n8n-workflow';

import { get } from 'lodash';

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
				testedBy: {
					request: {
						method: 'GET',
						url: '/webhook/maicheck-auth-test',
					},
					rules: [
						{
							type: 'responseCode',
							properties: {
								value: 403,
								message: 'Does not exist.',
							},
						},
					],
				},
			},
		],
		requestDefaults: {
			baseURL: 'http://localhost:5678',
			url: '',
		},
		// TODO: Think about proper name
		requestOperations: {
			// Different types: https://nordicapis.com/everything-you-need-to-know-about-api-pagination/
			async pagination(this: IExecutePaginationFunctions, requestData: IRequestOptionsFromParameters): Promise<IDataObject[]> {
				if (!requestData.options.qs) {
					requestData.options.qs = {};
				}
				const pageSize = 10;
				requestData.options.qs.limit = pageSize;
				requestData.options.qs.offset = 0;
				let tempResponseData: IDataObject[];
				const responseData: IDataObject[] = [];

				do {
					if (requestData?.maxResults) {
						// Only request as many results as needed
						const resultsMissing = (requestData?.maxResults as number) - responseData.length;
						if (resultsMissing < 1) {
							break;
						}
						requestData.options.qs.limit = Math.min(pageSize, resultsMissing);
					}

					tempResponseData = await this.makeRoutingRequest(requestData);
					requestData.options.qs.offset = requestData.options.qs.offset + pageSize;

					// tempResponseData = get(
					// 	tempResponseData[0],
					// 	'data',
					// 	[],
					// ) as IDataObject[];

					responseData.push(...tempResponseData);
				} while (tempResponseData.length && tempResponseData.length === pageSize);

				return responseData;
			},
			// pagination: {
			// 	type: 'offset',
			// 	properties: {
			// 		limitParameter: 'limit',
			// 		offsetParameter: 'offset',
			// 		pageSize: 10,
			// 		rootProperty: 'data',
			// 	},
			// }
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
					{
						name: 'Delete',
						value: 'delete',
					},
				],
				request: {
					method: 'POST',
					url: '/singleEmail:check',
				},
				default: 'check',
			},

			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'delete',
						],
					},
				},
				request: {
					method: 'DELETE',
					url: '=/senders/{{$value}}', // send value in path
				},
				requestProperty: {
					async postReceive (this: IExecuteSingleFunctions, item: IDataObject | IDataObject[]): Promise<IDataObject | IDataObject[] | null> {
						return {
							success: true,
						};
					},
				},
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
					async preSend (this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>  {
						requestOptions.qs = (requestOptions.qs || {}) as IDataObject;
						// if something special is required it is possible to write custom code and get from parameter
						requestOptions.qs.sender = this.getNodeParameter('sender');
						return requestOptions;
					},
					// Transform the received data
					async postReceive (this: IExecuteSingleFunctions, item: IDataObject | IDataObject[]): Promise<IDataObject | IDataObject[] | null> {
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
				displayName: 'Pagination',
				name: 'pagination',
				type: 'boolean',
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
					pagination: '={{$value}}', // Activate pagination depending on value of current parameter
				},
				default: false,
				description: 'To test pagination.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
						pagination: [
							true,
						],
					},
				},
				default: false,
				request: {
					method: 'GET',
					// url: 'webhook/pagination-offset',
					url: 'webhook/pagination-offset-sub',
				},
				requestProperty: {
					postReceive: {
						type: 'rootProperty',
						properties: {
							property: 'data',
						},
					},
				},
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
						pagination: [
							true,
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 10,
				requestProperty: {
					maxResults: '={{$value}}', // Set maxResults to the value of current parameter
				},
				description: 'How many results to return.',
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
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Some Value',
						name: 'someValue',
						type: 'string',
						requestProperty: {
							property: 'some.value',
							propertyInDotNotation: false, // send as "some.value"
							type: 'query',
						},
						default: '',
					},
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
						displayName: 'Label',
						name: 'label',
						type: 'options',
						typeOptions: {
							loadOptions: {
								request: {
									url: '/webhook/mock-option-parameters',
									method: 'GET',
								},
								rootProperty: 'responseData', // Optional Path to option array
								name: {
									property: 'key',
									// TODO: Is confusing that it is called $value. Should it be $value/$name instead? But
									//       then would also have to change logic in other locations where also $value gets used.
									value: '={{$value.toUpperCase()}} ({{$self.value}})',
								},
								value: {
									property: 'value',
									value: '={{$value}}',
								},
								sort: true,
							},
						},
						default: '',
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
									property: 'single-customValues.name',
								},
								description: 'Name of the property to set.',
							},
							{
								displayName: 'Property Value',
								name: 'value',
								type: 'string',
								default: '',
								requestProperty: {
									property: 'single-customValues.value',
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
