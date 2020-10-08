import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	handleMatrixCall,
} from './GenericFunctions';

import {
	accountOperations
} from './AccountDescription'

import {
	eventOperations,
	eventFields,
} from './EventDescription'

import {
	mediaFields,
	mediaOperations,
} from './MediaDescription'

import {
	messageOperations,
	messageFields,
} from './MessageDescription'

import {
	roomOperations,
	roomFields,
} from './RoomDescription'

import {
	syncOperations,
	syncFields,
} from './SyncDescription'


export class Matrix implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Matrix',
		name: 'matrix',
		icon: 'file:matrix.png',
		group: ['output'],
		version: 1,
		description: 'Consume Matrix API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Matrix',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'matrixApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
				],
				default: 'accessToken',
				description: 'The resource to operate on.',
			},

			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'Media',
						value: 'media',
					},
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'Room',
						value: 'room',
					},
					{
						name: 'Sync',
						value: 'sync',
					},
				],
				default: 'message',
				description: 'The resource to operate on.',
			},
			...messageOperations,
			...messageFields,
			...accountOperations,
			...roomOperations,
			...roomFields,
			...eventOperations,
			...eventFields,
			...syncOperations,
			...syncFields,
			...mediaOperations,
			...mediaFields,

		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData() as IDataObject[];
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		
		for (let i = 0; i < items.length; i++) {
			let responseData = await handleMatrixCall.call(this, items[i], i, resource, operation);
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}


		return [this.helpers.returnJsonArray(returnData)];

	}
}
