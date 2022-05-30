import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
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
		description: 'Consume Line API',
		defaults: {
			name: 'Line',
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
				noDataExpression: true,
				options: [
					{
						name: 'Notification',
						value: 'notification',
					},
				],
				default: 'notification',
			},
			...notificationOperations,
			...notificationFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {

			try {
				if (resource === 'notification') {
					//https://notify-bot.line.me/doc/en/
					if (operation === 'send') {
						const message = this.getNodeParameter('message', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							message,
						};

						Object.assign(body, additionalFields);

						if (body.hasOwnProperty('notificationDisabled')) {
							body.notificationDisabled = (body.notificationDisabled) ? 'true' : 'false';
						}

						if (body.stickerUi) {
							const sticker = (body.stickerUi as IDataObject).stickerValue as IDataObject;
							if (sticker) {
								body.stickerId = sticker.stickerId;
								body.stickerPackageId = sticker.stickerPackageId;
							}
							delete body.stickerUi;
						}

						if (body.imageUi) {
							const image = (body.imageUi as IDataObject).imageValue as IDataObject;

							if (image && image.binaryData === true) {
								if (items[i].binary === undefined) {
									throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
								}
								//@ts-ignore
								if (items[i].binary[image.binaryProperty] === undefined) {
									throw new NodeOperationError(this.getNode(), `No binary data property "${image.binaryProperty}" does not exists on item!`);
								}

								const binaryData = (items[i].binary as IBinaryKeyData)[image.binaryProperty as string];
								const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, image.binaryProperty as string);

								body.imageFile = {
									value: binaryDataBuffer,
									options: {
										filename: binaryData.fileName,
									},
								};
							} else {
								body.imageFullsize = image.imageFullsize;
								body.imageThumbnail = image.imageThumbnail;
							}
							delete body.imageUi;
						}
						responseData = await lineApiRequest.call(this, 'POST', '', {}, {}, 'https://notify-api.line.me/api/notify', { formData: body });
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);

				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}
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
