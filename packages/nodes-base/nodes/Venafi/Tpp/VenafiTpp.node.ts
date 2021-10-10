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
	venafiApiRequest,
	venafiApiRequestAllItems,
} from './GenericFunctions';

import {
	certificateFields,
	certificateOperations,
} from './CertificateDescription';

import {
	policyFields,
	policyOperations,
} from './PolicyDescription';

export class VenafiTpp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Venafi TPP',
		name: 'venafiTpp',
		icon: 'file:venafi.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Venafi TPP API.',
		defaults: {
			name: 'Venafi TPP',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'venafiTppApi',
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
						name: 'Certificate',
						value: 'certificate',
					},
					{
						name: 'Policy',
						value: 'policy',
					},
				],
				default: 'certificate',
				description: 'The resource to operate on.',
			},
			...certificateOperations,
			...certificateFields,
			...policyOperations,
			...policyFields,
		],
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

				if (resource === 'certificate') {
					//https://uvo1je0v1xszoaesyia.env.cloudshare.com/vedadmin/documentation/help/Content/SDK/WebSDK/r-SDK-POST-Certificates-request.htm?tocpath=Topics%20by%20Guide%7CDeveloper%27s%20Guide%7CWeb%20SDK%20reference%7CCertificates%20programming%20interface%7CPOST%20Certificates%2FRequest%7C_____0
					if (operation === 'create') {
						const policyDN = this.getNodeParameter('PolicyDN', i) as string;

						const subject = this.getNodeParameter('Subject', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							PolicyDN: policyDN,
							Subject: subject,
						};

						Object.assign(body, additionalFields);

						if (body.SubjectAltNamesUi) {

							body.SubjectAltNames = (body.SubjectAltNamesUi as IDataObject).SubjectAltNamesValues;

							delete body.SubjectAltNamesUi;
						}

						responseData = await venafiApiRequest.call(
							this,
							'POST',
							`/vedsdk/Certificates/Request`,
							body,
							qs,
						);
					}

					//https://uvo1je0v1xszoaesyia.env.cloudshare.com/vedadmin/documentation/help/Content/SDK/WebSDK/r-SDK-DELETE-Certificates-Guid.htm?tocpath=Topics%20by%20Guide%7CDeveloper%27s%20Guide%7CWeb%20SDK%20reference%7CCertificates%20programming%20interface%7C_____9
					if (operation === 'delete') {
						const certificateId = this.getNodeParameter('certificateId', i) as string;

						responseData = await venafiApiRequest.call(
							this,
							'DELETE',
							`/vedsdk/Certificates/${certificateId}`,
							{},
							qs,
						);
					}

					if (operation === 'download') {
						const certificateDn = this.getNodeParameter('certificateDn', i) as string;
						const password = this.getNodeParameter('password', i) as string;
						const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						//\\VED\\Policy\\Venafi Operational Certificates\\tpp.venafidemo.com

						const body = {
							CertificateDN: certificateDn,
							Format: 'Base64',
							Password: password,
							IncludePrivateKey: true,
							IncludeChain: true,
						};

						Object.assign(body, additionalFields);

						responseData = await venafiApiRequest.call(
							this,
							'POST',
							`/vedsdk/Certificates/Retrieve`,
							body,
						);

						const binaryData = await this.helpers.prepareBinaryData(Buffer.from(responseData.CertificateData, 'base64'), responseData.Filename);

						responseData = {
							json: {},
							binary: {
								[binaryProperty]: binaryData,
							},
						};
					}

					//https://uvo1je0v1xszoaesyia.env.cloudshare.com/vedadmin/documentation/help/Content/SDK/WebSDK/r-SDK-GET-Certificates-guid.htm?tocpath=Topics%20by%20Guide%7CDeveloper%27s%20Guide%7CWeb%20SDK%20reference%7CCertificates%20programming%20interface%7C_____10
					if (operation === 'get') {
						const certificateId = this.getNodeParameter('certificateId', i) as string;

						responseData = await venafiApiRequest.call(
							this,
							'GET',
							`/vedsdk/Certificates/${certificateId}`,
							{},
							qs,
						);
					}

					//https://uvo1je0v1xszoaesyia.env.cloudshare.com/vedadmin/documentation/help/Content/SDK/WebSDK/r-SDK-GET-Certificates.htm?tocpath=Topics%20by%20Guide%7CDeveloper%27s%20Guide%7CWeb%20SDK%20reference%7CCertificates%20programming%20interface%7C_____4
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const options = this.getNodeParameter('options', i) as IDataObject;

						if (options.fields) {
							qs.OptionalFields = (options.fields as string[]).join(',');
						}

						if (returnAll) {

							responseData = await venafiApiRequestAllItems.call(
								this,
								'Certificates',
								'GET',
								`/vedsdk/Certificates`,
								{},
								qs,
							);

						} else {
							qs.Limit = this.getNodeParameter('limit', i) as number;
							responseData = await venafiApiRequest.call(
								this,
								'GET',
								`/vedsdk/Certificates`,
								{},
								qs,
							);

							responseData = responseData.Certificates;
						}
					}

					//https://uvo1je0v1xszoaesyia.env.cloudshare.com/vedadmin/documentation/help/Content/SDK/WebSDK/r-SDK-POST-Certificates-renew.htm?tocpath=Topics%20by%20Guide%7CDeveloper%27s%20Guide%7CWeb%20SDK%20reference%7CCertificates%20programming%20interface%7C_____16
					if (operation === 'renew') {
						const certificateDN = this.getNodeParameter('certificateDN', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							CertificateDN: certificateDN,
						};

						Object.assign(body, additionalFields);

						responseData = await venafiApiRequest.call(
							this,
							'POST',
							`/vedsdk/Certificates/Renew`,
							{},
							qs,
						);
					}
				}

				if (resource === 'policy') {
					//https://uvo1je0v1xszoaesyia.env.cloudshare.com/vedadmin/documentation/help/Content/SDK/WebSDK/r-SDK-POST-Certificates-CheckPolicy.htm
					if (operation === 'get') {
						const policy = this.getNodeParameter('policyDn', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							PolicyDN: policy,
						};

						Object.assign(body, additionalFields);

						responseData = await venafiApiRequest.call(
							this,
							'POST',
							`/vedsdk/Certificates/CheckPolicy`,
							body,
							qs,
						);
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		if (operation === 'download') {
			return this.prepareOutputData(returnData as unknown as INodeExecutionData[]);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
