import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType
} from 'n8n-workflow';

import { messageBirdApiRequest } from './GenericFunctions';

export class MessageBird implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MessageBird',
		name: 'messageBird',
		icon: 'file:messagebird.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sending SMS',
		defaults: {
			name: 'MessageBird',
			color: '#2481d7'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'messageBirdApi',
				required: true
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'SMS',
						value: 'sms'
					}
				],
				default: 'sms',
				description: 'The resource to operate on.'
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['sms']
					}
				},
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send text messages (SMS)'
					}
				],
				default: 'send',
				description: 'The operation to perform.'
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
						resource: ['sms']
					}
				},
				description: 'The number from which to send the message'
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
						resource: ['sms']
					}
				},
				description: 'all recipients separated by commas'
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
						resource: ['sms']
					}
				},
				description: 'The message to be send'
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Fields',
				default: {},
				options: [
					//date-time format
					{
						displayName: 'Created Date-time',
						name: 'createdDatetime',
						type: 'dateTime',
						placeholder: '2011-08-30T09:30:16.768-04:00',
						default: '',
						description:
							'The date and time of the creation of the message in RFC3339 format (Y-m-dTH:i:sP).'
					},
					{
						displayName: 'Datacoding',
						name: 'datacoding',
						type: 'string',
						default: '',
						description:
							'Using unicode will limit the maximum number of characters to 70 instead of 160'
					},
					{
						displayName: 'Gateway',
						name: 'gateway',
						type: 'number',
						default: '',
						description: 'The SMS route that is used to send the message.'
					},
					{
						displayName: 'Group Ids',
						name: 'groupIds',
						placeholder: '1,2',
						type: 'string',
						default: '',
						description:
							'group ids separated by commas, If provided recipients can be omitted'
					},
					{
						displayName: 'Mclass',
						name: 'mclass',
						type: 'options',
						placeholder: 'permissible values from 0-3',
						options: [
							{
								name: '0',
								value: '0'
							},
							{
								name: '1',
								value: '1'
							},
							{
								name: '2',
								value: '2'
							},
							{
								name: '3',
								value: '3'
							}
						],
						default: '',
						description:
							'Indicated the message type. 1 is a normal message, 0 is a flash message.'
					},
					{
						displayName: 'Reference',
						name: 'reference',
						type: 'string',
						default: '',
						description: 'A client reference.'
					},
					{
						displayName: 'Report Url',
						name: 'reportUrl',
						type: 'string',
						default: '',
						description:
							'The status report URL to be used on a per-message basis.<br /> Reference is required for a status report webhook to be sent.'
					},
					//date-time format
					{
						displayName: 'Scheduled Date-time',
						name: 'scheduledDatetime',
						type: 'dateTime',
						default: '',
						placeholder: '2011-08-30T09:30:16.768-04:00',
						description:
							'The scheduled date and time of the message in RFC3339 format (Y-m-dTH:i:sP).'
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'sms',
								value: 'sms'
							},
							{
								name: 'binary',
								value: 'binary'
							},
							{
								name: 'flash',
								value: 'flash'
							}
						],
						default: '',
						description:
							'The type of message.<br /> Values can be: sms, binary, or flash.'
					},
					//hash
					{
						displayName: 'Type Details',
						name: 'typeDetails',
						type: 'string',
						default: '',
						description:
							'A hash with extra information.<br /> Is only used when a binary message is sent.'
					},
					{
						displayName: 'Validity',
						name: 'validity',
						type: 'number',
						default: '',
						typeOptions: {
							minValue: 1
						},
						description: 'The amount of seconds that the message is valid.'
					}
				]
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let operation: string;
		let resource: string;

		// For POST
		let bodyRequest: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod;

		for (let i = 0; i < items.length; i++) {
			qs = {};

			resource = this.getNodeParameter('resource', i) as string;
			operation = this.getNodeParameter('operation', i) as string;

			if (resource === 'sms') {
				//https://developers.messagebird.com/api/sms-messaging/#sms-api
				if (operation === 'send') {
					// ----------------------------------
					//         sms:send
					// ----------------------------------

					requestMethod = 'POST';
					const originator = this.getNodeParameter('originator', i) as string;
					const body = this.getNodeParameter('message', i) as string;

					bodyRequest = {
						recipients: [],
						originator,
						body
					};
					const additionalFields = this.getNodeParameter(
						'additionalFields',
						i
					) as IDataObject;

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

					bodyRequest.recipients = receivers.split(',').map(item => {
						return parseInt(item, 10);
					});
				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const responseData = await messageBirdApiRequest.call(
				this,
				requestMethod,
				'/messages',
				bodyRequest,
				qs
			);

			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
