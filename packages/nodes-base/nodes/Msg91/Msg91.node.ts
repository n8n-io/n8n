import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	msg91ApiRequest,
} from './GenericFunctions';


export class Msg91 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MSG91',
		name: 'msg91',
		icon: 'file:msg91.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends transactional SMS via MSG91',
		defaults: {
			name: 'Msg91',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'msg91Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'SMS',
						value: 'sms',
					},
				],
				default: 'sms',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'sms',
						],
					},
				},
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send SMS',
					},
				],
				default: 'send',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Sender ID',
				name: 'from',
				type: 'string',
				default: '',
				placeholder: '4155238886',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'sms',
						],
					},
				},
				description: 'The number from which to send the message.',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: '+14155238886',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'sms',
						],
					},
				},
				description: 'The number, with coutry code, to which to send the message.',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'sms',
						],
					},
				},
				description: 'The message to send',
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let operation: string;
		let resource: string;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;

		for (let i = 0; i < items.length; i++) {
			endpoint = '';
			body = {};
			qs = {};

			resource = this.getNodeParameter('resource', i) as string;
			operation = this.getNodeParameter('operation', i) as string;

			if (resource === 'sms') {
				if (operation === 'send') {
					// ----------------------------------
					//         sms:send
					// ----------------------------------

					requestMethod = 'GET';
					endpoint = '/sendhttp.php';

					qs.route = 4;
					qs.country = 0;
					qs.sender = this.getNodeParameter('from', i) as string;
					qs.mobiles = this.getNodeParameter('to', i) as string;
					qs.message = this.getNodeParameter('message', i) as string;

				} else {
					throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
				}
			} else {
				throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
			}

			const responseData = await msg91ApiRequest.call(this, requestMethod, endpoint, body, qs);

			returnData.push({ requestId: responseData });
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
