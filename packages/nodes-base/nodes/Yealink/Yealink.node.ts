import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

import {
	deviceFields,
	deviceOperations,
	regionFields,
	regionOperations,
	rpsDeviceFields,
	rpsDeviceOperations,
	staffFields,
	staffOperations
} from './descriptions';

import {
	simplify,
	yealinkApiRequest,
	yealinkApiRequestAllItems,
} from './GenericFunctions';

import { OptionsWithUri } from 'request';

import { v4 as uuidv4 } from 'uuid';

import * as crypto from 'crypto';

export class Yealink implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Yealink',
		name: 'yealink',
		icon: 'file:yealink.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Yealink API',
		defaults: {
				name: 'Yealink',
				color: '#4C6363',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'yealinkApi',
				required: true,
				// testedBy: 'testYealinkApiAuth',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				required: true,
				type: 'options',
				options: [
					{
						name: 'Device',
						value: 'device',
					},
					{
						name: 'Region',
						value: 'region',
					},
					{
						name: 'RPS Device',
						value: 'rpsDevice',
					},
					{
						name: 'Staff',
						value: 'staff',
					},
				],
				default: 'device',
			},
			...deviceOperations,
			...deviceFields,
			...regionOperations,
			...regionFields,
			...rpsDeviceOperations,
			...rpsDeviceFields,
			...staffOperations,
			...staffFields,
			{
				displayName: 'Simplify Output',
				name: 'simplifyOutput',
				type: 'boolean',
				default: false,
				description: 'Simplify the output data',
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the Device IDs to display them to user so that he can
			// select them easily
			async getDeviceIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const responseData = await yealinkApiRequest.call(this, 'POST', 'api/open/v1/manager/device/getSearchList');

				for (const data of responseData) {
					returnData.push({
						name: data.id,
						value: data.id,
					});
				}

				// returnData.sort((a, b) => {
				// 	if (a.name < b.name) { return -1; }
				// 	if (a.name > b.name) { return 1; }
				// 	return 0;
				// });

				return returnData;
			},

			// Get all the Device MACs to display them to user so that he can
			// select them easily
			async getDeviceMacs(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const responseData = await yealinkApiRequest.call(this, 'POST', 'api/open/v1/manager/device/getSearchList');

				for (const data of responseData) {
					returnData.push({
						name: data.mac,
						value: data.mac,
					});
				}

				// returnData.sort((a, b) => {
				// 	if (a.name < b.name) { return -1; }
				// 	if (a.name > b.name) { return 1; }
				// 	return 0;
				// });

				return returnData;
			},

			// Get all the Server IDs to display them to user so that he can
			// select them easily
			async getServerIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				let responseData = await yealinkApiRequest.call(this, 'POST', 'api/open/v1/manager/rpsServer/getPagedList');
				responseData = simplify(responseData);

				for (const data of responseData) {
					returnData.push({
						name: data.id,
						value: data.id,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});

				return returnData;
			},

			// // Get all the Staff IDs to display them to user so that he can
			// // select them easily
			// async getStaffIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
			// 	const returnData: INodePropertyOptions[] = [];
			//
			// 	const responseData = await yealinkApiRequestAllItems.call(this, 'POST', 'api/open/v1/manager/staff/findPagedList');
			//
			// 	for (const data of responseData) {
			// 		returnData.push({
			// 			name: data.id,
			// 			value: data.id,
			// 		});
			// 	}
			//
			// 	returnData.sort((a, b) => {
			// 		if (a.name < b.name) { return -1; }
			// 		if (a.name > b.name) { return 1; }
			// 		return 0;
			// 	});
			//
			// 	return returnData;
			// },

			// Get all the Region IDs to display them to user so that he can
			// select them easily
			async getRegionIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				let responseData = await yealinkApiRequest.call(this, 'GET', 'api/open/v1/manager/region/getAll');
				responseData = simplify(responseData);

				for (const data of responseData) {
					returnData.push({
						name: data.id,
						value: data.id,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});

				return returnData;
			},
		},

		// credentialTest: {
		// 	async testYealinkApiAuth(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
		//
		// 		const endpoint = 'api/open/v1/manager/region/getAll';
		// 		const method = 'GET';
		// 		const body: IDataObject = {
		// 			limit: 1,
		// 		};
		//
		// 		// Get key/secret
		// 		const key = credential.data!.xCaKey as string;
		// 		const secret = credential.data!.secret as string;
		//
		// 		// Set API URI variable
		// 		const uri = `${credential.data!.url}/${endpoint}`;
		//
		// 		// Generate UUID
		// 		const guid = uuidv4()
		// 			.replace(/-/g,''); // remove the "-"
		//
		// 		// Get unix timestamp in ms
		// 		const timestamp = Date.now();
		//
		// 		// Generate Content MD5
		// 		const contentMd5 = crypto.createHash('md5').update(JSON.stringify(body)).digest('base64');
		//
		// 		// Generate string for signing
		// 		const sigString = method + '\n' +
		// 			'Content-MD5:' + contentMd5 + '\n' +
		// 			'X-Ca-Key:' + key + '\n' +
		// 			'X-Ca-Nonce:' + guid + '\n' +
		// 			'X-Ca-Timestamp:' + timestamp + '\n' +
		// 			uri;
		// 		const sign = crypto.createHmac('sha256', secret).update(sigString).digest('base64');
		//
		// 		const options: OptionsWithUri = {
		// 			method,
		// 			headers: {
		// 				'Content-MD5': contentMd5,
		// 				'X-Ca-Key': credential.data!.xCaKey,
		// 				'X-Ca-Timestamp': timestamp,
		// 				'X-Ca-Nonce': guid,
		// 				'X-Ca-Signature': sign,
		// 				'Content-Type': 'application/json',
		// 				'Charset': 'UTF-8',
		// 			},
		// 			body,
		// 			uri,
		// 			json: true,
		// 		};
		//
		// 		try {
		// 			const response = await this.helpers.request(options);
		//
		// 			if (response.status === false) {
		// 				return {
		// 					status: 'Error',
		// 					message: `${response.error}`,
		// 				};
		// 			}
		// 		} catch (err) {
		// 			return {
		// 				status: 'Error',
		// 				message: `${err.message}`,
		// 			};
		// 		}
		//
		// 		return {
		// 			status: 'OK',
		// 			message: 'Connection successful!',
		// 		};
		// 	},
		// },
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let responseData;
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const simplifyOutput = this.getNodeParameter('simplifyOutput', 0) as boolean;
		const body: IDataObject = {};
		const qs: IDataObject = {};

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'device') {
					if (operation === 'add') {
						body.mac = this.getNodeParameter('mac', i) as string;
						body.modelId = this.getNodeParameter('modelId', i) as string;
						body.regionId = this.getNodeParameter('regionId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						if(additionalFields.staffs !== undefined && (additionalFields.staffs as IDataObject).metadataValues !== undefined) {
						 	body.staffs = (additionalFields.staffs as IDataObject).metadataValues;
						 	delete additionalFields.staffs;
						}
						if(additionalFields.staffIds !== undefined) {
						 	body.staffIds = (additionalFields.staffIds as IDataObject[]).map(a => a.id);
						 	delete additionalFields.staffIds;
						}
						Object.assign(body, additionalFields);

						responseData = await yealinkApiRequest.call(this, 'POST', 'api/open/v1/manager/device/add', body);

					} else if (operation === 'batchDelete') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						if(additionalFields.deviceIds !== undefined) {
							body.deviceIds = (additionalFields.deviceIds as IDataObject[]).map(a => a.id);
							delete additionalFields.deviceIds;
						}
						if(additionalFields.macs !== undefined) {
							body.macs = (additionalFields.macs as IDataObject[]).map(a => a.mac);
							delete additionalFields.macs;
						}
						Object.assign(body, additionalFields);

						responseData = await yealinkApiRequest.call(this, 'POST', 'api/open/v1/manager/device/batchDelete', body);

					} else if (operation === 'edit') {
						body.id = this.getNodeParameter('id', i) as string;
						body.regionId = this.getNodeParameter('regionId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						if(additionalFields.staffs !== undefined && (additionalFields.staffs as IDataObject).metadataValues !== undefined) {
						 	body.staffs = (additionalFields.staffs as IDataObject).metadataValues;
						 	delete additionalFields.staffs;
						}
						if(additionalFields.staffIds !== undefined) {
						 	body.staffIds = (additionalFields.staffIds as IDataObject[]).map(a => a.id);
						 	delete additionalFields.staffIds;
						}
						Object.assign(body, additionalFields);

						responseData = await yealinkApiRequest.call(this, 'POST', 'api/open/v1/manager/device/edit', body);

					} else if (operation === 'getComplexList') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						if(additionalFields.orderbys !== undefined && (additionalFields.orderbys as IDataObject).metadataValues !== undefined) {
						 	body.orderbys = (additionalFields.orderbys as IDataObject).metadataValues;
						 	delete additionalFields.orderbys;
						 }
						Object.assign(body, additionalFields);

						responseData = await yealinkApiRequest.call(this, 'POST', 'api/open/v1/manager/device/getComplexList', body);

					} else if (operation === 'getSearchList') {
						body.mac = this.getNodeParameter('mac', i) as string;
						body.username = this.getNodeParameter('username', i) as string;
						body.regionIds = this.getNodeParameter('regionIds', i) as string[];
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						if(additionalFields.orderbys !== undefined && (additionalFields.orderbys as IDataObject).metadataValues !== undefined) {
						 	body.orderbys = (additionalFields.orderbys as IDataObject).metadataValues;
						 	delete additionalFields.orderbys;
						 }
						Object.assign(body, additionalFields);

						responseData = await yealinkApiRequest.call(this, 'POST', 'api/open/v1/manager/device/getSearchList', body);

					}

				} else if (resource === 'region') {
					if (operation === 'add') {
						body.parentId = this.getNodeParameter('parentId', i) as string;
						body.name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						responseData = await yealinkApiRequest.call(this, 'POST', 'api/open/v1/manager/region/add', body);

					} else if (operation === 'getAll') {
						responseData = await yealinkApiRequest.call(this, 'GET', 'api/open/v1/manager/region/getAll');

					}
				} else if (resource === 'rpsDevice') {
					if (operation === 'checkDevice') {
						qs.mac = this.getNodeParameter('mac', i) as string;
						responseData = await yealinkApiRequest.call(this, 'GET', 'api/open/v1/manager/rpsDevice/checkDevice', undefined, qs);

					} else if (operation === 'checkMac') {
						qs.mac = this.getNodeParameter('mac', i) as string;
						responseData = await yealinkApiRequest.call(this, 'GET', 'api/open/v1/manager/rpsDevice/checkMac', undefined, qs);

					}
				} else if (resource === 'staff') {
					if (operation === 'addSip') {
						body.sipRegisterName = this.getNodeParameter('sipRegisterName', i) as string;
						body.username = this.getNodeParameter('username', i) as string;
						body.password = this.getNodeParameter('password', i) as string;
						body.sipServer1 = this.getNodeParameter('sipServer1', i) as string;
						body.sipPort1 = this.getNodeParameter('sipPort1', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						responseData = await yealinkApiRequest.call(this, 'POST', 'api/open/v1/manager/staff/addSip', body);

					} else if (operation === 'findPagedList') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						 if(additionalFields.orderbys !== undefined && (additionalFields.orderbys as IDataObject).metadataValues !== undefined) {
						 	body.orderbys = (additionalFields.orderbys as IDataObject).metadataValues;
						 	delete additionalFields.orderbys;
						 }
						Object.assign(body, additionalFields);

						responseData = await yealinkApiRequest.call(this, 'POST', 'api/open/v1/manager/staff/findPagedList', body);

					}
				}

				if (responseData.error !== null && responseData.error !== undefined) {
					throw new NodeApiError(this.getNode(), responseData.error);
				} else if (simplifyOutput) {
					responseData = simplify(responseData);
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}
			}  catch (error) {
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
