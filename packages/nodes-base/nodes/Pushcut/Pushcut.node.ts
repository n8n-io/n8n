import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { pushcutApiRequest } from './GenericFunctions';

export class Pushcut implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pushcut',
		name: 'pushcut',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:pushcut.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Pushcut API',
		defaults: {
			name: 'Pushcut',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'pushcutApi',
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
						name: 'Notification',
						value: 'notification',
					},
				],
				default: 'notification',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['notification'],
					},
				},
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send a notification',
						action: 'Send a notification',
					},
				],
				default: 'send',
			},
			{
				displayName: 'Notification Name or ID',
				name: 'notificationName',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getNotifications',
				},
				displayOptions: {
					show: {
						resource: ['notification'],
						operation: ['send'],
					},
				},
				default: '',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['notification'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Device Names or IDs',
						name: 'devices',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getDevices',
						},
						default: [],
						description:
							'List of devices this notification is sent to. (default is all devices). Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Input',
						name: 'input',
						type: 'string',
						default: '',
						description: 'Value that is passed as input to the notification action',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						default: '',
						description: 'Text that is used instead of the one defined in the app',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Title that is used instead of the one defined in the app',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available devices to display them to user so that they can
			// select them easily
			async getDevices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const devices = await pushcutApiRequest.call(this, 'GET', '/devices');
				for (const device of devices) {
					returnData.push({
						name: device.id,
						value: device.id,
					});
				}
				return returnData;
			},
			// Get all the available notifications to display them to user so that they can
			// select them easily
			async getNotifications(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const notifications = await pushcutApiRequest.call(this, 'GET', '/notifications');
				for (const notification of notifications) {
					returnData.push({
						name: notification.title,
						value: notification.id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			if (resource === 'notification') {
				if (operation === 'send') {
					const notificationName = this.getNodeParameter('notificationName', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i);

					const body: IDataObject = {};

					Object.assign(body, additionalFields);

					responseData = await pushcutApiRequest.call(
						this,
						'POST',
						`/notifications/${encodeURI(notificationName)}`,
						body,
					);
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
