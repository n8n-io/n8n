import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryData,
	IBinaryKeyData,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	pushoverApiRequest,
} from './GenericFunctions';

export class Pushover implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pushover',
		name: 'pushover',
		icon: 'file:pushover.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Pushover API',
		defaults: {
			name: 'Pushover',
			color: '#4b9cea',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'pushoverApi',
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
						name: 'Message',
						value: 'message',
					},
				],
				default: 'message',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'message',
						],
					},
				},
				options: [
					{
						name: 'Push',
						value: 'push',
					},
				],
				default: 'push',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'User Key',
				name: 'userKey',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'push',
						],
					},
				},
				default: '',
				description: `The user/group key (not e-mail address) of your user (or you),<br>
				viewable when logged into our <a href="https://pushover.net/">dashboard</a> (often referred to as USER_KEY in our <a href="https://support.pushover.net/i44-example-code-and-pushover-libraries"></a> and code examples)`,
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'push',
						],
					},
				},
				default: '',
				description: `Your message`,
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'push',
						],
					},
				},
				options: [
					{
						name: 'Lowest Priority',
						value: -2,
					},
					{
						name: 'Low Priority',
						value: -1,
					},
					{
						name: 'Normal Priority',
						value: 0,
					},
					{
						name: 'High Priority',
						value: 1,
					},
					{
						name: 'Emergency Priority',
						value: 2,
					},
				],
				default: -2,
				description: `send as -2 to generate no notification/alert,<br>
				-1 to always send as a quiet notification,<br>
				1 to display as high-priority and bypass the user's quiet hours, or<br>
				2 to also require confirmation from the user`,
			},
			{
				displayName: 'Retry (seconds)',
				name: 'retry',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				required: true,
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'push',
						],
						priority: [
							2,
						],
					},
				},
				default: 30,
				description: `Specifies how often (in seconds) the Pushover servers will send the same notification to the user.<br>
				This parameter must have a value of at least 30 seconds between retries.`,
			},
			{
				displayName: 'Expire (seconds)',
				name: 'expire',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 10800,
				},
				required: true,
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'push',
						],
						priority: [
							2,
						],
					},
				},
				default: 30,
				description: `Specifies how many seconds your notification will continue to be retried for (every retry seconds)`,
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'push',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Attachment',
						name: 'attachmentsUi',
						placeholder: 'Add Attachments',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						options: [
							{
								name: 'attachmentsValues',
								displayName: 'Attachment Property',
								values: [
									{
										displayName: 'Binary Property',
										name: 'binaryPropertyName',
										type: 'string',
										default: '',
										placeholder: 'data',
										description: 'Name of the binary properties which contain data which should be added to email as attachment',
									},
								],
							},
						],
						default: '',
					},
					{
						displayName: 'Device',
						name: 'device',
						type: 'string',
						default: '',
						description: `Your user's device name to send the message directly to that device,<br>
						rather than all of the user's devices (multiple devices may be separated by a comma)`,
					},
					{
						displayName: 'Sound',
						name: 'sound',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getSounds',
						},
						default: '',
						description: `The name of one of the sounds supported by device clients to override the user's default sound choice`,
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: `Your message's title, otherwise your app's name is used`,
					},
					{
						displayName: 'Timestamp',
						name: 'timestamp',
						type: 'dateTime',
						default: '',
						description: `A Unix timestamp of your message's date and time to display to the user, rather than the time your message is received by our API`,
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						description: `a supplementary URL to show with your message`,
					},
					{
						displayName: 'URL Title',
						name: 'url_title',
						type: 'string',
						default: '',
						description: `A title for your supplementary URL, otherwise just the URL is shown`,
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getSounds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { sounds } = await pushoverApiRequest.call(this, 'GET', '/sounds.json', {});
				const returnData: INodePropertyOptions[] = [];
				for (const key of Object.keys(sounds)) {
					returnData.push({
						name: sounds[key],
						value: key,
					});
				}
				return returnData;
			},
		},
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
			try {
				if (resource === 'message') {
					if (operation === 'push') {
						const userKey = this.getNodeParameter('userKey', i) as string;

						const message = this.getNodeParameter('message', i) as string;

						const priority = this.getNodeParameter('priority', i) as number;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							user: userKey,
							message,
							priority,
						};

						if (priority === 2) {
							body.retry = this.getNodeParameter('retry', i) as number;

							body.expire = this.getNodeParameter('expire', i) as number;
						}

						Object.assign(body, additionalFields);

						if (body.attachmentsUi) {
							const attachment = (body.attachmentsUi as IDataObject).attachmentsValues as IDataObject;

							if (attachment) {

								const binaryPropertyName = attachment.binaryPropertyName as string;

								if (items[i].binary === undefined) {
									throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
								}

								const item = items[i].binary as IBinaryKeyData;

								const binaryData = item[binaryPropertyName] as IBinaryData;

								if (binaryData === undefined) {
									throw new NodeOperationError(this.getNode(), `No binary data property "${binaryPropertyName}" does not exists on item!`);
								}

								const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

								body.attachment = {
									value: dataBuffer,
									options: {
										filename: binaryData.fileName,
									},
								};

								delete body.attachmentsUi;
							}
						}

						responseData = await pushoverApiRequest.call(
							this,
							'POST',
							`/messages.json`,
							body,
						);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
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
