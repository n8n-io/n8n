import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { newRelicApiRequest } from './GenericFunctions';

export class NewRelic implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'New Relic',
		name: 'newRelic',
		icon: 'file:newrelic.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with New Relic',
		defaults: {
			name: 'New Relic',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'newRelicApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Logs',
						value: 'logs',
					},
				],
				default: 'logs',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['logs'],
					},
				},
				options: [
					{
						name: 'Send Log',
						value: 'sendLog',
						description: 'Send a single log entry to New Relic',
						action: 'Send log',
					},
					{
						name: 'Send Batch Logs',
						value: 'sendBatchLogs',
						description: 'Send multiple log entries to New Relic in a single request',
						action: 'Send multiple logs',
					},
				],
				default: 'sendLog',
			},
			// Send Log operation fields
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['logs'],
						operation: ['sendLog'],
					},
				},
				default: '',
				required: true,
				description: 'The log message to send',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['logs'],
						operation: ['sendLog'],
					},
				},
				options: [
					{
						displayName: 'Log Type',
						name: 'logtype',
						type: 'string',
						default: '',
						description: 'The type of log being sent',
					},
					{
						displayName: 'Timestamp',
						name: 'timestamp',
						type: 'number',
						default: 0,
						description:
							'Unix timestamp in milliseconds. If not provided, New Relic will use the time the log is received.',
					},
					{
						displayName: 'Hostname',
						name: 'hostname',
						type: 'string',
						default: '',
						description: 'The hostname of the server that generated the log',
					},
					{
						displayName: 'Service',
						name: 'service',
						type: 'string',
						default: '',
						description: 'The name of the service that generated the log',
					},
					{
						displayName: 'Custom Attributes',
						name: 'customAttributes',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						placeholder: 'Add Attribute',
						description: 'Add custom attributes to the log entry',
						options: [
							{
								name: 'attribute',
								displayName: 'Attribute',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Attribute name',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Attribute value',
									},
								],
							},
						],
					},
				],
			},
			// Send Batch Logs operation fields
			{
				displayName: 'Logs',
				name: 'logs',
				type: 'json',
				displayOptions: {
					show: {
						resource: ['logs'],
						operation: ['sendBatchLogs'],
					},
				},
				default:
					'[\n  {\n    "message": "Log message 1",\n    "logtype": "my-app"\n  },\n  {\n    "message": "Log message 2",\n    "logtype": "my-app"\n  }\n]',
				required: true,
				description:
					'An array of log objects to send. Each object should contain at least a "message" field.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;

		for (let i = 0; i < length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'sendLog') {
					const message = this.getNodeParameter('message', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					const logEntry: IDataObject = {
						message,
					};

					// Add timestamp if provided
					if (additionalFields.timestamp) {
						logEntry.timestamp = additionalFields.timestamp;
					}

					// Add optional fields
					if (additionalFields.logtype) {
						logEntry.logtype = additionalFields.logtype;
					}
					if (additionalFields.hostname) {
						logEntry.hostname = additionalFields.hostname;
					}
					if (additionalFields.service) {
						logEntry.service = additionalFields.service;
					}

					// Add custom attributes
					if (additionalFields.customAttributes) {
						const attributes = (additionalFields.customAttributes as IDataObject)
							.attribute as IDataObject[];
						if (attributes && attributes.length > 0) {
							for (const attr of attributes) {
								if (attr.name && attr.value) {
									logEntry[attr.name as string] = attr.value;
								}
							}
						}
					}

					const responseData = await newRelicApiRequest.call(this, 'POST', logEntry);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				} else if (operation === 'sendBatchLogs') {
					const logsJson = this.getNodeParameter('logs', i) as string;
					let logs: IDataObject[];

					try {
						logs = JSON.parse(logsJson);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), 'Invalid JSON format for logs', {
							itemIndex: i,
						});
					}

					if (!Array.isArray(logs)) {
						throw new NodeOperationError(this.getNode(), 'Logs must be an array of log objects', {
							itemIndex: i,
						});
					}

					const responseData = await newRelicApiRequest.call(this, 'POST', logs);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
