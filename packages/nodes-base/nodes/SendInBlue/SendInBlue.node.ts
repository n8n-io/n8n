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
import { emailFields, emailOperations } from './EmailDescription';


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
			...emailOperations,
			...emailFields,
		],
	};
}
