import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	mailCheckApiRequest,
} from './GenericFunctions';

export class Mailcheck implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mailcheck',
		name: 'mailcheck',
		icon: 'file:mailcheck.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Mailcheck API',
		defaults: {
			name: 'Mailcheck',
			color: '#4f44d7',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mailcheckApi',
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
						name: 'Email',
						value: 'email',
					},
				],
				default: 'email',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
					},
				},
				options: [
					{
						name: 'Check',
						value: 'check',
					},
				],
				default: 'check',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'check',
						],
					},
				},
				default: '',
				description: 'Email address to check.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'email') {
					if (operation === 'check') {
						const email = this.getNodeParameter('email', i) as string;
						responseData = await mailCheckApiRequest.call(this, 'POST', '/singleEmail:check', { email });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
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
