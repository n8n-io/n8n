import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	msg91ApiRequest,
} from './GenericFunctions';


export class Msg91 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Msg91',
		name: 'msg91',
		icon: 'file:msg91.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send Transactional SMS',
		defaults: {
			name: 'Msg91',
			color: '#0000ff',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'msg91Api',
				required: true,
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
				displayName: 'Sender',
				name: 'sender',
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
				description: 'The number from which to send the message',
			},
			{
				displayName: 'To',
				name: 'mobiles',
				type: 'string',
				default: '',
				placeholder: 'Mobile Number With Country Code',
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
				description: 'The number to which to send the message',
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
		]
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
			requestMethod = 'GET';
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
					endpoint = 'https://api.msg91.com/api/sendhttp.php';

					qs.route = 4;
					qs.country = 0;
					qs.sender = this.getNodeParameter('sender', i) as string;
					qs.mobiles = this.getNodeParameter('mobiles', i) as string;
					qs.message = this.getNodeParameter('message', i) as string;

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const responseData = await msg91ApiRequest.call(this, requestMethod, endpoint, body, qs);

			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
