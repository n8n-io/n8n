import {
	IDataObject,
	IExecuteFunctions,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IRequestOptionsFromParameters,
} from 'n8n-workflow';
import { contactFields, contactOperations } from './ContactDescription';

export class Sendinblue implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sendinblue',
		name: 'sendinblue',
		icon: 'file:sendinblue.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Sendinblue API',
		defaults: {
			name: 'Sendinblue',
			color: '#044a75'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sendinblueApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.domain}}',
			url: '',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
		},
		requestOperations: {
			pagination: {
				type: 'offset',
				properties: {
					limitParameter: 'limit',
					offsetParameter: 'offset',
					pageSize: 1,
					type: 'query',
					// rootProperty: 'data',
				},
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Sender',
						value: 'sender',
					},
				],
				default: 'email',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [
							'email',
						],
					},
				},
				options: [
					{
						name: 'Send',
						value: 'send',
					},
				],
				routing: {
					request: {
						method: 'POST',
						url: '/smtp/email',
					},
				},
				default: 'send',
			},
			{
				displayName: 'Sender',
				name: 'sender',
				placeholder: 'Add Sender',
				required: true,
				type: 'fixedCollection',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'send',
						],
					},
				},
				default: {},
				options: [
					{
						name: 'sender',
						displayName: 'Sender',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=sender.name',
										type: 'body',
									},
								},
								description: 'Name of the sender',
							},
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=sender.email',
										type: 'body',
									},
								},
								description: 'Email of the sender',
							},
						],
					},
				],
			},
			{
				displayName: 'Receipients',
				name: 'receipients',
				placeholder: 'Add Receipient',
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
							'send',
						],
					},
				},
				default: {},
				options: [
					{
						name: 'receipient',
						displayName: 'Receipient',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=to[{{$index}}].name',
										type: 'body',
									},
								},
								description: 'Name of the receipient',
							},
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=to[{{$index}}].email',
										type: 'body',
									},
								},
								description: 'Email of the receipient',
							},
						],
					},
				],
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'send',
						],
					},
				},
				routing: {
					send: {
						property: 'subject',
						type: 'body',
					},
				},
				default: '',
				description: 'Subject of the email',
			},
			{
				displayName: 'Text Content',
				name: 'textContent',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'send',
						],
					},
				},
				routing: {
					send: {
						property: 'textContent',
						type: 'body',
					},
				},
				default: '',
				description: 'Text content of the message',
			},
			{
				displayName: 'HTML Content',
				name: 'htmlContent',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'send',
						],
					},
				},
				routing: {
					send: {
						property: 'htmlContent',
						type: 'body',
					},
				},
				default: '',
				description: 'HTML content of the message',
			},
			{
				displayName: 'Additional Parameters',
				name: 'additionalParameters',
				placeholder: 'Add Parameter',
				description: 'Additional fields to add',
				type: 'collection',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'send',
						],
					},
				},
				options: [
					{
						displayName: 'Receipients BCC',
						name: 'receipientsBCC',
						placeholder: 'Add BCC',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'receipientBcc',
								displayName: 'Receipient',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										routing: {
											send: {
												property: '=bcc[{{$index}}].name',
												type: 'body',
											},
										},
										description: 'Name of the BCC receipient',
									},
									{
										displayName: 'Email',
										name: 'email',
										type: 'string',
										default: '',
										routing: {
											send: {
												property: '=bcc[{{$index}}].email',
												type: 'body',
											},
										},
										description: 'Email of the BCC receipient',
									},
								],
							},
						],
					},
					{
						displayName: 'Receipients CC',
						name: 'receipientsCC',
						placeholder: 'Add CC',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'receipientCc',
								displayName: 'Receipient',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										routing: {
											send: {
												property: '=cc[{{$index}}].name',
												type: 'body',
											},
										},
										description: 'Name of the CC receipient',
									},
									{
										displayName: 'Email',
										name: 'email',
										type: 'string',
										default: '',
										routing: {
											send: {
												property: '=cc[{{$index}}].email',
												type: 'body',
											},
										},
										description: 'Email of the CC receipient',
									},
								],
							},
						],
					},
				],
			},

			// Sender
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [
							'sender',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
					},
					{
						name: 'Delete',
						value: 'delete',
					},
					{
						name: 'Get All',
						value: 'getAll',
							// Possible to overwrite requestOperations on option level
							// requestOperations: {
							// 	pagination: {
							// 		type: 'offset',
							// 		properties: {
							// 			limitParameter: 'limit',
							// 			offsetParameter: 'offset',
							// 			pageSize: 10,
							// 			type: 'query',
							// 			// rootProperty: 'data',
							// 		},
							// 	},
							// },
					},
				],
				// Possible to overwrite requestOperations on parameter level
				// requestOperations: {
				// 	pagination: {
				// 		type: 'offset',
				// 		properties: {
				// 			limitParameter: 'limit',
				// 			offsetParameter: 'offset',
				// 			pageSize: 10,
				// 			type: 'query',
				// 			// rootProperty: 'data',
				// 		},
				// 	},
				// },
				default: 'create',
			},

			// sender:create
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: [
							'sender',
						],
						operation: [
							'create',
						],
					},
				},
				routing: {
					request: {
						method: 'POST',
						url: '/senders',
					},
					send: {
						property: 'name',
						type: 'body',
						// postReceive: {
						// 	type: 'set',
						// 	properties: {
						// 		value: '={{ { "success": true } }}',
						// 		// value: '={{ { "success": $response } }}',
						// 	},
						// },
					},
				},
				description: 'Name of the sender',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: [
							'sender',
						],
						operation: [
							'create',
						],
					},
				},
				routing: {
					send: {
						property: 'email',
						type: 'body',
					},
				},
				description: 'Email of the sender',
			},

			// sender:delete
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: [
							'sender',
						],
						operation: [
							'delete',
						],
					},
				},
				routing: {
					request: {
						method: 'DELETE',
						url: '=/senders/{{$value}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}',
								},
							},
						],
						// async postReceive (this: IExecuteSingleFunctions, item: IDataObject | IDataObject[]): Promise<IDataObject | IDataObject[] | null> {
						// 	return {
						// 		success: true,
						// 	};
						// },
					},
				},
				description: 'ID of the sender to delete',
			},

			// sender:getAll
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'sender',
						],
						operation: [
							'getAll',
						],
					},
				},
				default: false,
				routing: {
					request: {
						method: 'GET',
						url: 'senders',
					},
					send: {
						paginate: true,
						// postReceive: {
						// 	type: 'set',
						// 	properties: {
						// 		value: '={{ $response.body.senders }}',
						// 		// value: '={{ { "success": $response } }}', // Also possible to use the original response data
						// 	},
						// },
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'senders',
								},
							},
						],
					},
				},
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: [
							'sender',
						],
						operation: [
							'getAll',
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
				routing: {
					output: {
						maxResults: '={{$value}}', // Set maxResults to the value of current parameter
					},
				},
				description: 'Max number of results to return',
			},
			...contactOperations,
			...contactFields,
		],
	};
}
