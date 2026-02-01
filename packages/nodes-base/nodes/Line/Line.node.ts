import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { lineApiRequest } from './GenericFunctions';
import { notificationFields, notificationOperations } from './NotificationDescription';

export class Line implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Line',
		name: 'line',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:line.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Line API',
		defaults: {
			name: 'Line',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'lineNotifyOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						resource: ['notification'],
					},
				},
			},
		],
		properties: [
			{
				displayName:
					'End of service: LINE Notify will be discontinued from April 1st 2025, You can find more information <a href="https://notify-bot.line.me/closing-announce" target="_blank">here</a>',
				name: 'notice',
				type: 'notice',
				default: '',
			},
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
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'notification') {
					//https://notify-bot.line.me/doc/en/
					if (operation === 'send') {
						const message = this.getNodeParameter('message', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							message,
						};

						Object.assign(body, additionalFields);

						if (body.hasOwnProperty('notificationDisabled')) {
							body.notificationDisabled = body.notificationDisabled ? 'true' : 'false';
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
								const binaryProperty = image.binaryProperty as string;
								const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
								const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);

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
						responseData = await lineApiRequest.call(
							this,
							'POST',
							'',
							{},
							{},
							'https://notify-api.line.me/api/notify',
							{ formData: body },
						);
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
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
