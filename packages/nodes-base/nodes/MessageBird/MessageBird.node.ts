import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { messageBirdApiRequest } from './GenericFunctions';

export class MessageBird implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MessageBird',
		name: 'messageBird',
		icon: 'file:messagebird.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends SMS via MessageBird',
		defaults: {
			name: 'MessageBird',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'messageBirdApi',
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
						name: 'SMS',
						value: 'sms',
					},
					{
						name: 'Balance',
						value: 'balance',
					},
				],
				default: 'sms',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['sms'],
					},
				},
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send text messages (SMS)',
						action: 'Send an SMS',
					},
				],
				default: 'send',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['balance'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get the balance',
						action: 'Get the current balance',
					},
				],
				default: 'get',
			},

			// ----------------------------------
			//         sms:send
			// ----------------------------------
			{
				displayName: 'From',
				name: 'originator',
				type: 'string',
				default: '',
				placeholder: '14155238886',
				required: true,
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
					},
				},
				description: 'The number from which to send the message',
			},
			{
				displayName: 'To',
				name: 'recipients',
				type: 'string',
				default: '',
				placeholder: '14155238886/+14155238886',
				required: true,
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
					},
				},
				description: 'All recipients separated by commas',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
					},
				},
				description: 'The message to be send',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
					},
				},
				placeholder: 'Add Fields',
				default: {},
				options: [
					{
						displayName: 'Created Date-Time',
						name: 'createdDatetime',
						type: 'dateTime',
						default: '',
						description:
							'The date and time of the creation of the message in RFC3339 format (Y-m-dTH:i:sP)',
					},
					{
						displayName: 'Datacoding',
						name: 'datacoding',
						type: 'options',
						options: [
							{
								name: 'Auto',
								value: 'auto',
							},
							{
								name: 'Plain',
								value: 'plain',
							},
							{
								name: 'Unicode',
								value: 'unicode',
							},
						],
						default: '',
						description:
							'Using unicode will limit the maximum number of characters to 70 instead of 160',
					},
					{
						displayName: 'Gateway',
						name: 'gateway',
						type: 'number',
						default: '',
						description: 'The SMS route that is used to send the message',
					},
					{
						displayName: 'Group IDs',
						name: 'groupIds',
						placeholder: '1,2',
						type: 'string',
						default: '',
						description: 'Group IDs separated by commas, If provided recipients can be omitted',
					},
					{
						displayName: 'Message Type',
						name: 'mclass',
						type: 'options',
						placeholder: 'Permissible values from 0-3',
						options: [
							{
								name: 'Flash',
								value: 1,
							},
							{
								name: 'Normal',
								value: 0,
							},
						],
						default: 1,
						description: 'Indicated the message type. 1 is a normal message, 0 is a flash message.',
					},
					{
						displayName: 'Reference',
						name: 'reference',
						type: 'string',
						default: '',
						description: 'A client reference',
					},
					{
						displayName: 'Report Url',
						name: 'reportUrl',
						type: 'string',
						default: '',
						description:
							'The status report URL to be used on a per-message basis. Reference is required for a status report webhook to be sent.',
					},
					{
						displayName: 'Scheduled Date-Time',
						name: 'scheduledDatetime',
						type: 'dateTime',
						default: '',
						description:
							'The scheduled date and time of the message in RFC3339 format (Y-m-dTH:i:sP)',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Binary',
								value: 'binary',
							},
							{
								name: 'Flash',
								value: 'flash',
							},
							{
								name: 'SMS',
								value: 'sms',
							},
						],
						default: '',
						description: 'The type of message. Values can be: sms, binary, or flash.',
					},
					{
						displayName: 'Type Details',
						name: 'typeDetails',
						type: 'string',
						default: '',
						description:
							'A hash with extra information. Is only used when a binary message is sent.',
					},
					{
						displayName: 'Validity',
						name: 'validity',
						type: 'number',
						default: 1,
						typeOptions: {
							minValue: 1,
						},
						description: 'The amount of seconds that the message is valid',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let operation: string;
		let resource: string;

		// For POST
		let bodyRequest: IDataObject = {};
		// For Query string
		let qs: IDataObject;

		let requestMethod;
		let requestPath;

		for (let i = 0; i < items.length; i++) {
			qs = {};
			try {
				resource = this.getNodeParameter('resource', i);
				operation = this.getNodeParameter('operation', i);

				if (resource === 'sms') {
					//https://developers.messagebird.com/api/sms-messaging/#sms-api
					if (operation === 'send') {
						// ----------------------------------
						//         sms:send
						// ----------------------------------

						requestMethod = 'POST';
						requestPath = '/messages';
						const originator = this.getNodeParameter('originator', i) as string;
						const body = this.getNodeParameter('message', i) as string;

						bodyRequest = {
							recipients: [],
							originator,
							body,
						};
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.groupIds) {
							bodyRequest.groupIds = additionalFields.groupIds as string;
						}
						if (additionalFields.type) {
							bodyRequest.type = additionalFields.type as string;
						}
						if (additionalFields.reference) {
							bodyRequest.reference = additionalFields.reference as string;
						}
						if (additionalFields.reportUrl) {
							bodyRequest.reportUrl = additionalFields.reportUrl as string;
						}
						if (additionalFields.validity) {
							bodyRequest.validity = additionalFields.reportUrl as number;
						}
						if (additionalFields.gateway) {
							bodyRequest.gateway = additionalFields.gateway as string;
						}
						if (additionalFields.typeDetails) {
							bodyRequest.typeDetails = additionalFields.typeDetails as string;
						}
						if (additionalFields.datacoding) {
							bodyRequest.datacoding = additionalFields.datacoding as string;
						}
						if (additionalFields.mclass) {
							bodyRequest.mclass = additionalFields.mclass as number;
						}
						if (additionalFields.scheduledDatetime) {
							bodyRequest.scheduledDatetime = additionalFields.scheduledDatetime as string;
						}
						if (additionalFields.createdDatetime) {
							bodyRequest.createdDatetime = additionalFields.createdDatetime as string;
						}

						const receivers = this.getNodeParameter('recipients', i) as string;
						bodyRequest.recipients = receivers.split(',').map((item) => {
							return parseInt(item, 10);
						});
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'balance') {
					requestMethod = 'GET';
					requestPath = '/balance';
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
						itemIndex: i,
					});
				}

				const responseData = await messageBirdApiRequest.call(
					this,
					requestMethod,
					requestPath,
					bodyRequest,
					qs,
				);

				returnData.push(responseData as IDataObject);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
