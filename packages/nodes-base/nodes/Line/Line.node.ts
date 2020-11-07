import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	lineApiRequest,
} from './GenericFunctions';

import {
	notificationFields,
	notificationOperations,
} from './NotificationDescription';

export class Line implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Line',
		name: 'line',
		icon: 'file:line.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Line API.',
		defaults: {
			name: 'Line',
			color: '#00b900',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'lineNotifyOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'notification',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Notification',
						value: 'notification',
					},
				],
				default: 'notification',
				description: 'The resource to operate on.',
			},
			...notificationOperations,
			...notificationFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {

			if (resource === 'notification') {
				//https://notify-bot.line.me/doc/en/
				if (operation === 'send') {
					const message = this.getNodeParameter('message', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const body: IDataObject = {
						message,
					};

					Object.assign(body, additionalFields);

					if (body.imageFile) {
						if (items[i].binary === undefined) {
							throw new Error('No binary data exists on item!');
						}
						//@ts-ignore
						if (items[i].binary[body.imageFile] === undefined) {
							throw new Error(`No binary data property "${body.imageFile}" does not exists on item!`);
						}

						const binaryData = (items[i].binary as IBinaryKeyData)[body.imageFile as string];

						body.imageFile = {
							value: Buffer.from(binaryData.data, BINARY_ENCODING),
							options: {
								filename: binaryData.fileName,
							},
						};					
					}
					responseData = await lineApiRequest.call(this, 'POST', '', {}, {}, 'https://notify-api.line.me/api/notify', { formData: body });
				}
			}
		}
		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);

		} else if (responseData !== undefined) {
			returnData.push(responseData as IDataObject);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
