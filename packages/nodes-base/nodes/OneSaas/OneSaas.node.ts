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
	aiFields,
	aiOperations
} from './AIDescription';

import {
	codeFields,
	codeOperations
} from './CodeDescription';

import {
	filesFields,
	filesOperations
} from './FilesDescription';

import {
	noCodeHelperFields,
	noCodeHelperOperations
} from './NoCodeHelperDescription';

import {
	randomFields,
	randomOperations
} from './RandomDescription';

import {
	oneSaasRequest,
} from './GenericFunctions';

export class OneSaas implements INodeType {
	description: INodeTypeDescription = {
		displayName: '1 SaaS',
		name: 'oneSaas',
		icon: 'file:oneSaas.png',
		group: ['transform'],
		version: 1,
		description: 'A toolbox of no-code utilities',
		defaults: {
			name: '1 SaaS',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'oneSaasApi',
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
						name: 'AI',
						value: 'ai',
					},
					{
						name: 'Code',
						value: 'code',
					},
					{
						name: 'Files',
						value: 'files',
					},
					{
						name: 'NoCode Helper',
						value: 'noCodeHelper',
					},
					{
						name: 'Random',
						value: 'random',
					},
				],
				default: 'ai',
				required: true,
			},
			// AI
			...aiOperations,
			...aiFields,
			// Code
			...codeOperations,
			...codeFields,
			// Files
			//...filesOperations,
			//...filesFields,
			// NoCode Helper
			//...noCodeHelperOperations,
			//...noCodeHelperFields,
			// Random
			//...randomOperations,
			//...randomFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		let download;
		for (let i = 0; i < length; i++) {
			try {
				const resource = this.getNodeParameter('resource', 0) as string;
				const operation = this.getNodeParameter('operation', 0) as string;
				// AI: https://docs.1saas.co/api-documentation/ai
				if (resource === 'ai') {
					if (operation === 'emailValidation') {
						const email = this.getNodeParameter('email', i) as string;
						const body: IDataObject = {
							email,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/email', body);
					}
					if (operation === 'entityDetection') {
						const text = this.getNodeParameter('text', i) as string;
						const body: IDataObject = {
							text,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/entity', body);
					}
					if (operation === 'languageValidation') {
						const text = this.getNodeParameter('text', i) as string;
						const body: IDataObject = {
							text,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/lang', body);
						responseData = responseData.languageResult;
					}
					if (operation === 'moodDetection') {
						const text = this.getNodeParameter('text', i) as string;
						const body: IDataObject = {
							text,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/mood', body);
						responseData = responseData.sentimentResult;
					}
					if (operation === 'ocr') {
						const imageUrl = this.getNodeParameter('imageUrl', i) as string;
						const body: IDataObject = {
							imageUrl,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/ocr', body);
					}
					if (operation === 'pictureRecognition') {
						const imageUrl = this.getNodeParameter('imageUrl', i) as string;
						const body: IDataObject = {
							imageUrl,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/pic', body);
						responseData = responseData.concepts;
					}
					if (operation === 'translation') {
						const text = this.getNodeParameter('text', i) as string;
						const resultLang = this.getNodeParameter('resultLang', i) as string;
						const body: IDataObject = {
							text,
							resultLang,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/translate', body);
					}
				}
				// Code : https://docs.1saas.co/api-documentation/code
				if (resource === 'code') {
					if (operation === 'javascript') {
						const code = this.getNodeParameter('code', i) as string;
						const body: IDataObject = {
							code,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/js', body);
					}
					if (operation === 'python') {
						const code = this.getNodeParameter('code', i) as string;
						const body: IDataObject = {
							code,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/py', body);
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
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
