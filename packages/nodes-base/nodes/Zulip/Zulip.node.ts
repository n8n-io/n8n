import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	zulipApiRequest,
} from './GenericFunctions';
import {
	messageFields,
	messageOperations,
} from './MessageDescription';
import {
	IMessage,
} from './MessageInterface';
import { snakeCase } from 'change-case';

export class Zulip implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zulip',
		name: 'zulip',
		icon: 'file:zulip.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Zulip API',
		defaults: {
			name: 'Zulip',
			color: '#156742',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zulipApi',
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
						name: 'Message',
						value: 'message',
					},
				],
				default: 'message',
				description: 'Resource to consume.',
			},
			...messageOperations,
			...messageFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available streams to display them to user so that he can
			// select them easily
			async getStreams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { streams } = await zulipApiRequest.call(this, 'GET', '/streams');
				for (const stream of streams) {
					const streamName = stream.name;
					const streamId = stream.stream_id;
					returnData.push({
						name: streamName,
						value: streamId,
					});
				}
				return returnData;
			},
			// Get all the available topics to display them to user so that he can
			// select them easily
			async getTopics(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const streamId = this.getCurrentNodeParameter('stream') as string;
				const returnData: INodePropertyOptions[] = [];
				const { topics } = await zulipApiRequest.call(this, 'GET', `/users/me/${streamId}/topics`);
				for (const topic of topics) {
					const topicName = topic.name;
					const topicId = topic.name;
					returnData.push({
						name: topicName,
						value: topicId,
					});
				}
				return returnData;
			},
			// Get all the available users to display them to user so that he can
			// select them easily
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { members } = await zulipApiRequest.call(this, 'GET', '/users');
				for (const member of members) {
					const memberName = member.full_name;
					const memberId = member.email;
					returnData.push({
						name: memberName,
						value: memberId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'message') {
				//https://zulipchat.com/api/send-message
				if (operation === 'sendPrivate') {
					const to = (this.getNodeParameter('to', i) as string[]).join(',');
					const content = this.getNodeParameter('content', i) as string;
					const body: IMessage = {
						type: 'private',
						to,
						content,
					};
					responseData = await zulipApiRequest.call(this, 'POST', '/messages', body);
				}
				//https://zulipchat.com/api/send-message
				if (operation === 'sendStream') {
					const stream = this.getNodeParameter('stream', i) as string;
					const topic = this.getNodeParameter('topic', i) as string;
					const content = this.getNodeParameter('content', i) as string;
					const body: IMessage = {
						type: 'stream',
						to: stream,
						topic,
						content,
					};
					responseData = await zulipApiRequest.call(this, 'POST', '/messages', body);
				}
				//https://zulipchat.com/api/update-message
				if (operation === 'update') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const body: IMessage = {};
					if (updateFields.content) {
						body.content = updateFields.content as string;
					}
					if (updateFields.propagateMode) {
						body.propagat_mode = snakeCase(updateFields.propagateMode as string);
					}
					if (updateFields.topic) {
						body.topic = updateFields.topic as string;
					}
					responseData = await zulipApiRequest.call(this, 'PATCH', `/messages/${messageId}`, body);
				}
				//https://zulipchat.com/api/get-raw-message
				if (operation === 'get') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					responseData = await zulipApiRequest.call(this, 'GET', `/messages/${messageId}`);
				}
				//https://zulipchat.com/api/delete-message
				if (operation === 'delete') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					responseData = await zulipApiRequest.call(this, 'DELETE', `/messages/${messageId}`);
				}
				//https://zulipchat.com/api/upload-file
				if (operation === 'updateFile') {
					const credentials = this.getCredentials('zulipApi');
					const binaryProperty = this.getNodeParameter('dataBinaryProperty', i) as string;
					if (items[i].binary === undefined) {
						throw new Error('No binary data exists on item!');
					}
					//@ts-ignore
					if (items[i].binary[binaryProperty] === undefined) {
						throw new Error(`No binary data property "${binaryProperty}" does not exists on item!`);
					}
					const formData = {
						file: {
							//@ts-ignore
							value: Buffer.from(items[i].binary[binaryProperty].data, BINARY_ENCODING),
							options: {
								//@ts-ignore
								filename: items[i].binary[binaryProperty].fileName,
								//@ts-ignore
								contentType: items[i].binary[binaryProperty].mimeType,
							}
						}
					};
					responseData = await zulipApiRequest.call(this, 'POST', '/user_uploads', {}, {}, undefined, { formData } );
					responseData.uri = `${credentials!.url}${responseData.uri}`;
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
