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
		displayName: '1SaaS.co',
		name: 'oneSaas',
		icon: 'file:1SaaS.co.svg',
		group: ['transform'],
		version: 1,
		description: 'A toolbox of no-code utilities',
		defaults: {
			name: '1SaaS.co',
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
					/*{
						name: 'Files',
						value: 'files',
					},*/
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
			...noCodeHelperOperations,
			...noCodeHelperFields,
			// Random
			...randomOperations,
			...randomFields,
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
				// AI : https://docs.1saas.co/api-documentation/ai
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
						responseData = responseData.result;
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
				// No Code Helper
				if (resource === 'noCodeHelper') {
					if (operation === 'advancedSwitch') {
						responseData = await oneSaasRequest.call(this, 'POST', '/asw', {});
					}
					if (operation === 'bmiCalculator') {
						const height = this.getNodeParameter('height', i) as string;
						const weight = this.getNodeParameter('weight', i) as string;
						const body: IDataObject = {
							height,
							weight,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/bmi', body);
						responseData = responseData.result;
					}
					if (operation === 'calendarWeek') {
						const body: IDataObject = {
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/calweek', body);
					}
					if (operation === 'detectGenderName') {
						var firstname = this.getNodeParameter('firstname', i) as string;
						firstname = firstname.charAt(0).toUpperCase() + firstname.slice(1); // API requires first letter to be uppercase
						const body: IDataObject = {
							firstname,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/gnd', body);
					}
					if (operation === 'emailVerifier') {
						const email = this.getNodeParameter('email', i) as string;
						const body: IDataObject = {
							email,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/emailVerifier', body);
					}
					if (operation === 'expandUrl') {
						const url = this.getNodeParameter('url', i) as string;
						const body: IDataObject = {
							url,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/esu', body);
					}
					if (operation === 'globalVariable') {
						const variable = this.getNodeParameter('variable', i) as string;
						const body: IDataObject = {
							variable,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/globalVariable', body);
					}
					if (operation === 'holidayChecker') {
						const countryCode = this.getNodeParameter('countryCode', i) as string;
						const year = this.getNodeParameter('year', i) as string;
						const body: IDataObject = {
							countryCode,
							year,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/holiday', body);
						responseData = responseData.holidays;
					}
					if (operation === 'ipToGeoLocation') {
						const ip = this.getNodeParameter('ip', i) as string;
						const body: IDataObject = {
							ip,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/iptogeo', body);
					}
					if (operation === 'jsonBin') {
						const json = this.getNodeParameter('json', i) as string;
						const body: IDataObject = {
							json,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/json', body);
					}
					if (operation === 'nationToIso') {
						const name = this.getNodeParameter('country', i) as string;
						const body: IDataObject = {
							name,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/nation-iso', body);
					}
					if (operation === 'qrCode') {
						const data = this.getNodeParameter('data', i) as string;
						const body: IDataObject = {
							data,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/QR', body);
					}
					if (operation === 'replacer') {}
					if (operation === 'timezoneSwitch') {
						const destinationTimeZone = this.getNodeParameter('destinationTimeZone', i) as string;
						const inputTime = this.getNodeParameter('inputTime', i) as string;
						const inputTimeZone = this.getNodeParameter('inputTimeZone', i) as string;
						const body: IDataObject = {
							destinationTimeZone,
							inputTime,
							inputTimeZone,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/time', body);
					}
					if (operation === 'urlShortener') {
						const destination = this.getNodeParameter('url', i) as string;
						const body: IDataObject = {
							destination,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/url', body);
					}
					if (operation === 'utmParameters') {
						const url = this.getNodeParameter('url', i) as string;
						const body: IDataObject = {
							url,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/utm', body);
						responseData = responseData.url;
					}
					if (operation === 'vatIdChecker') {
						const vatID = this.getNodeParameter('vatId', i) as string;
						const body: IDataObject = {
							vatID,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/vatcheck', body);
					}
					if (operation === 'weekendChecker') {
						const date = this.getNodeParameter('date', i) as string;
						const body: IDataObject = {
							date,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/weekend', body);
					}
				}
				// Random : https://docs.1saas.co/api-documentation/random
				if (resource === 'random') {
					if (operation === 'city') {
						responseData = await oneSaasRequest.call(this, 'POST', '/city', {});
					}
					if (operation === 'name') {
						responseData = await oneSaasRequest.call(this, 'POST', '/name', {});
					}
					if (operation === 'number') {
						const range = this.getNodeParameter('range', i) as string;
						const type = this.getNodeParameter('type', i) as string;
						const body: IDataObject = {
							range,
							type,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/nr', body);
					}
					if (operation === 'string') {
						const type = this.getNodeParameter('type', i) as string;
						const leng = this.getNodeParameter('leng', i) as string;
						const body: IDataObject = {
							type,
							leng,
						};
						responseData = await oneSaasRequest.call(this, 'POST', '/string', body);

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
